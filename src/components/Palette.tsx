import type { Category, SlateType } from '../types'
import { CATEGORY_COLOR, SHAPE_LIBRARY } from '../data/slates'
import { bounds } from '../engine/geometry'
import { limitInfo } from '../engine/limits'
import { useStore } from '../state/store'

function ShapePreview({ shape, color }: { shape: SlateType['shape']; color: string }) {
  const { w, h } = bounds(shape)
  const size = 7
  const gap = 1
  return (
    <div className="shape-preview" style={{ width: w * (size + gap), height: h * (size + gap) }}>
      {shape.map((c) => (
        <span
          key={`${c.x},${c.y}`}
          style={{ left: c.x * (size + gap), top: c.y * (size + gap), width: size, height: size, background: color }}
        />
      ))}
    </div>
  )
}

function PaletteItem({ item }: { item: SlateType }) {
  const beginDragNew = useStore((s) => s.beginDragNew)
  const state = useStore((s) => s.state)
  const color = CATEGORY_COLOR[item.category]
  const lim = limitInfo(state, item)

  const limitText = lim.limit == null ? '' : `${lim.placed}/${lim.limit}`
  const fullText = lim.shared
    ? '명왕 석판은 3종 통틀어 1개까지 놓을 수 있습니다'
    : `${item.name} — 최대 ${lim.limit}개까지 놓을 수 있습니다`
  const title = lim.canPlace
    ? item.note
      ? `${item.name} — ${item.note}`
      : '보드로 드래그해서 배치'
    : fullText

  return (
    <div
      className={`shape-item${lim.canPlace ? '' : ' full'}`}
      onPointerDown={(e) => {
        e.preventDefault()
        // 검색창 등에 남은 포커스를 빼서 이후 R/Del/Esc 단축키가 막히지 않게 한다
        const ae = document.activeElement as HTMLElement | null
        if (ae && ae !== document.body) ae.blur()
        if (!lim.canPlace) return // 한도 초과 — 드래그 자체를 시작하지 않는다
        beginDragNew(item, e.clientX, e.clientY)
      }}
      title={title}
    >
      <span className="shape-thumb">
        <ShapePreview shape={item.shape} color={color} />
      </span>
      {item.category !== '일반' && <span className="shape-name">{item.name}</span>}
      {limitText && <span className="shape-limit">{limitText}</span>}
    </div>
  )
}

export function Palette() {
  const groups: { cat: Category; items: SlateType[] }[] = [
    { cat: '일반', items: SHAPE_LIBRARY.filter((s) => s.category === '일반') },
    { cat: '레전드', items: SHAPE_LIBRARY.filter((s) => s.category === '레전드') },
    { cat: '명왕', items: SHAPE_LIBRARY.filter((s) => s.category === '명왕') },
  ]

  return (
    <div className="palette">
      <div className="panel-head">
        <h2>석판</h2>
      </div>

      {groups.map((g) => (
        <div key={g.cat} className="palette-cat">
          <div className="palette-cat-head" style={{ borderColor: CATEGORY_COLOR[g.cat] }}>
            <span className="dot" style={{ background: CATEGORY_COLOR[g.cat] }} />
            {g.cat}
          </div>
          <div className="palette-items">
            {g.items.map((item) => (
              <PaletteItem key={item.key} item={item} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
