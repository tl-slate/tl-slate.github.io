import { SHAPE_LIBRARY } from '../data/slates'
import type { SimState } from '../types'

const BY_KEY = new Map(SHAPE_LIBRARY.map((s) => [s.key, s]))
const BY_NAME = new Map(SHAPE_LIBRARY.map((s) => [s.name, s]))

/**
 * 배치된 석판은 모양·슬롯을 자기 안에 복사해 들고 저장된다(회전/공유 때문).
 * 그래서 slates.ts 정의를 고쳐도 이미 저장된 배치엔 옛 슬롯이 남아, 새로고침하면
 * 수정 전으로 돌아간 것처럼 보인다. 불러오는 모든 경로에서 최신 정의로 다시 맞춘다.
 * (key 가 없는 예전 저장본은 이름으로 찾는다)
 */
export function rehydrate(state: SimState): SimState {
  return {
    ...state,
    placements: state.placements.map((p) => {
      const def = (p.key ? BY_KEY.get(p.key) : undefined) ?? BY_NAME.get(p.name)
      if (!def) return p
      return {
        ...p,
        key: def.key,
        name: def.name,
        category: def.category,
        shape: def.shape,
        slots: def.slots,
        note: def.note,
        // 슬롯 수가 바뀌었으면 재능 배열 길이도 맞춘다
        talents: def.slots.map((_, i) => p.talents[i] ?? null),
      }
    }),
  }
}
