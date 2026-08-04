import { useStore } from '../state/store'

export function HelpModal() {
  const show = useStore((s) => s.showHelp)
  const setHelp = useStore((s) => s.setHelp)
  const db = useStore((s) => s.db)
  if (!show) return null
  const total = db ? db.gods.reduce((a, g) => a + (db.talents[g]?.length ?? 0), 0) : 0
  return (
    <div className="modal-backdrop" onClick={() => setHelp(false)}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>석판 시뮬레이터</h2>
          <button type="button" onClick={() => setHelp(false)}>
            ✕
          </button>
        </div>
        <div className="modal-body">
          <p>
            토치라이트: 인피니트 <b>SS13(애프터라이트)</b> 신격의 석판 보드를 짜는 도구입니다. 보드는 실제
            조각상 모양(위에서부터 2·4·6·6·4·2칸)이고, 석판을 배치·회전해 배치를 맞춘 뒤 각 석판에 신과 재능을
            붙일 수 있습니다.
          </p>

          <h3>조작</h3>
          <ul>
            <li>
              왼쪽 팔레트의 석판을 보드로 <b>드래그</b>해서 배치합니다. <kbd>R</kbd> 로 회전.
            </li>
            <li>배치한 석판은 <b>드래그로 이동</b>합니다.</li>
            <li>
              삭제: 석판 <b>우클릭</b>, <b>보드 밖으로 드래그</b>, 선택 후 <kbd>Del</kbd> 또는 ✕ 버튼.
            </li>
            <li>석판을 클릭하면 오른쪽에서 신을 고르고 재능을 붙일 수 있습니다.</li>
            <li>
              <b>💾 저장</b> 으로 현재 배치를 이름 붙여 저장하고, <b>⬆ 코드 복사</b> 로 지금 배치를 코드로 복사하고,{' '}
              <b>📁 불러오기</b> 에서 저장한 세팅을 불러오거나 코드를 붙여넣어 가져옵니다.
            </li>
          </ul>

          <h3>석판 모양</h3>
          <p className="muted">
            일반 석판은 4칸, 레전드 석판은 1·2·3·6·7·8칸 등 다양하고, 명왕 석판은 3종의 특수 형태입니다. 게임의
            석판 모양은 공개 데이터가 없어 아이콘 이미지를 읽어 반영했습니다.
          </p>

          <h3>재능 데이터</h3>
          <p className="muted">
            재능은 tlidb.com 한글 SS13 데이터입니다{total ? ` (재능 ${total}개).` : '.'} 하위 재능의 수치는
            합산되고, 명명(핵심) 재능은 전체 효과가 나열됩니다. 붙는 옵션의 정확성은 직접 확인하세요.
          </p>
        </div>
      </div>
    </div>
  )
}
