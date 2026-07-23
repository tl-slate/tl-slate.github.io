import { useMemo } from 'react'
import type { CSSProperties } from 'react'
import type { CopyDir, SlotSpec, Talent } from '../types'
import { GODS } from '../data/slates'
import { COPIER_KEYS, COPY_DIR_LABEL, computeCopies } from '../engine/copy'
import { isJudgment, judgmentActive, judgmentBoosts } from '../engine/judgment'
import { slotAccepts, slotTierLabel, talentTierLabel } from '../engine/tiers'
import { useStore } from '../state/store'
import { TalentCombobox } from './TalentCombobox'

const COPY_DIRS: CopyDir[] = ['up', 'down', 'left', 'right']

const tierClass = (t: string) => (t === '하위' || t === '중위' ? 'sub' : 'named')

export function Inspector() {
  const state = useStore((s) => s.state)
  const selectedId = useStore((s) => s.selectedId)
  const db = useStore((s) => s.db)
  const setGod = useStore((s) => s.setGod)
  const setTalent = useStore((s) => s.setTalent)
  const setCopyDir = useStore((s) => s.setCopyDir)

  const idx = useMemo(() => {
    const m = new Map<string, Talent>()
    if (db) for (const g of db.gods) for (const t of db.talents[g] ?? []) m.set(t.id, t)
    return m
  }, [db])

  // 최대 개수(하위3/중위3/레전드중위1/핵심1)는 "석판 한 장" 기준이다.
  // 다른 석판에 같은 재능이 또 붙는 건 별개로 적용되므로 이 석판 안에서만 센다.
  // (보드가 달라 id가 다르면 효과가 같아도 서로 다른 재능이라 각각 적용된다)
  const usage = useMemo(() => {
    const m = new Map<string, number>()
    const p = state.placements.find((x) => x.id === selectedId)
    if (p) for (const t of p.talents) if (t) m.set(t, (m.get(t) ?? 0) + 1)
    return m
  }, [state.placements, selectedId])

  const placement = state.placements.find((p) => p.id === selectedId) ?? null

  // 이 석판이 복제 석판이면, 지금 실제로 복제되는 재능 줄들
  const myCopies = useMemo(() => {
    if (!placement?.key || !COPIER_KEYS.has(placement.key)) return []
    return computeCopies(state, idx).filter((c) => c.copierId === placement.id)
  }, [state, idx, placement])

  // 심판 보정(연결선 상 석판 ×1.7) 상태
  const boosts = useMemo(() => judgmentBoosts(state), [state])

  if (!placement) {
    return (
      <div className="inspector empty">
        <p className="muted">배치된 석판을 클릭해 신과 재능을 지정하세요. 팔레트의 석판을 보드로 드래그하면 배치됩니다.</p>
      </div>
    )
  }

  const hasSlots = placement.slots.length > 0
  const god = placement.god
  const isNormal = placement.category === '일반'
  const isNether = placement.category === '명왕'
  const showSlots = hasSlots && (!isNormal || !!god)

  // 일반: 선택한 신만. 레전드: 6신 전부 섞임.
  // 명왕: 고정 슬롯은 명왕 재능만, 낙인 슬롯은 명왕 제외 6신 재능(사용자 확인). (등급 필터 공통)
  function poolFor(slot: SlotSpec): Talent[] {
    if (!db) return []
    let gods: string[]
    if (isNormal) {
      if (!god) return []
      gods = [god]
    } else if (isNether) {
      gods = slot.kind === 'brand' ? db.gods.filter((g) => g !== 'Nether King') : ['Nether King']
    } else {
      gods = db.gods.filter((g) => g !== 'Nether King')
    }
    const out: Talent[] = []
    for (const g of gods) for (const t of db.talents[g] ?? []) if (slotAccepts(slot, t)) out.push(t)
    return out
  }

  return (
    <div className="inspector">
      <div className="insp-head">
        <div>
          <div className="insp-title">{placement.name}</div>
          <div className="insp-sub">{placement.category}</div>
        </div>
      </div>

      {placement.note && (
        <div className="insp-special">
          <span className="insp-special-label">특수 옵션</span>
          <span>{placement.note}</span>
        </div>
      )}

      {isJudgment(placement) && (
        <div className={`insp-boost${judgmentActive(placement) ? ' on' : ''}`}>
          {judgmentActive(placement)
            ? `심판 활성 — 연결선 상의 석판 ${boosts.size}개에 옵션 효과 ×1.7 적용 중 (수치는 반올림)`
            : '심판 비활성 — 슬롯을 모두 채우면 연결선 상의 석판에 옵션 효과 ×1.7'}
        </div>
      )}

      {boosts.has(placement.id) && (
        <div className="insp-boost on">심판 연결선 위 — 이 석판의 수치 스탯에 ×1.7 적용 중 (반올림)</div>
      )}

      {placement.key === 'l-moth' && (
        <div className="copy-dir">
          <span className="copy-dir-label">복제 방향</span>
          {COPY_DIRS.map((d) => (
            <button
              key={d}
              type="button"
              className={`dir-chip${placement.copyDir === d ? ' active' : ''}`}
              onClick={() => setCopyDir(placement.id, placement.copyDir === d ? null : d)}
            >
              {COPY_DIR_LABEL[d]}
            </button>
          ))}
        </div>
      )}

      {placement.key && COPIER_KEYS.has(placement.key) && (
        <div className="copy-list">
          <span className="copy-list-label">복제된 재능 ({myCopies.length})</span>
          {placement.key === 'l-moth' && !placement.copyDir ? (
            <p className="muted small">복제 방향을 선택하세요.</p>
          ) : myCopies.length === 0 ? (
            <p className="muted small">복제되는 재능이 없습니다. 인접 석판의 재능과 복제 조건(핵심·신격 한도 1 복사 불가 등)을 확인하세요.</p>
          ) : (
            <ul className="copy-lines">
              {myCopies.map((c, i) => (
                <li key={i}>
                  <span className="copy-src">{c.sourceName}</span>
                  <span className={`tier-badge tier-${tierClass(c.talent.tier)}`}>{talentTierLabel(c.talent)}</span>
                  <span className="copy-effect">{c.talent.effect}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {hasSlots && isNormal && (
        <div className="god-select">
          {GODS.map((g) => (
            <button
              key={g.god}
              type="button"
              className={`god-chip${god === g.god ? ' active' : ''}`}
              style={{ '--gc': g.color } as CSSProperties}
              onClick={() => setGod(placement.id, god === g.god ? null : g.god)}
            >
              {g.label}
            </button>
          ))}
        </div>
      )}

      {hasSlots && isNormal && !god && (
        <p className="muted small">신을 선택하면 슬롯에 재능을 넣을 수 있습니다.</p>
      )}

      {showSlots && (
        <div className="slots">
          {placement.slots.map((slot, i) => {
                const current = placement.talents[i]
                const pool = poolFor(slot)
                const chosen = current ? idx.get(current) ?? null : null
                return (
                  <div key={i} className={`slot-row${slot.kind === 'brand' ? ' slot-brand' : ''}`}>
                    <div className="slot-label">
                      {slot.kind === 'brand' && <span className="slot-kind kind-brand">낙인</span>}
                      <span>재능 - {slotTierLabel(slot, isNether)}</span>
                    </div>
                    <TalentCombobox
                      options={pool}
                      value={current}
                      onChange={(v) => setTalent(placement.id, i, v)}
                      usage={usage}
                    />
                    {chosen && (
                      <div className="slot-effect">
                        <div className="slot-effect-side">
                          <span className={`tier-badge tier-${tierClass(chosen.tier)}`}>
                            {talentTierLabel(chosen)}
                          </span>
                          <span className="slot-max">최대 {chosen.max}</span>
                          {chosen.divLimit === 1 && <span className="slot-max">신격 한도 1</span>}
                        </div>
                        <div className="slot-effect-text">{chosen.effect}</div>
                      </div>
                    )}
                  </div>
                )
              })}
        </div>
      )}

      {!hasSlots && !placement.note && <p className="muted small">이 석판은 재능 슬롯이 없습니다.</p>}
    </div>
  )
}
