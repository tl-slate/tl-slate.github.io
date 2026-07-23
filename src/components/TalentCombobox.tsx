import { useEffect, useRef, useState } from 'react'
import type { Talent } from '../types'
import { talentTierLabel } from '../engine/tiers'

const isGeneric = (name: string) => /재능$|재능 포인트$/.test(name)
const tierClass = (t: string) => (t === '하위' || t === '중위' ? 'sub' : 'named')
const label = (t: Talent) => `${isGeneric(t.name) ? '' : t.name + ' · '}${t.effect}`

export function TalentCombobox({
  options,
  value,
  onChange,
  usage,
}: {
  options: Talent[]
  value: string | null
  onChange: (id: string | null) => void
  usage: Map<string, number>
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const ref = useRef<HTMLDivElement>(null)
  const chosen = value ? options.find((o) => o.id === value) ?? null : null

  useEffect(() => {
    if (!open) return
    function onDoc(e: PointerEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) close()
    }
    window.addEventListener('pointerdown', onDoc)
    return () => window.removeEventListener('pointerdown', onDoc)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  function close() {
    setOpen(false)
    setQuery('')
  }
  function pick(id: string | null) {
    onChange(id)
    close()
  }

  // 공백으로 나눈 단어들이 순서·위치 무관하게 전부 포함되면 매치 (예: "소환 대미지")
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean)
  // 등급(1레벨 핵심 등)·소속 보드(명사수 등)로도 검색되게 한다
  const searchText = (o: Talent) => `${label(o)} ${talentTierLabel(o)} ${o.board ?? ''}`
  const filtered = terms.length
    ? options.filter((o) => {
        const s = searchText(o).toLowerCase()
        return terms.every((t) => s.includes(t))
      })
    : options
  const displayValue = open ? query : chosen ? label(chosen) : ''

  return (
    <div className="combo" ref={ref}>
      <div className="combo-input">
        <input
          type="text"
          value={displayValue}
          placeholder="재능 검색 / 선택…"
          onFocus={() => {
            setQuery('')
            setOpen(true)
          }}
          // blur 시 닫는다. (blur 직전에 브라우저가 change를 쏘면서 onChange가
          // 선택된 라벨 전체를 검색어로 넣고 목록을 다시 여는 버그가 있었음 — blur가 마지막에 닫아준다)
          onBlur={() => close()}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              close()
              e.currentTarget.blur()
            } else if (e.key === 'Enter' && filtered.length) {
              const first = filtered.find((o) => (usage.get(o.id) ?? 0) < o.max || o.id === value)
              if (first) pick(first.id)
            }
          }}
        />
        <button
          type="button"
          className="combo-arrow"
          tabIndex={-1}
          // mousedown에서 처리해야 input blur(→ close)와 onClick 토글이 서로 꼬이지 않는다
          onMouseDown={(e) => {
            e.preventDefault()
            if (open) close()
            else {
              setQuery('')
              setOpen(true)
            }
          }}
        >
          ▾
        </button>
      </div>
      {open && (
        // 리스트 내부(스크롤바 포함)를 눌러도 input 포커스를 뺏기지 않게 한다
        <div className="combo-list" onMouseDown={(e) => e.preventDefault()}>
          <div className="combo-opt clear" onMouseDown={(e) => (e.preventDefault(), pick(null))}>
            — 비어 있음 —
          </div>
          {filtered.length === 0 && <div className="combo-opt none">검색 결과 없음</div>}
          {filtered.map((o) => {
            const atMax = (usage.get(o.id) ?? 0) >= o.max && o.id !== value
            return (
              <div
                key={o.id}
                className={`combo-opt${o.id === value ? ' sel' : ''}${atMax ? ' disabled' : ''}`}
                onMouseDown={(e) => {
                  e.preventDefault()
                  if (!atMax) pick(o.id)
                }}
              >
                <span className={`tier-badge tier-${tierClass(o.tier)}`}>{talentTierLabel(o)}</span>
                <span className="combo-opt-text">
                  {o.board && <span className="combo-opt-board">{o.board}</span>}
                  {label(o)}
                </span>
                <span className="combo-opt-max">
                  최대 {o.max}
                  {o.divLimit === 1 ? ' · 신격한도 1' : ''}
                  {atMax ? ' · 한도' : ''}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
