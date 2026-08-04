import { useEffect, useMemo } from 'react'
import { BoardView } from './components/BoardView'
import { DragLayer } from './components/DragLayer'
import { HelpModal } from './components/HelpModal'
import { Inspector } from './components/Inspector'
import { Palette } from './components/Palette'
import { SavesModal } from './components/SavesModal'
import { StatsPanel } from './components/StatsPanel'
import { Toolbar } from './components/Toolbar'
import { VisitorCount } from './components/VisitorCount'
import { aggregate } from './engine/aggregate'
import { useStore } from './state/store'

function isEditable(el: EventTarget | null): boolean {
  const t = el as HTMLElement | null
  if (!t) return false
  return t.tagName === 'INPUT' || t.tagName === 'SELECT' || t.tagName === 'TEXTAREA' || t.isContentEditable
}

export default function App() {
  const loading = useStore((s) => s.loading)
  const error = useStore((s) => s.error)
  const db = useStore((s) => s.db)
  const state = useStore((s) => s.state)
  const loadDB = useStore((s) => s.loadDB)

  useEffect(() => {
    void loadDB()
  }, [loadDB])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (isEditable(e.target)) return
      const s = useStore.getState()
      if (e.key === 'r' || e.key === 'R') {
        if (s.drag) s.rotateDrag()
        else if (s.selectedId) s.rotatePlacement(s.selectedId)
      } else if (e.key === 'Escape') {
        s.cancelDrag()
        s.select(null)
      } else if (e.key === 'Delete') {
        if (s.selectedId) {
          e.preventDefault()
          s.removePlacement(s.selectedId)
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const result = useMemo(() => (db ? aggregate(state, db) : null), [db, state])

  return (
    <div className="app">
      <header className="app-header">
        <div className="brand">
          <span className="brand-mark">◆</span>
          <div className="brand-title">
            <h1>석판 시뮬레이터</h1>
            <span className="brand-sub">
              토치라이트 인피니트
              <br />
              SS13 애프터라이트
            </span>
          </div>
        </div>
        <Toolbar />
        <VisitorCount />
      </header>

      {loading && <div className="loading">SS13 재능 데이터 불러오는 중…</div>}
      {error && <div className="error">데이터 로드 실패: {error}</div>}

      {!loading && !error && result && (
        <main className="layout">
          <aside className="col-palette">
            <Palette />
          </aside>
          <section className="col-board">
            <BoardView />
            <p className="board-hint">
              석판을 보드로 <b>드래그</b>해서 배치하세요. <kbd>R</kbd> 회전, 배치한 석판은 <b>드래그로 이동</b>,{' '}
              <b>우클릭</b>·보드 밖 드래그·<kbd>Del</kbd>로 삭제.
            </p>
          </section>
          <aside className="col-side">
            <Inspector />
            <StatsPanel result={result} />
          </aside>
        </main>
      )}

      <HelpModal />
      <SavesModal />
      <DragLayer />
    </div>
  )
}
