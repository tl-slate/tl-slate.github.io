import { useState } from 'react'
import { createPortal } from 'react-dom'
import { exportCode, useStore } from '../state/store'

export function Toolbar() {
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

  function closeNaming() {
    setNaming(false)
    setName('')
  }

  return (
    <div className="toolbar">
      <div className="tb-group tb-right">
        <button type="button" onClick={() => setNaming(true)}>
          {done ? '✓ 저장됨' : '💾 저장'}
        </button>
        <button type="button" onClick={() => void copyCurrentCode()} title="현재 보드를 코드로 복사">
          {copied ? '✓ 복사됨' : '⬆ 코드 복사'}
        </button>
        <button type="button" onClick={() => setShowSaves(true)}>
          📁 불러오기
        </button>
        <button type="button" onClick={() => setHelp(true)} className="help-btn">
          ?
        </button>
      </div>

      {naming &&
        createPortal(
          // 헤더에 backdrop-filter가 걸려 있어 position:fixed 자식의 containing block이
          // 뷰포트가 아니라 헤더 박스가 돼버린다 — body로 직접 포탈링해 피한다.
          <div className="modal-backdrop" onClick={closeNaming}>
            <div className="modal save-name-modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-head">
                <h2>세팅 저장</h2>
                <button type="button" onClick={closeNaming}>
                  ✕
                </button>
              </div>
              <div className="modal-body">
                <input
                  type="text"
                  autoFocus
                  placeholder="세팅 이름…"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') commitSave()
                    else if (e.key === 'Escape') closeNaming()
                  }}
                />
                <button type="button" className="primary" onClick={commitSave}>
                  저장
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  )
}
