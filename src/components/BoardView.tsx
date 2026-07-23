import { useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react'
import type { Cell, Placement } from '../types'
import { CATEGORY_COLOR, godMeta } from '../data/slates'
import { allInRange, inCanvas, invalidPlacements, occupancy, overlaps, resolveAll } from '../engine/board'
import { absoluteCells, cellKey, orientedShape } from '../engine/geometry'
import { useStore } from '../state/store'

const CELL = 56

// 신의 계보 실제 아트(tlidb ZZ1 아이콘 112×160, 두 방향 모두 알파 bbox x14 y38 87×89).
// 아트 자체는 회전하지 않고, ZZ1은 180° 대칭이라 방향이 두 가지뿐이다:
// rot 0/2 = 우상·좌하 빈 방향(ZZ1_0), rot 1/3 = 좌상·우하 빈 방향(ZZ1_1) — 게임 원본 아이콘 그대로.
const PEDIGREE_IMG = { w: 112, h: 160, bx: 14, by: 38, bw: 87, bh: 89 }
const pedigreeSrc = (rot: number) =>
  `${import.meta.env.BASE_URL}img/${rot % 2 === 0 ? 'l-pedigree.webp' : 'l-pedigree-r1.webp'}`

function pieceColor(p: Placement): string {
  return godMeta(p.god)?.color ?? CATEGORY_COLOR[p.category]
}

// 석판 둘레 외곽선: 같은 색 석판이 붙어 있어도 경계가 보이도록,
// 자기 석판 셀이 아닌 쪽 변에만 어두운 심(2px)을 넣는다.
const SLATE_EDGE = 'rgba(0, 0, 0, 0.55)'
function perimeterShadow(c: Cell, own: Set<string>): string | undefined {
  const edges: string[] = []
  if (!own.has(cellKey(c.x, c.y - 1))) edges.push(`inset 0 2px 0 0 ${SLATE_EDGE}`)
  if (!own.has(cellKey(c.x, c.y + 1))) edges.push(`inset 0 -2px 0 0 ${SLATE_EDGE}`)
  if (!own.has(cellKey(c.x - 1, c.y))) edges.push(`inset 2px 0 0 0 ${SLATE_EDGE}`)
  if (!own.has(cellKey(c.x + 1, c.y))) edges.push(`inset -2px 0 0 0 ${SLATE_EDGE}`)
  return edges.length ? edges.join(', ') : undefined
}

function bbox(cells: Cell[]) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (const c of cells) {
    if (c.x < minX) minX = c.x
    if (c.x > maxX) maxX = c.x
    if (c.y < minY) minY = c.y
    if (c.y > maxY) maxY = c.y
  }
  return { minX, minY, maxX, maxY }
}

export function BoardView() {
  const state = useStore((s) => s.state)
  const drag = useStore((s) => s.drag)
  const selectedId = useStore((s) => s.selectedId)
  const beginDragMove = useStore((s) => s.beginDragMove)
  const removePlacement = useStore((s) => s.removePlacement)
  const rotatePlacement = useStore((s) => s.rotatePlacement)
  const confirm = useStore((s) => s.confirm)
  const select = useStore((s) => s.select)

  const { board, placements } = state
  const boardRef = useRef<HTMLDivElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)

  // 반응형: 가운데 영역 크기에 맞춰 보드를 스케일(가로/세로 중 먼저 닿는 쪽까지 꽉 채움)
  const [scale, setScale] = useState(1)
  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const ro = new ResizeObserver((entries) => {
      const r = entries[0].contentRect
      if (r.width < 10 || r.height < 10) return
      const k = Math.min(r.width / (board.w * CELL), r.height / (board.h * CELL))
      setScale(Math.min(2, Math.max(0.3, k)))
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [board.w, board.h])

  const invalid = useMemo(() => invalidPlacements(state), [state])

  const preview = useMemo(() => {
    if (!drag || !boardRef.current) return null
    const rect = boardRef.current.getBoundingClientRect()
    const cs = rect.width / board.w // 스케일 반영된 실제 셀 크기
    const cx = Math.floor((drag.px - rect.left) / cs)
    const cy = Math.floor((drag.py - rect.top) / cs)
    const overBoard = drag.px >= rect.left && drag.px <= rect.right && drag.py >= rect.top && drag.py <= rect.bottom
    const anchor = { x: cx - drag.grab.x, y: cy - drag.grab.y }
    const cells = orientedShape(drag.shape, drag.rot).map((c) => ({ x: c.x + anchor.x, y: c.y + anchor.y }))
    const ignore = drag.kind === 'move' ? drag.id ?? undefined : undefined
    const occ = occupancy(resolveAll(placements))
    const valid = allInRange(cells, board) && !overlaps(cells, occ, ignore)
    return { cells, overBoard, valid }
  }, [drag, board, placements])

  const dragging = !!drag
  useEffect(() => {
    if (!dragging) return
    function onMove(e: PointerEvent) {
      useStore.getState().updateDragPointer(e.clientX, e.clientY)
    }
    function onUp(e: PointerEvent) {
      const st = useStore.getState()
      const d = st.drag
      const rect = boardRef.current?.getBoundingClientRect()
      if (d && rect) {
        const cs = rect.width / st.state.board.w
        const cx = Math.floor((e.clientX - rect.left) / cs)
        const cy = Math.floor((e.clientY - rect.top) / cs)
        const anchor = { x: cx - d.grab.x, y: cy - d.grab.y }
        const cells = orientedShape(d.shape, d.rot).map((c) => ({ x: c.x + anchor.x, y: c.y + anchor.y }))
        if (inCanvas(cells, st.state.board)) {
          if (d.kind === 'new') st.placeAt({ key: d.key, name: d.name, category: d.category, shape: d.shape, slots: d.slots, note: d.note }, anchor.x, anchor.y, d.rot)
          else if (d.id) st.movePlacementTo(d.id, anchor.x, anchor.y, d.rot)
        } else if (d.kind === 'move' && d.id) {
          st.removePlacement(d.id) // dragged off the canvas -> delete
        }
      }
      st.cancelDrag()
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
  }, [dragging])

  function startMove(e: ReactPointerEvent, p: Placement) {
    e.preventDefault()
    e.stopPropagation()
    // preventDefault가 포커스 이동까지 막아서, 재능 검색창에 포커스가 남아 있으면
    // 이후 R/Del/Esc 단축키가 입력창 타이핑으로 간주돼 전부 무시된다 → 보드 조작 시 명시적으로 뺀다
    const ae = document.activeElement as HTMLElement | null
    if (ae && ae !== document.body) ae.blur()
    const rect = boardRef.current!.getBoundingClientRect()
    const cs = rect.width / board.w
    const cx = Math.floor((e.clientX - rect.left) / cs)
    const cy = Math.floor((e.clientY - rect.top) / cs)
    beginDragMove(p.id, { x: cx - p.x, y: cy - p.y }, e.clientX, e.clientY)
  }

  const selected = placements.find((p) => p.id === selectedId) ?? null
  const selInvalid = selected ? invalid.has(selected.id) : false
  const selBox = selected ? bbox(absoluteCells(selected)) : null

  return (
    <div ref={wrapRef} className="board-wrap">
      <div
        ref={boardRef}
        className="board"
        style={{ width: board.w * CELL, height: board.h * CELL, transform: `scale(${scale})`, transformOrigin: 'center center' }}
      >
        {/* grid cells: valid statue range vs out-of-range canvas */}
        {Array.from({ length: board.h }).map((_, y) =>
          Array.from({ length: board.w }).map((_, x) => {
            const out = board.disabled.includes(cellKey(x, y))
            return (
              <div
                key={cellKey(x, y)}
                className={`cell${out ? ' cell-out' : ''}`}
                style={{ left: x * CELL, top: y * CELL, width: CELL, height: CELL }}
                onClick={() => select(null)}
              />
            )
          }),
        )}

        {/* placed slates */}
        {placements.map((p) => {
          const moving = drag?.kind === 'move' && drag.id === p.id
          const cells = absoluteCells(p)
          const isSel = selectedId === p.id
          const inProgress = p.confirmed === false
          const bad = invalid.has(p.id)
          const color = pieceColor(p)
          const meta = godMeta(p.god)
          const labelCell = cells.reduce((a, c) => (c.y < a.y || (c.y === a.y && c.x < a.x) ? c : a), cells[0])
          const stateCls = inProgress ? (bad ? ' bad' : ' good') : ''
          const box = p.key === 'l-pedigree' ? bbox(cells) : null
          const own = new Set(cells.map((cc) => cellKey(cc.x, cc.y)))
          return (
            <div key={p.id} className={`piece-group${moving ? ' moving' : ''}${box ? ' has-img' : ''}`}>
              {box && (
                <div
                  className="piece-img"
                  style={{
                    left: box.minX * CELL,
                    top: box.minY * CELL,
                    width: (box.maxX - box.minX + 1) * CELL,
                    height: (box.maxY - box.minY + 1) * CELL,
                  }}
                >
                  <img
                    src={pedigreeSrc(p.rot)}
                    alt=""
                    style={{
                      left: `${(-PEDIGREE_IMG.bx / PEDIGREE_IMG.bw) * 100}%`,
                      top: `${(-PEDIGREE_IMG.by / PEDIGREE_IMG.bh) * 100}%`,
                      width: `${(PEDIGREE_IMG.w / PEDIGREE_IMG.bw) * 100}%`,
                      height: `${(PEDIGREE_IMG.h / PEDIGREE_IMG.bh) * 100}%`,
                    }}
                  />
                </div>
              )}
              {cells.map((c) => (
                <div
                  key={cellKey(c.x, c.y)}
                  className={`piece${isSel ? ' sel' : ''}${stateCls}`}
                  style={{ left: c.x * CELL, top: c.y * CELL, width: CELL, height: CELL, '--pc': color, boxShadow: perimeterShadow(c, own) } as CSSProperties}
                  onPointerDown={(e) => startMove(e, p)}
                  onClick={(e) => {
                    e.stopPropagation()
                    select(p.id)
                  }}
                  onContextMenu={(e) => {
                    e.preventDefault()
                    removePlacement(p.id)
                  }}
                  title="드래그: 이동 · 우클릭: 삭제"
                >
                  {c.x === labelCell.x && c.y === labelCell.y && p.category !== '일반' && (
                    <span className="piece-label">
                      <span className="piece-name">{p.name}</span>
                    </span>
                  )}
                  {c.x === labelCell.x && c.y === labelCell.y && (meta || p.talents.length > 0) && (
                    <span className="piece-meta">
                      {meta && <span className="pdot" style={{ background: meta.color }} />}
                      {p.talents.length > 0 && <span className="pt">{p.talents.length}</span>}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )
        })}

        {/* center tools for the selected slate */}
        {selected && selBox && (
          <div
            className="piece-tools"
            style={{
              left: ((selBox.minX + selBox.maxX + 1) / 2) * CELL,
              top: ((selBox.minY + selBox.maxY + 1) / 2) * CELL,
            }}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <button type="button" title="회전 (R)" onClick={() => rotatePlacement(selected.id)}>
              ⟳
            </button>
            <button
              type="button"
              className="ok"
              title={selInvalid ? '올바른 위치가 아니라 확인할 수 없음' : '확인 (고정)'}
              disabled={selInvalid}
              onClick={() => confirm(selected.id)}
            >
              ✓
            </button>
            <button type="button" className="del" title="삭제 (Del)" onClick={() => removePlacement(selected.id)}>
              ✕
            </button>
          </div>
        )}

        {/* drag preview ghost */}
        {preview?.overBoard &&
          preview.cells.map((c) => {
            if (c.x < 0 || c.y < 0 || c.x >= board.w || c.y >= board.h) return null
            return (
              <div
                key={`ghost-${cellKey(c.x, c.y)}`}
                className={`ghost${preview.valid ? '' : ' ghost-bad'}`}
                style={{ left: c.x * CELL, top: c.y * CELL, width: CELL, height: CELL }}
              />
            )
          })}
      </div>
    </div>
  )
}
