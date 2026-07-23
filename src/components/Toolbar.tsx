import { useState } from 'react'
import { useStore } from '../state/store'

export function Toolbar() {
  const reset = useStore((s) => s.reset)
  const setHelp = useStore((s) => s.setHelp)
  const setShowSaves = useStore((s) => s.setShowSaves)
  const saveCurrent = useStore((s) => s.saveCurrent)

  const [naming, setNaming] = useState(false)
  const [name, setName] = useState('')
  const [done, setDone] = useState(false)

  function commitSave() {
    saveCurrent(name)
    setName('')
    setNaming(false)
    setDone(true)
    setTimeout(() => setDone(false), 1600)
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
        <button type="button" onClick={() => setShowSaves(true)}>
          📁 세팅
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
