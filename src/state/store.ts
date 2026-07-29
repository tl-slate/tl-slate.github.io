import { create } from 'zustand'
import type { BoardConfig, Category, Cell, CopyDir, Placement, Rot, SimState, SlateType, SlotSpec, TalentDB } from '../types'
import { inBounds, inCanvas, invalidPlacements } from '../engine/board'
import { absoluteCells, cellKey, orientedShape } from '../engine/geometry'
import { rehydrate } from '../engine/rehydrate'
import { nextRot } from '../engine/rots'

const LS_KEY = 'tl-slate-sim:v5'
const SAVES_KEY = 'tl-slate-saves:v1'
export const SAVE_VERSION = 5

function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `p-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`
}

/** A named, saved slate setup (stored in localStorage). */
export interface SavedSetup {
  id: string
  name: string
  savedAt: number
  state: SimState
}

function loadSaves(): SavedSetup[] {
  try {
    const raw = localStorage.getItem(SAVES_KEY)
    if (raw) {
      const arr = JSON.parse(raw)
      if (Array.isArray(arr)) return arr.filter((s) => s?.state?.board)
    }
  } catch {
    /* ignore */
  }
  return []
}
function persistSaves(saves: SavedSetup[]) {
  try {
    localStorage.setItem(SAVES_KEY, JSON.stringify(saves))
  } catch {
    /* ignore quota */
  }
}
const clone = (s: SimState): SimState => JSON.parse(JSON.stringify(s))

/** Validate & extract a SimState from imported JSON (returns null if invalid). */
export function parseImport(json: string): { name: string; state: SimState } | null {
  try {
    const d = JSON.parse(json)
    const state = d?.state ?? d
    if (!state?.board || !Array.isArray(state?.placements)) return null
    return { name: typeof d?.name === 'string' ? d.name : '가져온 세팅', state: state as SimState }
  } catch {
    return null
  }
}

/** JSON string for exporting a saved setup (or the current state). */
export function exportJson(name: string, state: SimState): string {
  return JSON.stringify({ app: 'torchlight-slate-sim', version: SAVE_VERSION, name, savedAt: Date.now(), state }, null, 2)
}

// ---- base64 세팅 코드 (한글 안전, UTF-8 경유) ----
function b64encode(s: string): string {
  const bytes = new TextEncoder().encode(s)
  let bin = ''
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(bin)
}
function b64decode(b64: string): string {
  const bin = atob(b64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return new TextDecoder().decode(bytes)
}

/** 세팅 → 내보내기 코드 */
export function exportCode(name: string, state: SimState): string {
  return b64encode(exportJson(name, state))
}

/** 내보내기 코드(또는 JSON 원문) → 세팅. 실패 시 null */
export function parseImportCode(code: string): { name: string; state: SimState } | null {
  const raw = code.trim()
  if (!raw) return null
  if (raw.startsWith('{')) return parseImport(raw) // 예전 JSON 파일 내용을 붙여넣는 것도 허용
  try {
    return parseImport(b64decode(raw.replace(/\s+/g, '')))
  } catch {
    return null
  }
}

/**
 * The Statue board: rows of 2·4·6·6·4·2 cells (a hexagon) embedded in a larger
 * 10×10 canvas with a 2-cell margin, so slates can be arranged loosely; cells
 * outside the hexagon are "out of range" (placeable but flagged).
 */
export function hexBoard(): BoardConfig {
  const w = 10
  const h = 10
  const OFF = 2
  const hexRows = [[2, 3], [1, 2, 3, 4], [0, 1, 2, 3, 4, 5], [0, 1, 2, 3, 4, 5], [1, 2, 3, 4], [2, 3]]
  const valid = new Set<string>()
  hexRows.forEach((cols, y) => cols.forEach((x) => valid.add(cellKey(x + OFF, y + OFF))))
  const disabled: string[] = []
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (!valid.has(cellKey(x, y))) disabled.push(cellKey(x, y))
  return { w, h, disabled }
}

function defaultState(): SimState {
  return { board: hexBoard(), placements: [] }
}

function loadInitial(): SimState {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed?.board) return rehydrate(parsed as SimState)
    }
  } catch {
    /* ignore */
  }
  return defaultState()
}

export interface DragState {
  kind: 'new' | 'move'
  id: string | null
  key?: string
  name: string
  category: Category
  shape: Cell[]
  slots: SlotSpec[]
  note?: string
  rot: Rot
  grab: Cell
  px: number
  py: number
}

export interface Store {
  db: TalentDB | null
  loading: boolean
  error: string | null

  state: SimState
  selectedId: string | null
  drag: DragState | null
  showHelp: boolean
  saves: SavedSetup[]
  showSaves: boolean

  loadDB: () => Promise<void>

  beginDragNew: (item: SlateType, px: number, py: number) => void
  beginDragMove: (id: string, grab: Cell, px: number, py: number) => void
  updateDragPointer: (px: number, py: number) => void
  rotateDrag: () => void
  cancelDrag: () => void

  select: (id: string | null) => void
  confirm: (id: string) => void
  placeAt: (
    item: { key?: string; name: string; category: Category; shape: Cell[]; slots: SlotSpec[]; note?: string },
    x: number,
    y: number,
    rot: Rot,
  ) => boolean
  movePlacementTo: (id: string, x: number, y: number, rot: Rot) => boolean
  rotatePlacement: (id: string) => void
  removePlacement: (id: string) => void
  setGod: (id: string, god: string | null) => void
  setTalent: (id: string, slotIdx: number, talentId: string | null) => void
  setCopyDir: (id: string, dir: CopyDir | null) => void

  resizeBoard: (w: number, h: number) => void
  setDefaultBoard: () => void
  reset: () => void

  setHelp: (open: boolean) => void

  setShowSaves: (open: boolean) => void
  saveCurrent: (name: string) => void
  deleteSave: (id: string) => void
  loadSave: (id: string) => void
  importSetup: (state: SimState, name: string) => void
}

export const useStore = create<Store>((set, get) => ({
  db: null,
  loading: true,
  error: null,

  state: loadInitial(),
  selectedId: null,
  drag: null,
  showHelp: false,
  saves: loadSaves(),
  showSaves: false,

  loadDB: async () => {
    try {
      const base = import.meta.env.BASE_URL ?? '/'
      const res = await fetch(`${base}data/talents.json`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      set({ db: (await res.json()) as TalentDB, loading: false })
    } catch (e) {
      set({ error: String(e), loading: false })
    }
  },

  beginDragNew: (item, px, py) =>
    set({
      drag: { kind: 'new', id: null, key: item.key, name: item.name, category: item.category, shape: item.shape, slots: item.slots, note: item.note, rot: 0, grab: { x: 0, y: 0 }, px, py },
      selectedId: null,
    }),

  beginDragMove: (id, grab, px, py) => {
    const { state } = get()
    const p = state.placements.find((pp) => pp.id === id)
    if (!p) return
    // move to end so it counts as the "latest" (flagged red on overlap) and renders on top
    const reordered = [...state.placements.filter((pp) => pp.id !== id), { ...p, confirmed: false }]
    set({
      state: { ...state, placements: reordered },
      drag: { kind: 'move', id, key: p.key, name: p.name, category: p.category, shape: p.shape, slots: p.slots, note: p.note, rot: p.rot, grab, px, py },
      selectedId: id,
    })
  },

  updateDragPointer: (px, py) => set((s) => (s.drag ? { drag: { ...s.drag, px, py } } : {})),
  rotateDrag: () => set((s) => (s.drag ? { drag: { ...s.drag, rot: nextRot(s.drag.key, s.drag.rot) } } : {})),
  cancelDrag: () => set({ drag: null }),

  select: (id) => {
    const { state, selectedId } = get()
    // clicking away auto-confirms the previously-worked slate if it sits validly
    if (selectedId && selectedId !== id) {
      const prev = state.placements.find((p) => p.id === selectedId)
      if (prev && prev.confirmed === false && !invalidPlacements(state).has(selectedId)) {
        set({
          state: {
            ...state,
            placements: state.placements.map((p) => (p.id === selectedId ? { ...p, confirmed: true } : p)),
          },
          selectedId: id,
        })
        return
      }
    }
    set({ selectedId: id })
  },

  confirm: (id) => {
    const { state } = get()
    if (invalidPlacements(state).has(id)) return // can't confirm an invalid placement
    set({
      state: { ...state, placements: state.placements.map((p) => (p.id === id ? { ...p, confirmed: true } : p)) },
      selectedId: null,
    })
  },

  placeAt: (item, x, y, rot) => {
    const { state } = get()
    // 종류별 최대 개수를 넘겨도 배치는 허용한다(겹침·범위밖과 같은 정책).
    // 넘긴 석판은 engine/limits의 overLimitIds가 잡아내 보드에 빨갛게 표시되고 집계에서 빠진다.
    const cells = orientedShape(item.shape, rot).map((c) => ({ x: c.x + x, y: c.y + y }))
    if (!inCanvas(cells, state.board)) return false
    const placement: Placement = {
      id: newId(),
      // 배치 순번 — 이후 재정렬(석판을 잡으면 배열 끝으로 감)과 무관하게 한도 판정 순서를 지킨다
      seq: state.placements.reduce((m, p) => Math.max(m, p.seq ?? -1), -1) + 1,
      key: item.key,
      name: item.name,
      category: item.category,
      shape: item.shape,
      slots: item.slots,
      note: item.note,
      x,
      y,
      rot,
      god: null,
      talents: item.slots.map(() => null),
      confirmed: false,
    }
    set((s) => ({ state: { ...s.state, placements: [...s.state.placements, placement] }, selectedId: placement.id }))
    return true
  },

  movePlacementTo: (id, x, y, rot) => {
    const { state } = get()
    const p = state.placements.find((pp) => pp.id === id)
    if (!p) return false
    const cells = orientedShape(p.shape, rot).map((c) => ({ x: c.x + x, y: c.y + y }))
    if (!inCanvas(cells, state.board)) return false
    set((s) => ({
      state: {
        ...s.state,
        placements: s.state.placements.map((pp) => (pp.id === id ? { ...pp, x, y, rot, confirmed: false } : pp)),
      },
    }))
    return true
  },

  rotatePlacement: (id) => {
    const { state } = get()
    const p = state.placements.find((pp) => pp.id === id)
    if (!p) return
    const next = nextRot(p.key, p.rot) // 방향이 제한된 석판(인펙션)은 허용된 것끼리만 돈다
    if (next === p.rot) return
    const cells = orientedShape(p.shape, next).map((c) => ({ x: c.x + p.x, y: c.y + p.y }))
    if (!inCanvas(cells, state.board)) return
    set((s) => ({
      state: {
        ...s.state,
        placements: s.state.placements.map((pp) => (pp.id === id ? { ...pp, rot: next, confirmed: false } : pp)),
      },
    }))
  },

  removePlacement: (id) =>
    set((s) => ({
      state: { ...s.state, placements: s.state.placements.filter((p) => p.id !== id) },
      selectedId: s.selectedId === id ? null : s.selectedId,
      drag: s.drag?.id === id ? null : s.drag,
    })),

  setGod: (id, god) =>
    set((s) => ({
      state: {
        ...s.state,
        placements: s.state.placements.map((p) => (p.id === id ? { ...p, god, talents: p.slots.map(() => null) } : p)),
      },
    })),

  setTalent: (id, slotIdx, talentId) =>
    set((s) => ({
      state: {
        ...s.state,
        placements: s.state.placements.map((p) => {
          if (p.id !== id) return p
          const talents = p.talents.slice()
          talents[slotIdx] = talentId
          return { ...p, talents }
        }),
      },
    })),

  setCopyDir: (id, dir) =>
    set((s) => ({
      state: {
        ...s.state,
        placements: s.state.placements.map((p) => (p.id === id ? { ...p, copyDir: dir ?? undefined } : p)),
      },
    })),

  resizeBoard: (w, h) => {
    const nw = Math.max(3, Math.min(16, Math.floor(w)))
    const nh = Math.max(3, Math.min(16, Math.floor(h)))
    set((s) => {
      const board: BoardConfig = {
        w: nw,
        h: nh,
        disabled: s.state.board.disabled.filter((k) => {
          const [x, y] = k.split(',').map(Number)
          return x < nw && y < nh
        }),
      }
      const placements = s.state.placements.filter((p) => absoluteCells(p).every((c) => inBounds(board, c)))
      return { state: { ...s.state, board, placements } }
    })
  },

  setDefaultBoard: () =>
    set((s) => {
      const board = hexBoard()
      const disabledSet = new Set(board.disabled)
      const placements = s.state.placements.filter((p) =>
        absoluteCells(p).every((c) => inBounds(board, c) && !disabledSet.has(cellKey(c.x, c.y))),
      )
      return { state: { ...s.state, board, placements } }
    }),

  reset: () => {
    if (typeof window !== 'undefined' && window.location.hash) {
      history.replaceState(null, '', window.location.pathname + window.location.search)
    }
    set({ state: defaultState(), selectedId: null, drag: null })
  },

  setHelp: (open) => set({ showHelp: open }),

  setShowSaves: (open) => set({ showSaves: open }),

  saveCurrent: (name) => {
    const { state, saves } = get()
    const setup: SavedSetup = { id: newId(), name: name.trim() || '이름 없는 세팅', savedAt: Date.now(), state: clone(state) }
    const next = [setup, ...saves]
    persistSaves(next)
    set({ saves: next })
  },

  deleteSave: (id) => {
    const next = get().saves.filter((s) => s.id !== id)
    persistSaves(next)
    set({ saves: next })
  },

  loadSave: (id) => {
    const setup = get().saves.find((s) => s.id === id)
    if (!setup) return
    if (typeof window !== 'undefined' && window.location.hash) {
      history.replaceState(null, '', window.location.pathname + window.location.search)
    }
    set({ state: rehydrate(clone(setup.state)), selectedId: null, drag: null, showSaves: false })
  },

  importSetup: (state, name) => {
    const setup: SavedSetup = { id: newId(), name: name.trim() || '가져온 세팅', savedAt: Date.now(), state: clone(state) }
    const next = [setup, ...get().saves]
    persistSaves(next)
    set({ saves: next, state: rehydrate(clone(state)), selectedId: null, drag: null })
  },
}))

if (typeof window !== 'undefined') {
  useStore.subscribe((s) => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(s.state))
    } catch {
      /* ignore quota errors */
    }
  })
}

