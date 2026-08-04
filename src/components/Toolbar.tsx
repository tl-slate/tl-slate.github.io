import { useState } from 'react'
import { exportCode, useStore } from '../state/store'

export function Toolbar() {
  const reset = useStore((s) => s.reset)
  const setHelp = useStore((s) => s.setHelp)
  const setShowSaves = useStore((s) => s.setShowSaves)
  const saveCurrent = useStore((s) => s.saveCurrent)
  const state = useStore((s) => s.state)

  const [naming, setNaming] = useState(false)
  const [name, setName] = useState('')
  const [done, setDone] = useState(false)
  const [copied, setCopied] = useState(false)

  function commitSave() {
    saveCurrent(name)
    setName('')
    setNaming(false)
    setDone(true)
    setTimeout(() => setDone(false), 1600)
  }

  async function copyCurrentCode() {
    const code = exportCode('현재 세팅', state)
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      window.prompt('아래 코드를 복사하세요', code)
    }
  }

  return (
    <div className="toolbar">
      <div className="tb-group tb-right">
        {naming ? (
          <span className="save-inline">
            <input
              type="text"
              autoFocus
              placeholder="세팅 이름…"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitSave()
                else if (e.key === 'Escape') {
                  setNaming(false)
                  setName('')
                }
              }}
            />
            <button type="button" onClick={commitSave}>
              저장
            </button>
            <button
              type="button"
              className="help-btn"
              onClick={() => {
                setNaming(false)
                setName('')
              }}
            >
              ✕
            </button>
          </span>
        ) : (
          <button type="button" onClick={() => setNaming(true)}>
            {done ? '✓ 저장됨' : '💾 저장'}
          </button>
        )}
        <button type="button" onClick={() => void copyCurrentCode()} title="현재 보드를 코드로 복사">
          {copied ? '✓ 복사됨' : '⬆ 코드 복사'}
        </button>
        <button type="button" onClick={() => setShowSaves(true)}>
          📁 불러오기
        </button>
        <button type="button" onClick={() => reset()} className="danger-outline">
          ↺ 초기화
        </button>
        <button type="button" onClick={() => setHelp(true)} className="help-btn">
          ?
        </button>
      </div>
    </div>
  )
}
