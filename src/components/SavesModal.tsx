import { useEffect, useRef, useState } from 'react'
import type { SimState } from '../types'
import { exportCode, parseImportCode, useStore } from '../state/store'

const fmtDate = (ms: number) => new Date(ms).toLocaleString('ko-KR', { dateStyle: 'short', timeStyle: 'short' })

export function SavesModal() {
  const show = useStore((s) => s.showSaves)
  const setShow = useStore((s) => s.setShowSaves)
  const saves = useStore((s) => s.saves)
  const state = useStore((s) => s.state)
  const deleteSave = useStore((s) => s.deleteSave)
  const loadSave = useStore((s) => s.loadSave)
  const importSetup = useStore((s) => s.importSetup)

  const [err, setErr] = useState('')
  const [copiedKey, setCopiedKey] = useState('')
  const [importText, setImportText] = useState('')
  const copyTimer = useRef<number | null>(null)

  useEffect(() => () => {
    if (copyTimer.current != null) window.clearTimeout(copyTimer.current)
  }, [])

  if (!show) return null

  async function copyCode(key: string, name: string, st: SimState) {
    setErr('')
    const code = exportCode(name, st)
    try {
      await navigator.clipboard.writeText(code)
      setCopiedKey(key)
      if (copyTimer.current != null) window.clearTimeout(copyTimer.current)
      copyTimer.current = window.setTimeout(() => setCopiedKey(''), 1500)
    } catch {
      // 클립보드 권한이 없으면 코드를 직접 복사할 수 있게 보여준다
      window.prompt('아래 코드를 복사하세요', code)
    }
  }

  function onImport() {
    const parsed = parseImportCode(importText)
    if (!parsed) {
      setErr('올바른 세팅 코드가 아닙니다.')
      return
    }
    setErr('')
    setImportText('')
    importSetup(parsed.state, parsed.name)
  }

  const slateCount = (s: (typeof saves)[number]) => s.state.placements.length

  return (
    <div className="modal-backdrop" onClick={() => setShow(false)}>
      <div className="modal saves-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>저장된 세팅</h2>
          <button type="button" onClick={() => setShow(false)}>
            ✕
          </button>
        </div>
        <div className="modal-body">
          <div className="saves-top">
            <button
              type="button"
              onClick={() => void copyCode('current', '현재 세팅', state)}
              title="현재 보드를 코드로 복사"
            >
              {copiedKey === 'current' ? '✓ 복사됨' : '⬆ 현재 세팅 코드 복사'}
            </button>
          </div>
          <div className="import-row">
            <input
              type="text"
              value={importText}
              placeholder="세팅 코드 붙여넣기…"
              onChange={(e) => setImportText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') onImport()
              }}
            />
            <button type="button" disabled={!importText.trim()} onClick={onImport}>
              ⬇ 가져오기
            </button>
          </div>
          {err && <p className="import-err">{err}</p>}

          {saves.length === 0 ? (
            <p className="muted small saves-empty">저장된 세팅이 없습니다. 상단의 “💾 저장”으로 현재 보드를 저장하세요.</p>
          ) : (
            <ul className="saves-list">
              {saves.map((s) => (
                <li key={s.id}>
                  <div className="save-info">
                    <span className="save-name">{s.name}</span>
                    <span className="save-meta">
                      석판 {slateCount(s)}개 · {fmtDate(s.savedAt)}
                    </span>
                  </div>
                  <div className="save-actions">
                    <button type="button" className="primary" onClick={() => loadSave(s.id)}>
                      불러오기
                    </button>
                    <button
                      type="button"
                      onClick={() => void copyCode(s.id, s.name, s.state)}
                      title="코드 복사"
                    >
                      {copiedKey === s.id ? '✓' : '⬆'}
                    </button>
                    <button type="button" className="danger" onClick={() => deleteSave(s.id)} title="삭제">
                      🗑
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
