import type { Cell, Placement, Rot, SimState } from '../types'
import { absoluteCells, cellKey } from './geometry'

/**
 * 명왕의 신격: 심판 — "신격 조각 사이 연결선 상의 신격의 석판은 옵션 효과 계수 +70%".
 *
 * - 활성화 조건: 심판 석판의 슬롯(고정 1 + 낙인 3)이 모두 채워짐.
 * - 연결선 = ㄱ자 두 변을 따라 조각 사이의 빈 칸 4개(대각선 변은 연결선 아님 — 가정).
 * - 연결선 칸을 하나라도 점유한 다른 석판의 수치 스탯에 ×1.7을 적용하고 반올림해
 *   정수로 만든다(사용자 확인: 보정된 수치는 반올림되어 정수로 표현됨).
 * - 보정 대상은 핵심 재능만 제외하고 전부(사용자 확인 — 레전드 석판도 포함).
 *   핵심 재능은 명명 효과(텍스트)로 집계되므로 aggregate의 numeric 분기에서 자연히 제외된다.
 */

export const JUDGMENT_FACTOR = 1.7

// shape c([0,0],[3,0],[3,3]) 기준 연결선 로컬 좌표
const JUDGMENT_LINKS: Cell[] = [
  { x: 1, y: 0 },
  { x: 2, y: 0 },
  { x: 3, y: 1 },
  { x: 3, y: 2 },
]

/** 셀들을 shape와 함께 회전시킨다 — normalize 오프셋은 shape 기준(anchor가 shape에서 나오므로). */
function rotateLinksWithShape(shape: Cell[], links: Cell[], rot: Rot): Cell[] {
  let s = shape
  let e = links
  for (let i = 0; i < rot; i++) {
    const rs = s.map((c) => ({ x: -c.y, y: c.x }))
    const re = e.map((c) => ({ x: -c.y, y: c.x }))
    let minX = Infinity
    let minY = Infinity
    for (const c of rs) {
      if (c.x < minX) minX = c.x
      if (c.y < minY) minY = c.y
    }
    s = rs.map((c) => ({ x: c.x - minX, y: c.y - minY }))
    e = re.map((c) => ({ x: c.x - minX, y: c.y - minY }))
  }
  return e
}

export const isJudgment = (p: Placement) => p.key === 'nk-judgment'

/** 심판 활성화 여부: 슬롯이 있고 전부 채워짐 */
export const judgmentActive = (p: Placement) => isJudgment(p) && p.slots.length > 0 && p.talents.every((t) => t != null)

/** 활성화된 심판의 연결선 절대 칸들 */
export function judgmentLinkCells(p: Placement): Cell[] {
  return rotateLinksWithShape(p.shape, JUDGMENT_LINKS, p.rot).map((c) => ({ x: c.x + p.x, y: c.y + p.y }))
}

/**
 * 석판 id → 옵션 효과 계수. 활성화된 심판의 연결선 칸을 점유한 석판(심판 자신 제외)은 1.7.
 * 게임상 명왕 석판은 캐릭터당 1개라 중첩은 고려하지 않는다(어느 연결선에든 걸리면 1.7).
 */
export function judgmentBoosts(state: SimState): Map<string, number> {
  const out = new Map<string, number>()
  const actives = state.placements.filter(judgmentActive)
  if (actives.length === 0) return out

  const linkKeys = new Set<string>()
  for (const j of actives) for (const c of judgmentLinkCells(j)) linkKeys.add(cellKey(c.x, c.y))

  for (const p of state.placements) {
    if (isJudgment(p)) continue
    if (absoluteCells(p).some((c) => linkKeys.has(cellKey(c.x, c.y)))) out.set(p.id, JUDGMENT_FACTOR)
  }
  return out
}
