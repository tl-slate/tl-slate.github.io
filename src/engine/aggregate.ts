import type { SimState, Talent, TalentDB } from '../types'
import { COPIER_KEYS, computeCopies } from './copy'
import type { CopiedLine } from './copy'
import { computeInfections, isInfection } from './infection'
import type { InfectedLine } from './infection'
import { judgmentBoosts } from './judgment'

export interface NumericStat {
  key: string
  descriptor: string
  unit: string
  total: number
  count: number
  /** 심판(명왕) ×1.7 보정을 받은 기여 줄 수 */
  boosted: number
}

export interface NamedEffect {
  name: string
  effect: string
  count: number
}

export interface AggregateResult {
  /** 원본(석판에 직접 박힌) 재능만의 합산 — 복제분은 미포함 */
  numeric: NumericStat[]
  /** 핵심 재능(맨 위 별도 섹션) */
  core: NamedEffect[]
  /** 수치 스탯이 없는 비핵심 재능 — 합산 목록에 텍스트로 같이 나열 */
  textual: NamedEffect[]
  totalTalents: number
  /** 복제 효과: 줄 목록 + 복제분만의 별도 합산(수치 없는 복제 재능은 텍스트로 나열) */
  copied: CopiedLine[]
  copiedNumeric: NumericStat[]
  copiedTextual: NamedEffect[]
  /** 보드에 복제 석판(나방/들불/균열/별들의 고향)이 하나라도 있는가 — 섹션 상시 표시용 */
  hasCopiers: boolean
  /** 인펙션 투영: 줄 목록(factor = 투영 계수 × 대상 석판의 심판 보정) + 투영분만의 별도 합산 */
  infected: InfectedLine[]
  infectedNumeric: NumericStat[]
  infectedTextual: NamedEffect[]
  /** 보드에 인펙션 석판이 있는가 — 섹션 상시 표시용 */
  hasInfection: boolean
  slates: number
  cells: number
}

function buildTalentIndex(db: TalentDB): Map<string, Talent> {
  const idx = new Map<string, Talent>()
  for (const god of db.gods) for (const t of db.talents[god] ?? []) idx.set(t.id, t)
  return idx
}

/**
 * 수치 스탯 합산. factor 적용값은 반올림해 정수로 만든다(심판 ×1.7 / 인펙션 ×0.2 공통).
 * markBoost=true면 factor≠1인 줄을 심판 보정 줄로 세어 "명왕 적용" 칩을 띄운다
 * (인펙션 합산은 전 줄이 계수 적용이라 칩이 무의미 — false로 끈다).
 */
function addNumeric(map: Map<string, NumericStat>, t: Talent, factor: number, markBoost = true) {
  for (const s of t.stats) {
    const value = factor === 1 ? s.value : Math.round(s.value * factor)
    const key = `${s.unit}||${s.descriptor}`
    const boost = markBoost && factor !== 1 ? 1 : 0
    const cur = map.get(key)
    if (cur) {
      cur.total += value
      cur.count++
      cur.boosted += boost
    } else {
      map.set(key, { key, descriptor: s.descriptor, unit: s.unit, total: value, count: 1, boosted: boost })
    }
  }
}

const sortNumeric = (m: Map<string, NumericStat>): NumericStat[] =>
  [...m.values()].sort((a, b) => a.unit.localeCompare(b.unit) || Math.abs(b.total) - Math.abs(a.total))

export function aggregate(state: SimState, db: TalentDB): AggregateResult {
  const idx = buildTalentIndex(db)

  // 심판 활성화 시 연결선 상 석판의 수치 스탯 ×1.7 (석판 단위)
  const boosts = judgmentBoosts(state)

  const numericMap = new Map<string, NumericStat>()
  const coreMap = new Map<string, NamedEffect>()
  const textMap = new Map<string, NamedEffect>()
  let totalTalents = 0

  const addNamed = (map: Map<string, NamedEffect>, t: Talent) => {
    const key = `${t.name}::${t.effect}`
    const cur = map.get(key)
    if (cur) cur.count++
    else map.set(key, { name: t.name, effect: t.effect, count: 1 })
  }

  // 원본 재능만 본 합산에 넣는다 (복제분은 아래 별도 합산 — 사용자 요청)
  for (const p of state.placements) {
    const factor = boosts.get(p.id) ?? 1
    for (const tid of p.talents) {
      const t = tid ? idx.get(tid) : undefined
      if (!t) continue
      totalTalents++
      if (t.tier === '핵심') addNamed(coreMap, t)
      else if (t.stats.length) addNumeric(numericMap, t, factor)
      else addNamed(textMap, t) // 수치 없는 비핵심(레전드 중위 등)도 합산 목록에 같이 나열
    }
  }

  // 복제 효과: 복제된 줄은 복제한(copier) 석판 기준으로 심판 보정을 받는다
  const copied = computeCopies(state, idx)
  const copiedNumericMap = new Map<string, NumericStat>()
  const copiedTextMap = new Map<string, NamedEffect>()
  for (const c of copied) {
    const factor = boosts.get(c.copierId) ?? 1
    if (c.talent.tier !== '핵심' && c.talent.stats.length) addNumeric(copiedNumericMap, c.talent, factor)
    else addNamed(copiedTextMap, c.talent) // 수치 없는 복제 재능(0.5% 텍스트형 등)도 복제 합산에 나열
  }

  // 인펙션 투영: 낙인 재능 × 인접 석판마다 한 줄. 수치는 계수(0.2×강화) 적용 후 반올림 정수.
  // 투영받은 줄은 투영 대상(target) 석판의 옵션이 되므로 그 석판의 심판 보정도 함께 받는다(복제와 동일 원칙).
  // 단 명왕 석판은 캐릭터당 1개라 심판과 인펙션이 동시에 놓일 일은 실전에 없다(사용자 확정) —
  // 보드에 둘 다 올려본 경우에만 타는 경로다.
  const infected = computeInfections(state, idx).map((l) => {
    const jf = boosts.get(l.targetId) ?? 1
    return jf === 1 ? l : { ...l, factor: l.factor * jf }
  })
  const infectedNumericMap = new Map<string, NumericStat>()
  const infectedTextMap = new Map<string, NamedEffect>()
  for (const l of infected) {
    if (l.talent.stats.length) addNumeric(infectedNumericMap, l.talent, l.factor, false)
    else addNamed(infectedTextMap, l.talent)
  }

  const sortNamed = (m: Map<string, NamedEffect>): NamedEffect[] =>
    [...m.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'ko'))

  const cells = state.placements.reduce((a, p) => a + p.shape.length, 0)

  return {
    numeric: sortNumeric(numericMap),
    core: sortNamed(coreMap),
    textual: sortNamed(textMap),
    totalTalents,
    copied,
    copiedNumeric: sortNumeric(copiedNumericMap),
    copiedTextual: sortNamed(copiedTextMap),
    hasCopiers: state.placements.some((p) => p.key != null && COPIER_KEYS.has(p.key)),
    infected,
    infectedNumeric: sortNumeric(infectedNumericMap),
    infectedTextual: sortNamed(infectedTextMap),
    hasInfection: state.placements.some(isInfection),
    slates: state.placements.length,
    cells,
  }
}
