import type { CopyDir, Placement, SimState, Talent } from '../types'
import { absoluteCells, cellKey } from './geometry'

/**
 * 레전드 석판 복제 효과 계산.
 *
 * 규칙(tlidb 원문 + 사용자 확인):
 * - "마지막 재능 한 줄" = 슬롯 순서상 제일 아래에 있는 **채워진** 재능.
 *   (재능이 2개면 2번째, 3개면 3번째 — 빈 슬롯은 줄로 치지 않는다)
 * - 복사 불가 = 핵심 재능 + "신격 유효 한도: 1"이 옵션에 적힌 재능(divLimit, 재능 개별 속성).
 *   등급 기준이 아니다 — 레전드 중위라도 한도 표기가 없으면 복사된다(사용자 확인).
 *   마지막 줄이 복사 불가 재능이면 아무것도 복제되지 않는다(윗줄로 대체하지 않음).
 * - 우주의 균열은 좌/우 변에 닿은 석판 전부에서 중위·레전드중위·절대자 명왕 재능을 복제한다.
 *   단 "신격 유효 한도: 1" 재능은 복사해도 효과가 없으므로 복제하지 않는다(사용자 확인).
 * - 복제된 재능은 다시 복제되지 않는다(연쇄 없음 — 원본 슬롯의 재능만 소스).
 * - 방향(위/아래/왼쪽/오른쪽)은 보드 기준이며 석판 회전과 무관.
 */

export interface CopiedLine {
  copierId: string
  copierName: string
  sourceId: string
  sourceName: string
  talent: Talent
}

const DIRS: Record<CopyDir, { dx: number; dy: number }> = {
  up: { dx: 0, dy: -1 },
  down: { dx: 0, dy: 1 },
  left: { dx: -1, dy: 0 },
  right: { dx: 1, dy: 0 },
}

export const COPY_DIR_LABEL: Record<CopyDir, string> = {
  up: '위쪽',
  down: '아래쪽',
  left: '왼쪽',
  right: '오른쪽',
}

/** 이 석판이 복제 효과를 가진 레전드 석판인가 */
export const COPIER_KEYS = new Set(['l-moth', 'l-prairie', 'l-rift', 'l-stars'])

function cellOwners(state: SimState): Map<string, string> {
  const owner = new Map<string, string>()
  for (const p of state.placements) for (const c of absoluteCells(p)) owner.set(cellKey(c.x, c.y), p.id)
  return owner
}

/** p 기준 dirs 방향으로 한 칸 붙어 있는 다른 석판들의 id */
function neighborIds(p: Placement, dirs: CopyDir[], owner: Map<string, string>): Set<string> {
  const own = new Set(absoluteCells(p).map((c) => cellKey(c.x, c.y)))
  const out = new Set<string>()
  for (const c of absoluteCells(p)) {
    for (const d of dirs) {
      const { dx, dy } = DIRS[d]
      const k = cellKey(c.x + dx, c.y + dy)
      if (own.has(k)) continue
      const id = owner.get(k)
      if (id && id !== p.id) out.add(id)
    }
  }
  return out
}

/** 마지막(제일 아래) 채워진 재능. 없으면 null */
function lastTalent(p: Placement, idx: Map<string, Talent>): Talent | null {
  for (let i = p.talents.length - 1; i >= 0; i--) {
    const tid = p.talents[i]
    if (tid) return idx.get(tid) ?? null
  }
  return null
}

/** 마지막 줄 복사 가능 여부: 핵심 불가 + "신격 유효 한도: 1" 표기 재능 불가 (등급 무관) */
const canCopyLastLine = (t: Talent) => t.tier !== '핵심' && t.divLimit !== 1

/** 우주의 균열이 복제하는 재능: 중위 / 레전드중위 / 절대자 명왕 재능 (신격 유효 한도 1 재능 제외) */
const riftCopies = (t: Talent) =>
  t.divLimit !== 1 &&
  (t.tier === '중위' || t.tier === '레전드중위' || (t.god === 'Nether King' && t.tier === '핵심'))

export function computeCopies(state: SimState, idx: Map<string, Talent>): CopiedLine[] {
  const copiers = state.placements.filter((p) => p.key && COPIER_KEYS.has(p.key))
  if (copiers.length === 0) return []

  const owner = cellOwners(state)
  const byId = new Map(state.placements.map((p) => [p.id, p]))
  const out: CopiedLine[] = []

  const push = (copier: Placement, source: Placement, talent: Talent) =>
    out.push({ copierId: copier.id, copierName: copier.name, sourceId: source.id, sourceName: source.name, talent })

  for (const p of copiers) {
    if (p.key === 'l-moth' || p.key === 'l-prairie') {
      // 마지막 재능 한 줄 복제. 나방은 선택한 한 방향, 들불은 4방향 전부.
      const dirs: CopyDir[] = p.key === 'l-prairie' ? ['up', 'down', 'left', 'right'] : p.copyDir ? [p.copyDir] : []
      for (const id of neighborIds(p, dirs, owner)) {
        const src = byId.get(id)
        if (!src) continue
        const t = lastTalent(src, idx)
        if (t && canCopyLastLine(t)) push(p, src, t)
      }
    } else if (p.key === 'l-rift') {
      // 왼쪽/오른쪽이 각각 별도 옵션 줄 → 양쪽 모두 적용
      for (const side of ['left', 'right'] as CopyDir[]) {
        for (const id of neighborIds(p, [side], owner)) {
          const src = byId.get(id)
          if (!src) continue
          for (const tid of src.talents) {
            const t = tid ? idx.get(tid) : undefined
            if (t && riftCopies(t)) push(p, src, t)
          }
        }
      }
    } else if (p.key === 'l-stars') {
      // 인접 석판의 중위 재능만(레전드중위 제외)
      for (const id of neighborIds(p, ['up', 'down', 'left', 'right'], owner)) {
        const src = byId.get(id)
        if (!src) continue
        for (const tid of src.talents) {
          const t = tid ? idx.get(tid) : undefined
          if (t && t.tier === '중위' && t.divLimit !== 1) push(p, src, t)
        }
      }
    }
  }
  return out
}
