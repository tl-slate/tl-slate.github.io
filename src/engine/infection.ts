import type { Placement, SimState, Talent } from '../types'
import { absoluteCells, cellKey } from './geometry'

/**
 * 명왕의 신격: 인펙션 — "이 석판에 새겨진 낙인 재능을 직접 인접한 모든 석판에
 * 20% 강도로 투영한다"(tlidb Nether_Kings_Divinity, 사용자 확인).
 *
 * - 활성화 조건: 인펙션 석판의 슬롯(고정 1 + 낙인 3)이 모두 채워짐.
 * - 투영 대상 = 낙인(kind 'brand') 슬롯의 재능만. 고정 슬롯의 명왕 재능은 투영되지 않는다.
 * - "신격 유효 한도: 1"(divLimit) 재능은 투영해도 중복이라 효과가 없으므로 제외한다
 *   (복제 효과와 같은 원칙 — 사용자 확정).
 * - 기본 계수 0.2(80% 감소). 고정 슬롯에 "인펙션 효과 활성화 시, 모든 X에 대해 투영 효과 +N%"
 *   절대자 재능이 박히면 해당 대상 석판에 한해 계수 ×(1+N/100).
 *   (대상 X: 신격의 석판=전부 / 비레전드 신격의 석판 / 신의 계보 / 추락하는 별빛 / 신성의 일각.
 *    "새로운 신의 조각상에 빈 슬롯" 조건부 재능은 보드 밖 조건이라 반영하지 않는다 — 문구가
 *    "활성화 시,"가 아니라 "활성화 및"이어서 아래 정규식에 걸리지 않는다.)
 * - 투영 수치는 원본×계수 후 반올림 정수(사용자 확인 — 심판과 동일 규칙, aggregate에서 처리).
 * - 투영된 줄은 다시 복제/투영되지 않는다.
 */

export const INFECTION_FACTOR = 0.2

export interface InfectedLine {
  sourceId: string
  sourceName: string
  targetId: string
  targetName: string
  talent: Talent
  /** 투영 계수(0.2 × 투영 강화). aggregate는 여기에 대상 석판의 심판 보정까지 곱해 최종 계수로 쓴다 */
  factor: number
}

export const isInfection = (p: Placement) => p.key === 'nk-contam'

/** 인펙션 활성화 여부: 슬롯이 있고 전부 채워짐 */
export const infectionActive = (p: Placement) =>
  isInfection(p) && p.slots.length > 0 && p.talents.every((t) => t != null)

const BONUS_RE = /인펙션 효과 활성화 시,\s*모든\s*(신격의 석판|비레전드 신격의 석판|신의 계보|추락하는 별빛|신성의 일각)에 대해 투영 효과\s*\+\s*(\d+(?:\.\d+)?)\s*%/

/** 투영 강화 대상 → 대상 석판 판정 */
const BONUS_TARGET: Record<string, (p: Placement) => boolean> = {
  '신격의 석판': () => true,
  '비레전드 신격의 석판': (p) => p.category !== '레전드',
  '신의 계보': (p) => p.key === 'l-pedigree',
  '추락하는 별빛': (p) => p.key === 'l-starlight',
  '신성의 일각': (p) => p.key === 'l-corner',
}

/** 인펙션 석판 자신에 박힌 투영 강화 재능들(고정 슬롯 절대자, [유일]이라 실질 1개) */
function bonusRules(p: Placement, idx: Map<string, Talent>): { match: (t: Placement) => boolean; mult: number }[] {
  const rules: { match: (t: Placement) => boolean; mult: number }[] = []
  for (const tid of p.talents) {
    const t = tid ? idx.get(tid) : undefined
    if (!t || t.god !== 'Nether King') continue
    const m = t.effect.match(BONUS_RE)
    if (!m) continue
    // 정규식 그룹이 BONUS_TARGET 키 5종만 매칭하므로 조회는 항상 성공한다
    rules.push({ match: BONUS_TARGET[m[1]], mult: 1 + Number(m[2]) / 100 })
  }
  return rules
}

export function computeInfections(state: SimState, idx: Map<string, Talent>): InfectedLine[] {
  const actives = state.placements.filter(infectionActive)
  if (actives.length === 0) return []

  const owner = new Map<string, string>()
  for (const p of state.placements) for (const c of absoluteCells(p)) owner.set(cellKey(c.x, c.y), p.id)
  const byId = new Map(state.placements.map((p) => [p.id, p]))

  const out: InfectedLine[] = []
  for (const inf of actives) {
    const own = new Set(absoluteCells(inf).map((c) => cellKey(c.x, c.y)))
    const targetIds = new Set<string>()
    for (const c of absoluteCells(inf)) {
      for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0]] as const) {
        const k = cellKey(c.x + dx, c.y + dy)
        if (own.has(k)) continue
        const id = owner.get(k)
        if (id && id !== inf.id) targetIds.add(id)
      }
    }
    if (targetIds.size === 0) continue

    const brands: Talent[] = []
    inf.slots.forEach((s, i) => {
      const tid = s.kind === 'brand' ? inf.talents[i] : null
      const t = tid ? idx.get(tid) : undefined
      if (t && t.divLimit !== 1) brands.push(t)
    })
    if (brands.length === 0) continue

    const rules = bonusRules(inf, idx)
    for (const id of targetIds) {
      const target = byId.get(id)
      if (!target) continue
      let factor = INFECTION_FACTOR
      for (const r of rules) if (r.match(target)) factor *= r.mult
      for (const t of brands)
        out.push({ sourceId: inf.id, sourceName: inf.name, targetId: id, targetName: target.name, talent: t, factor })
    }
  }
  return out
}
