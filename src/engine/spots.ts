import type { Cell, Placement, Rot, SimState } from '../types'
import { SHAPE_LIBRARY } from '../data/slates'
import { absoluteCells, cellKey, orientedShape } from './geometry'

/**
 * 명왕 석판은 보드의 정해진 자리에만 들어간다(사용자 확인).
 * - 추방: 육각 보드의 잘린 네 귀퉁이(모서리) 빗변에 딱 맞는 4자리
 * - 심판: 네 "가운데 모서리" 칸 (3,3)·(6,3)·(3,6)·(6,6) 중 셋을 찍는 4자리
 * - 인펙션: 자리 제한은 없고 방향만 세로 고정(engine/rots.ts)
 *
 * 자리를 벗어나면 배치는 되지만(겹침·개수 초과와 같은 정책) 빨갛게 표시되고 계산에서 빠진다.
 * 비교는 회전값이 아니라 **점유 칸 집합**으로 한다 — 대각선·세로처럼 180° 대칭인 형태는
 * 서로 다른 rot이 같은 칸을 덮어서, rot만 보면 같은 자리인데도 틀렸다고 잡힌다.
 */

const key = (cells: Cell[]) =>
  cells
    .map((c) => cellKey(c.x, c.y))
    .sort()
    .join(' ')

const spotCells = (shape: Cell[], s: { x: number; y: number; rot: Rot }) =>
  key(orientedShape(shape, s.rot).map((c) => ({ x: c.x + s.x, y: c.y + s.y })))

/** 석판 key → 허용 자리들의 칸 집합 */
const SPOTS_BY_KEY = new Map(
  SHAPE_LIBRARY.filter((t) => t.spots?.length).map((t) => [t.key, new Set(t.spots!.map((s) => spotCells(t.shape, s)))]),
)

/** 자리 제한이 있는 석판인가 */
export const hasSpotLimit = (key?: string) => (key ? SPOTS_BY_KEY.has(key) : false)

/** 정해진 자리에 놓였는가. 자리 제한이 없는 석판은 항상 true */
export function isOnSpot(p: Placement): boolean {
  if (!p.key) return true
  const spots = SPOTS_BY_KEY.get(p.key)
  return spots ? spots.has(key(absoluteCells(p))) : true
}

/** 정해진 자리를 벗어난 석판 id들 — 빨간 표시 + 계산 제외 대상 */
export function offSpotIds(state: SimState): Set<string> {
  const out = new Set<string>()
  for (const p of state.placements) if (!isOnSpot(p)) out.add(p.id)
  return out
}

/** 드래그 중 미리보기용 — 이 위치/회전이 정해진 자리인가 */
export function isSpotFor(slateKey: string | undefined, shape: Cell[], x: number, y: number, rot: Rot): boolean {
  if (!slateKey) return true
  const spots = SPOTS_BY_KEY.get(slateKey)
  return spots ? spots.has(spotCells(shape, { x, y, rot })) : true
}

/** 안내 문구 */
export const spotReason = (slateKey?: string): string | null =>
  slateKey === 'nk-banish'
    ? '추방은 보드의 네 모서리에만 놓입니다'
    : slateKey === 'nk-judgment'
      ? '심판은 네 가운데 모서리를 잇는 자리에만 놓입니다'
      : null
