import type { SimState, SlateType } from '../types'
import { SHAPE_LIBRARY } from '../data/slates'

/**
 * 석판 종류별 보드 내 최대 개수(사용자 확정 + tlidb 석판별 전용 페이지 표기로 교차 확인):
 * 명왕 3종 통틀어 1 / 빛이 된 나방 3 / 들불 번지는 순간 1 / 추락하는 별빛 3 / 신성의 일각 3 / 신의 계보 1.
 * 우주의 균열·별들의 고향은 tlidb 한/영 양쪽 다 표기가 없어 한도 미지정(무제한)으로 둔다.
 * 일반(신) 석판도 한도 없음.
 *
 * 한도는 SlateType.limit에 적혀 있고, limitGroup이 있으면 그 그룹 석판들의 배치 수를 합쳐서 센다
 * (같은 그룹의 limit 값은 동일하다고 본다 — 현재 명왕 3종이 전부 1).
 *
 * **배치는 막지 않는다**(사용자 결정). 겹침·범위밖과 같은 방식으로, 한도를 넘긴 석판은
 * 보드에 빨갛게 표시하고 집계에서 빼서 "제한 초과 미적용"으로 보여준다.
 * 초과로 판정되는 것은 **늦게 놓은 쪽**이다(placements 배열 순서 = 배치 순서, 겹침 판정과 동일 규칙).
 */

const TYPE_BY_KEY = new Map(SHAPE_LIBRARY.map((t) => [t.key, t]))

/** 한도를 공유하는 묶음 키. limitGroup이 없으면 자기 자신(key) */
const groupKey = (t: Pick<SlateType, 'key' | 'limitGroup'>) => t.limitGroup ?? t.key

/** 이 석판(과 한도를 공유하는 석판들)이 보드에 몇 개 놓여 있는가 */
export function placedCount(state: SimState, type: Pick<SlateType, 'key' | 'limitGroup'>): number {
  const g = groupKey(type)
  let n = 0
  for (const p of state.placements) {
    if (!p.key) continue
    const t = TYPE_BY_KEY.get(p.key)
    if (t && groupKey(t) === g) n++
  }
  return n
}

export interface LimitInfo {
  /** 최대 개수. 한도가 없으면 null */
  limit: number | null
  /** 현재 배치 수(한도를 공유하는 석판 합산) */
  placed: number
  /** 더 놓을 수 있는가 */
  canPlace: boolean
  /** 한도를 다른 석판과 공유하는가(명왕 3종처럼) */
  shared: boolean
}

export function limitInfo(state: SimState, type: SlateType): LimitInfo {
  const limit = type.limit ?? null
  const placed = placedCount(state, type)
  return { limit, placed, canPlace: limit == null || placed < limit, shared: type.limitGroup != null }
}

/** 이 석판을 한 개 더 놓아도 한도 안인가 (팔레트 안내용 — 배치를 막지는 않는다) */
export const canPlaceMore = (state: SimState, type: SlateType): boolean => limitInfo(state, type).canPlace

/**
 * 한도를 넘겨 **효과가 적용되지 않는** 석판 id들.
 * 앞에서부터 한도만큼만 유효하고 그 뒤(늦게 놓은 것)가 초과다.
 * 집계·복제·투영 계산에서 통째로 빠지고, 보드에는 빨갛게 표시된다.
 */
export function overLimitIds(state: SimState): Set<string> {
  const seen = new Map<string, number>()
  const out = new Set<string>()
  for (const p of state.placements) {
    if (!p.key) continue
    const t = TYPE_BY_KEY.get(p.key)
    if (t?.limit == null) continue
    const g = groupKey(t)
    const n = (seen.get(g) ?? 0) + 1
    seen.set(g, n)
    if (n > t.limit) out.add(p.id)
  }
  return out
}

/** 초과 석판 하나에 대한 안내 문구 (예: "들불 번지는 순간은 1개까지 적용됩니다") */
export function overLimitReason(state: SimState, id: string): string | null {
  const p = state.placements.find((x) => x.id === id)
  if (!p?.key) return null
  const t = TYPE_BY_KEY.get(p.key)
  if (t?.limit == null) return null
  return t.limitGroup
    ? `명왕 석판은 3종 통틀어 ${t.limit}개까지 적용됩니다`
    : `${t.name} — 최대 ${t.limit}개까지 적용됩니다`
}

/** 한도를 넘은 묶음 요약 (예: ["들불 번지는 순간 2/1"]) */
export function overLimitNames(state: SimState): string[] {
  const counts = new Map<string, number>()
  for (const p of state.placements) {
    if (!p.key) continue
    const t = TYPE_BY_KEY.get(p.key)
    if (t?.limit == null) continue
    const g = groupKey(t)
    counts.set(g, (counts.get(g) ?? 0) + 1)
  }
  const out: string[] = []
  for (const [g, n] of counts) {
    const t = SHAPE_LIBRARY.find((x) => groupKey(x) === g && x.limit != null)
    if (t?.limit != null && n > t.limit) out.push(`${t.limitGroup ? '명왕 석판' : t.name} ${n}/${t.limit}`)
  }
  return out
}
