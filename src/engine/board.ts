import type { BoardConfig, Cell, Placement, SimState } from '../types'
import { absoluteCells, cellKey } from './geometry'

export interface ResolvedPlacement {
  placement: Placement
  cells: Cell[]
}

export function resolveAll(placements: Placement[]): ResolvedPlacement[] {
  return placements.map((p) => ({ placement: p, cells: absoluteCells(p) }))
}

/** Map "x,y" -> placement id for all occupied cells (last writer wins). */
export function occupancy(resolved: ResolvedPlacement[]): Map<string, string> {
  const map = new Map<string, string>()
  for (const r of resolved) for (const c of r.cells) map.set(cellKey(c.x, c.y), r.placement.id)
  return map
}

export function isDisabled(board: BoardConfig, x: number, y: number): boolean {
  return board.disabled.includes(cellKey(x, y))
}

export function inBounds(board: BoardConfig, c: Cell): boolean {
  return c.x >= 0 && c.y >= 0 && c.x < board.w && c.y < board.h
}

/** A cell is inside the statue's defined range (on the canvas and not a hole). */
export function isValidCell(board: BoardConfig, c: Cell): boolean {
  return inBounds(board, c) && !isDisabled(board, c.x, c.y)
}

/** Placement is allowed as long as every cell stays on the canvas. */
export function inCanvas(cells: Cell[], board: BoardConfig): boolean {
  return cells.every((c) => inBounds(board, c))
}

/** All cells inside the valid statue range. */
export function allInRange(cells: Cell[], board: BoardConfig): boolean {
  return cells.every((c) => isValidCell(board, c))
}

/** Does any cell overlap a placement other than `ignoreId`? */
export function overlaps(cells: Cell[], occ: Map<string, string>, ignoreId?: string): boolean {
  return cells.some((c) => {
    const owner = occ.get(cellKey(c.x, c.y))
    return owner !== undefined && owner !== ignoreId
  })
}

/**
 * Ids of placements that are invalid: out of the statue range, or overlapping an
 * EARLIER-placed piece (the later arrival is the one flagged red).
 */
export function invalidPlacements(state: SimState): Set<string> {
  const bad = new Set<string>()
  const owned = new Map<string, string>() // cell -> earliest owner
  for (const p of state.placements) {
    const cells = absoluteCells(p)
    const outOfRange = !allInRange(cells, state.board)
    let overlap = false
    for (const c of cells) if (owned.has(cellKey(c.x, c.y))) overlap = true
    if (outOfRange || overlap) bad.add(p.id)
    for (const c of cells) {
      const k = cellKey(c.x, c.y)
      if (!owned.has(k)) owned.set(k, p.id)
    }
  }
  return bad
}
