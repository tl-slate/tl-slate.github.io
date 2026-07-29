import type { SimState, SlateType } from '../types'
import { SHAPE_LIBRARY } from '../data/slates'

/**
 * 석판 종류별 보드 내 최대 개수(사용자 확정 + tlidb 석판별 전용 페이지 표기로 교차 확인):
 * 명왕 3종 통틀어 1 / 빛이 된 나방 3 / 들불 번지는 순간 1 / 추락하는 별빛 3 / 신성의 일각 3 / 신의 계보 1.
 * 우주의 균열·별들의 고향은 tlidb 한/영 양쪽 다 표기가 없어 한도 미지정(무제한)으로 둔다.
 * 일반(신) 석판도 한도 없음.
 *
 * 한도는 SlateType.limit에 적혀 있고, limitGroup이 있으면 그 그룹 석판들의 배치 수를 합쳐서 센다.
 * 배치 자체를 막는 강제 규칙이라 store.placeAt에서 차단하고 팔레트에서도 미리 비활성 표시한다.
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

/** 이 석판을 한 개 더 놓아도 되는가 */
export const canPlaceMore = (state: SimState, type: SlateType): boolean => limitInfo(state, type).canPlace

/**
 * key만으로 한도를 확인한다(store.placeAt 차단용).
 * 드래그 중인 석판은 limit 필드 없이 key만 들고 다니므로 정의에서 다시 찾아 판정한다.
 * key가 없거나 모르는 석판이면 한도 없음으로 본다.
 */
export function canPlaceKey(state: SimState, key?: string): boolean {
  if (!key) return true
  const t = TYPE_BY_KEY.get(key)
  return t ? canPlaceMore(state, t) : true
}

/**
 * 불러온 보드가 한도를 넘는지 검사해 초과 석판 이름을 돌려준다.
 * 불러오기는 막지 않고(남의 세팅 코드를 열어보는 건 허용) 경고만 띄운다.
 */
export function overLimitNames(state: SimState): string[] {
  const counts = new Map<string, number>()
  for (const p of state.placements) {
    if (!p.key) continue
    const t = TYPE_BY_KEY.get(p.key)
    if (!t?.limit) continue
    const g = groupKey(t)
    counts.set(g, (counts.get(g) ?? 0) + 1)
  }
  const out: string[] = []
  for (const [g, n] of counts) {
    const t = SHAPE_LIBRARY.find((x) => groupKey(x) === g && x.limit != null)
    if (t && n > t.limit!) out.push(`${t.limitGroup ? '명왕 석판' : t.name} ${n}/${t.limit}`)
  }
  return out
}
