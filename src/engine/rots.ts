import type { Rot } from '../types'
import { SHAPE_LIBRARY } from '../data/slates'

/**
 * 석판별로 놓을 수 있는 방향(회전) 제한.
 * 인펙션은 세워서만 놓이므로 rots [0, 2]다(눕히는 rot 1·3 불가 — 사용자 확인).
 * 제한이 없는 석판은 4방향 전부 허용한다.
 */

const ROTS_BY_KEY = new Map(SHAPE_LIBRARY.filter((t) => t.rots).map((t) => [t.key, t.rots!]))

export const ALL_ROTS: Rot[] = [0, 1, 2, 3]

/** 이 석판이 놓일 수 있는 방향 목록 */
export const allowedRots = (key?: string): Rot[] => (key ? ROTS_BY_KEY.get(key) ?? ALL_ROTS : ALL_ROTS)

/** 허용 방향 중 rot 다음 것(R 키 회전). 허용 방향이 하나뿐이면 그대로 둔다 */
export function nextRot(key: string | undefined, rot: Rot): Rot {
  const allowed = allowedRots(key)
  if (allowed.length <= 1) return allowed[0] ?? rot
  const i = allowed.indexOf(rot)
  // 현재 방향이 목록에 없으면(정의가 바뀐 경우) 첫 허용 방향으로 되돌린다
  return i === -1 ? allowed[0] : allowed[(i + 1) % allowed.length]
}

/** 저장분 교정용 — 허용되지 않는 방향이면 첫 허용 방향으로 */
export const clampRot = (key: string | undefined, rot: Rot): Rot => {
  const allowed = allowedRots(key)
  return allowed.includes(rot) ? rot : allowed[0]
}
