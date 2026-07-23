import type { Cell, Rot } from '../types'

export const cellKey = (x: number, y: number) => `${x},${y}`

/** Shift a set of cells so the minimum x and y are both 0. */
export function normalize(cells: Cell[]): Cell[] {
  if (cells.length === 0) return cells
  let minX = Infinity
  let minY = Infinity
  for (const c of cells) {
    if (c.x < minX) minX = c.x
    if (c.y < minY) minY = c.y
  }
  return cells.map((c) => ({ x: c.x - minX, y: c.y - minY }))
}

/** Rotate a set of cells 90° clockwise about the origin, then normalize. */
export function rotate90(cells: Cell[]): Cell[] {
  return normalize(cells.map((c) => ({ x: -c.y, y: c.x })))
}

/** Rotate a set of cells by `rot` quarter-turns clockwise. */
export function rotateN(cells: Cell[], rot: Rot): Cell[] {
  let out = cells
  for (let i = 0; i < rot; i++) out = rotate90(out)
  return out
}

/** The oriented, normalized cells for a shape at a given rotation. */
export function orientedShape(shape: Cell[], rot: Rot): Cell[] {
  return rotateN(shape, rot)
}

/** Absolute board cells occupied by a placed slate. */
export function absoluteCells(p: { shape: Cell[]; rot: Rot; x: number; y: number }): Cell[] {
  return orientedShape(p.shape, p.rot).map((c) => ({ x: c.x + p.x, y: c.y + p.y }))
}

export function bounds(cells: Cell[]): { w: number; h: number } {
  let maxX = 0
  let maxY = 0
  for (const c of cells) {
    if (c.x > maxX) maxX = c.x
    if (c.y > maxY) maxY = c.y
  }
  return { w: maxX + 1, h: maxY + 1 }
}
