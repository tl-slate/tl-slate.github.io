# Torchlight Slate Simulator

토치라이트: 인피니트 **SS13(Afterlight)** 신격의 석판 보드 배치 시뮬레이터. 탱그램식 폴리오미노 석판을 육각 보드에 배치하고 재능을 붙여 스탯을 계산한다. UI·데이터 전부 한글(tlidb.com/ko 기준), 이번 시즌(SS13)만 다룬다.

- 스택: React 19 + Vite + TypeScript + zustand. 타입 체크: `npx tsc -p tsconfig.app.json --noEmit`
- dev: `npm run dev` (localhost:5173) / build: `npm run build`
- GitHub: https://github.com/chanhwuicoco/Torchlight-Slate-Simulator (PRIVATE)
- 배포: **https://tl-slate.vercel.app** (Vercel, main 푸시 시 자동 배포. 구 주소 torchlight-slate-simulator.vercel.app도 유지)
- 커밋 신원: `chanhwuicoco <300696724+chanhwuicoco@users.noreply.github.com>` (회사 메일 금지)

## 구조

- `src/data/slates.ts` — 석판 정의(형태·슬롯·특수옵션 note). 일반 6종(4칸 테트로미노) / 레전드 7종 / 명왕 3종
- `src/engine/` — geometry(회전·절대좌표), board(배치 유효성), tiers(등급 라벨·슬롯 수락), copy(복제 효과), judgment(심판 ×1.7), aggregate(집계), rehydrate(저장분을 최신 정의로 재교정)
- `src/state/store.ts` — zustand 스토어, localStorage(`tl-slate-sim:v5`), 세이브 목록, base64 세팅 코드(exportCode/parseImportCode)
- `src/components/` — BoardView(보드+반응형 스케일+신의 계보 아트), Palette, Inspector(신/재능 선택), TalentCombobox(검색 셀렉터), StatsPanel(집계), Toolbar, SavesModal
- `public/data/talents.json` — 재능 1105개(tlidb 추출). `public/img/l-pedigree*.webp` — 신의 계보 아트 2방향

## 게임 규칙 (사용자 확정 — 함부로 바꾸지 말 것)

- 보드 = 육각 2·4·6·6·4·2칸, 10×10 캔버스에 offset(2,2). 캔버스 안이면 배치 허용, 범위밖/겹침은 빨간 표시만
- 등급: 하위 / 중위 / 레전드중위 / 핵심(1·2레벨) / 명왕은 하위·중위·레전드중위·**절대자**(=데이터상 tier '핵심')
- 핵심 재능: **2레벨 = 신 이름 보드(신당 6개)**, **1레벨 = 그 신 소속 직업 보드(직업당 4개)**. 보드 없는 핵심(제노 프리즘용)은 데이터에서 제외
- 일반(신) 석판 = 고정 2[하위/중위] + 낙인 3[하위/중위/레전드중위]. 재능 풀 = 그 신 소속 **보드 전부**(신 보드 + 직업 보드 4개)
- 재능 최대 개수(하위3/중위3/레전드중위1/핵심1)는 **석판 1장 기준**. 다른 석판이면 같은 재능도 또 적용
- 레전드 슬롯: 추락하는 별빛[하위·하위·하위/중위/레중·중위/레중], 신성의 일각[레중×2], 신의 계보[하/중/레중 ×2 · 중/레중/1렙핵심 · **1/2렙핵심**]. tlidb 표기엔 레전드중위가 빠져 있지만 실제론 들어감
- 명왕 석판(3종, 캐릭터당 1개) = **고정 1(명왕 재능만, 전 등급) + 낙인 3(명왕 제외 6신 하위/중위/레전드중위)**
- **복제 효과 4종**(copy.ts): 빛이 된 나방=선택한 한 방향(copyDir)의 마지막 재능 1줄 / 들불=모든 인접 석판의 마지막 1줄씩 / 우주의 균열=좌우 변에 닿은 석판 **전부**(사용자 확정)의 중위+레중+절대자 / 별들의 고향=인접 석판의 중위만
  - "마지막 재능" = 제일 아래 **채워진** 슬롯. 복사 불가 = 핵심 + **divLimit===1**("신격 유효 한도: 1"이 옵션에 적힌 재능 — 등급 아님, 재능 개별 속성! 레전드중위 215개 중 105개는 한도 없어 복사됨). 불가면 대체 없이 0. 복제의 재복제 없음
  - divLimit===1 제외는 **균열·별들의 고향에도 적용**(복사해도 효과가 없으므로 — 사용자 확정). 절대자·중위·하위엔 한도 표기가 없어 실질 영향은 레중 110개뿐
- **심판(judgment.ts)**: 4슬롯 모두 채우면 활성. ㄱ자 변 사이 연결선 4칸 위 석판의 **수치 스탯 ×1.7 반올림 정수**. 핵심 재능만 제외하고 전부 적용(레전드 석판 포함). 인펙션(낙인 20% 투영)은 미반영
- 집계(aggregate.ts): 섹션 = 핵심(맨 위) → 합산 스탯(원본만, 텍스트 앞·수치 뒤 나열형, 수치 없는 재능도 같이 나열) → 복제 효과(줄 목록 + 복제 합산 별도). 명왕 적용 칩은 줄 맨 앞

## 데이터 파이프라인 (tlidb.com/ko)

서버렌더 HTML을 Node fetch+정규식으로 파싱(Playwright 불필요). 소스 페이지: `Divinity_Slate`(재능 1163개 아이템, `<div class="col">` 블록, `data-id`), `Nether_Kings_Divinity`(명왕 절대자 18개 — `data-talent-id` + `<hr/>` 뒤 div 줄), `Talent`(직업→신 매핑 "…의 계승자/사도")

- `scripts/refresh-effects.cjs` — effect/stats 재추출. 규칙: ①줄바꿈 보존(<br/>→\n, UI는 pre-line) ②스탯 인정 = **부호(+/-) 있는 text-mod 수치** 또는 **줄 끝 무부호 수치**(뒤에 문장 없을 때, 예: "…크리티컬 대미지 0.5%") ③descriptor = 줄 단위 전체 문맥. 툴팁(data-bs-title)은 엔티티 인코딩이라 태그 제거 → 디코드 순서면 안전. divLimit는 안 건드림
- `scripts/write-div-limit.cjs` — "(신격 유효 한도: N)" 표기 추출 → `divLimit` 필드(242개: 핵심 132 + 레중 110)
- 1105 = tlidb 1163 − 제외 58(새로운 신 36 + 보드 없는 미분류 22)
- 아이콘 CDN은 Referer 헤더 필요. 신의 계보 = `UI_MI_TalantNG_Gold_ZZ1_0/1_Icon_112.webp` (알파 bbox x14 y38 87×89를 3×3칸에 매핑, rot0/2→_0, rot1/3→_1)

## UI 관례

- 헤더 타이틀은 한글 "석판 시뮬레이터", 웹 탭 타이틀만 영문. UI에 Konglish 음역 금지(영어 기술 용어는 원어 그대로)
- 버튼 Y2K 베벨 스타일, 딥그레이-블랙 테마(남색·보라 금지, 명왕 보라 포인트 제외)
- 보드는 transform scale 반응형(포인터 변환은 rect.width/board.w). `.board { flex-shrink: 0 }` 필수
- 석판 둘레 외곽선 = 자기 셀 아닌 변에만 2px inset 심. 상태 링(good/bad)은 ::after(z7)
- 콤보박스: blur 시 닫기(onBlur), 화살표는 onMouseDown(포커스 꼬임 방지). 보드/팔레트 pointerdown 시 activeElement.blur() (단축키 먹통 방지)
- 삭제 = Del/우클릭/✕ (Backspace 금지)

## 남은 할일 / 미확인

- 인펙션(낙인 재능 20% 투영)·추방 효과: **사용자가 게임에서 재확인 예정** — 확정 전까지 계산 반영 보류
- 우주의 균열 복제 연쇄 여부 미확인(현재 연쇄 없음으로 구현. 좌우 다중 석판 전부 복제는 사용자 확정 완료)

확정 완료(2026-07-29): 추방 대각선 비연결 형태 맞음 / 구 도메인(torchlight-slate-simulator.vercel.app)은 유지
