import { CATEGORY_COLOR } from '../data/slates'
import { bounds, orientedShape } from '../engine/geometry'
import { useStore } from '../state/store'

export function DragLayer() {
  const drag = useStore((s) => s.drag)
  if (!drag) return null
  const color = CATEGORY_COLOR[drag.category]
  const shape = orientedShape(drag.shape, drag.rot)
  const { w, h } = bounds(shape)
  const size = 10
  const gap = 2
  return (
    <div className="drag-layer" style={{ left: drag.px + 16, top: drag.py + 16 }}>
      <div className="drag-chip">
        <div className="shape-preview" style={{ width: w * (size + gap), height: h * (size + gap) }}>
          {shape.map((c) => (
            <span
              key={`${c.x},${c.y}`}
              style={{ left: c.x * (size + gap), top: c.y * (size + gap), width: size, height: size, background: color }}
            />
          ))}
        </div>
        <span className="drag-chip-name">{drag.name}</span>
      </div>
    </div>
  )
}
