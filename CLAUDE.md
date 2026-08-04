# Torchlight Slate Simulator

토치라이트: 인피니트 **SS13(Afterlight)** 신격의 석판 보드 배치 시뮬레이터. 탱그램식 폴리오미노 석판을 육각 보드에 배치하고 재능을 붙여 스탯을 계산한다. UI·데이터 전부 한글(tlidb.com/ko 기준), 이번 시즌(SS13)만 다룬다.

- 스택: React 19 + Vite + TypeScript + zustand. 타입 체크: `npx tsc -p tsconfig.app.json --noEmit`
- dev: `npm run dev` (localhost:5173) / build: `npm run build`
- GitHub: https://github.com/chanhwuicoco/Torchlight-Slate-Simulator (PRIVATE)
- 배포: **https://tl-slate.vercel.app** (Vercel, main 푸시 시 자동 배포. 구 주소 torchlight-slate-simulator.vercel.app도 유지)
- 커밋 신원: `chanhwuicoco <300696724+chanhwuicoco@users.noreply.github.com>` (회사 메일 금지)

## 구조

- `src/data/slates.ts` — 석판 정의(형태·슬롯·특수옵션 note). 일반 6종(4칸 테트로미노) / 레전드 7종 / 명왕 3종
- `src/engine/` — geometry(회전·절대좌표), board(배치 유효성), tiers(등급 라벨·슬롯 수락), copy(복제 효과), judgment(심판 ×1.7), infection(인펙션 ×0.2 투영), limits(석판 개수 한도), aggregate(집계), rehydrate(저장분을 최신 정의로 재교정)
- `src/state/store.ts` — zustand 스토어, localStorage(`tl-slate-sim:v5`), 세이브 목록, base64 세팅 코드(exportCode/parseImportCode)
- `src/components/` — BoardView(보드+반응형 스케일+신의 계보 아트), Palette, Inspector(신/재능 선택), TalentCombobox(검색 셀렉터), StatsPanel(집계), Toolbar, SavesModal
- `public/data/talents.json` — 재능 1105개(tlidb 추출). `public/img/l-pedigree*.webp` — 신의 계보 아트 2방향

## 게임 규칙 (사용자 확정 — 함부로 바꾸지 말 것)

- 보드 = 육각 2·4·6·6·4·2칸, 10×10 캔버스에 offset(2,2). 캔버스 안이면 배치 허용, 범위밖/겹침은 빨간 표시만
- 등급: 하위 / 중위 / 레전드중위 / 핵심(1·2레벨) / 명왕은 하위·중위·레전드중위·**절대자**(=데이터상 tier '핵심')
- 핵심 재능: **2레벨 = 신 이름 보드(신당 6개)**, **1레벨 = 그 신 소속 직업 보드(직업당 4개)**. 보드 없는 핵심(제노 프리즘용)은 데이터에서 제외
- 일반(신) 석판 = 고정 2[하위/중위] + 낙인 3[하위/중위/레전드중위]. 재능 풀 = 그 신 소속 **보드 전부**(신 보드 + 직업 보드 4개)
- 재능 최대 개수(하위3/중위3/레전드중위1/핵심1)는 **석판 1장 기준**. 다른 석판이면 같은 재능도 또 적용
- **석판 자체의 보드 내 최대 개수(강제, `src/engine/limits.ts`)**: 빛이 된 나방 3 / 들불 번지는 순간 1 / 추락하는 별빛 3 / 신성의 일각 3 / **신의 계보 1** / 명왕 3종 통틀어 1(limitGroup 'nether'). 우주의 균열·별들의 고향은 tlidb 한·영 양쪽에 표기가 없어 무제한, 일반 석판도 무제한
  - 출처: **석판별 전용 페이지**(`/ko/Sparks_of_Moth_Fire`, `/When_Sparks_Set_the_Prairie_Ablaze`, `/Fallen_Starlight`, `/A_Corner_of_Divinity`, `/Pedigree_of_Gods`, `/Space_Rift`, `/Residence_of_Stars`). Divinity_Slate 목록 페이지엔 이 줄이 빠져 있어 거기만 보면 "표기 없음"으로 오판한다
  - 표기가 통일돼 있지 않다: `(해당 신격의 석판 유효 최대치: N)` / `(해당 신격의 석판 유효 한도:N)`(콜론 뒤 공백 없음) / `(신격의 석판 유효 한도: N)` / 명왕은 `(해당 신격의 석판 최대 적용: N)`. **재능의 `(신격 유효 한도: 1)`("석판"이 없음)과 혼동 금지 — 그건 divLimit다**
  - **배치는 막지 않는다**(사용자 결정 — 겹침·범위밖과 같은 정책). 한도를 넘긴 석판은 **늦게 놓은 쪽**이 `overLimitIds`에 잡혀 ①보드에 빨간 테두리 + 회색조 + "제한 초과 · 미적용" 배지(`.piece.over`, `.piece-over`) ②Inspector 경고(`.insp-over`) ③합산 패널 상단 안내(`.stats-over`)로 표시된다
  - **집계에서는 아예 없는 셈 친다** — aggregate가 맨 앞에서 초과분을 걸러낸 state로 복제·투영·심판까지 전부 계산하므로, 초과된 복제 석판은 복제하지 않고 초과된 심판은 부스트를 주지 않는다. 팔레트는 `N/N` 배지로 알리기만 하고 드래그는 그대로 허용
  - ⚠️ 순서 기준은 **`Placement.seq`(배치 순번)**이고 `placements` 배열 순서가 **아니다**. 배열은 석판을 잡을 때마다 끝으로 재정렬되므로(겹침 판정용) 배열 순서로 판정하면 **클릭만 해도 초과 표시가 그 석판으로 옮겨간다**(실제 버그였음). seq는 `placeAt`에서 max+1로 부여하고, 없는 예전 저장분은 `rehydrate`가 배열 인덱스로 채운다
- **수치는 전부 반올림 정수** — 스킬 레벨도 소수점이 남지 않는다(사용자 확정). "공격 스킬 레벨 +1"의 인펙션 20% 투영 = 0.2 → 0이라 효과 없음
- 레전드 슬롯: 추락하는 별빛[하위·하위·하위/중위/레중·중위/레중], 신성의 일각[레중×2], 신의 계보[하/중/레중 ×2 · 중/레중/1렙핵심 · **1/2렙핵심**]. tlidb 표기엔 레전드중위가 빠져 있지만 실제론 들어감
- 명왕 석판(3종, 캐릭터당 1개) = **고정 1(명왕 재능만, 전 등급) + 낙인 3(명왕 제외 6신 하위/중위/레전드중위)**
- **복제 효과 4종**(copy.ts): 빛이 된 나방=선택한 한 방향(copyDir)의 마지막 재능 1줄 / 들불=모든 인접 석판의 마지막 1줄씩 / 우주의 균열=좌우 변에 닿은 석판 **전부**(사용자 확정)의 중위+레중+절대자 / 별들의 고향=인접 석판의 중위만
  - "마지막 재능" = 제일 아래 **채워진** 슬롯. 복사 불가 = 핵심 + **divLimit===1**("신격 유효 한도: 1"이 옵션에 적힌 재능 — 등급 아님, 재능 개별 속성! 레전드중위 215개 중 105개는 한도 없어 복사됨). 불가면 대체 없이 0. 복제의 재복제 없음
  - divLimit===1 제외는 **균열·별들의 고향에도 적용**(복사해도 효과가 없으므로 — 사용자 확정). 절대자·중위·하위엔 한도 표기가 없어 실질 영향은 레중 110개뿐
- **심판(judgment.ts)**: 4슬롯 모두 채우면 활성. ㄱ자 변 사이 연결선 4칸 위 석판의 **수치 스탯 ×1.7 반올림 정수**. 핵심 재능만 제외하고 전부 적용(레전드 석판 포함)
- **인펙션(infection.ts)**: 4슬롯 모두 채우면 활성. **낙인 슬롯 3개의 재능만**(고정 슬롯 명왕 재능은 제외) 직접 인접한 모든 석판에 **20% 강도(×0.2) 투영**, 반올림 정수. divLimit===1 재능은 투영 제외(중복이라 무효 — 복제와 동일 원칙). 고정 슬롯에 "인펙션 효과 활성화 시, 모든 X에 대해 투영 효과 +N%" 절대자가 박히면 대상 X에 한해 계수 ×(1+N/100) — X ∈ 신격의 석판(전부)/비레전드/신의 계보/추락하는 별빛/신성의 일각. 투영받은 줄은 **대상 석판의 심판 보정도 함께** 받는다(0.2×1.7=0.34). 투영분은 재복제·재투영 안 됨
- **추방(nk-banish)**: 스킬 계열별 전투 발동형 효과 8종(Demolisher·Steep Strike·Shadow Strike·Spell Burst·Ill Omen·Quagmire·Projection·Provision) — 보드 스탯 계산과 무관해서 표시만 함(계산할 것 없음, 사용자 확인)
- 집계(aggregate.ts): 섹션 = 핵심(맨 위) → 합산 스탯(원본만, 텍스트 앞·수치 뒤 나열형, 수치 없는 재능도 같이 나열) → 복제 효과(줄 목록 + 복제 합산 별도) → 인펙션 투영(줄 목록 + 투영 합산 별도). 명왕 적용 칩은 줄 맨 앞(심판 보정 표시용이라 인펙션 합산에는 안 붙임 — 전 줄이 계수 적용이라 무의미)

## 데이터 파이프라인 (tlidb.com/ko)

서버렌더 HTML을 Node fetch+정규식으로 파싱(Playwright 불필요). 소스 페이지: `Divinity_Slate`(재능 1163개 아이템, `<div class="col">` 블록, `data-id`), `Nether_Kings_Divinity`(명왕 절대자 18개 — `data-talent-id` + `<hr/>` 뒤 div 줄), `Talent`(직업→신 매핑 "…의 계승자/사도")

- `scripts/refresh-effects.cjs` — effect/stats 재추출. 규칙: ①줄바꿈 보존(<br/>→\n, UI는 pre-line) ②스탯 인정 = **부호(+/-) 있는 text-mod 수치** 또는 **줄 끝 무부호 수치**(뒤에 문장 없을 때, 예: "…크리티컬 대미지 0.5%") ③descriptor = 줄 단위 전체 문맥. 툴팁(data-bs-title)은 엔티티 인코딩이라 태그 제거 → 디코드 순서면 안전. divLimit는 안 건드림
- `scripts/write-div-limit.cjs` — "(신격 유효 한도: N)" 표기 추출 → `divLimit` 필드(242개: 핵심 132 + 레중 110)
- 1105 = tlidb 1163 − 제외 58(새로운 신 36 + 보드 없는 미분류 22)
- 아이콘 CDN은 Referer 헤더 필요. 신의 계보 = `UI_MI_TalantNG_Gold_ZZ1_0/1_Icon_112.webp` (알파 bbox x14 y38 87×89를 3×3칸에 매핑, rot0/2→_0, rot1/3→_1)

## UI 관례

- 헤더 타이틀은 한글 "석판 시뮬레이터", 웹 탭 타이틀만 영문. UI에 Konglish 음역 금지(영어 기술 용어는 원어 그대로)
- 버튼은 플랫에 가까운 딥그레이-블랙 테마(남색·보라 금지, 명왕 보라 포인트 제외). 원래 하드스톱 그라디언트+다중 인셋 섀도의 Y2K 베벨이었는데 "촌스럽다"는 피드백으로 2026-08-04 명암을 크게 낮춤 — 새 버튼 스타일 추가할 때 이 하드스톱 그라디언트로 되돌리지 말 것
- 보드는 transform scale 반응형(포인터 변환은 rect.width/board.w). `.board { flex-shrink: 0 }` 필수
- 석판 둘레 외곽선 = 자기 셀 아닌 변에만 2px inset 심. 상태 링(good/bad)은 ::after(z7)
  - 초록(good)=`selectedId === p.id`(우측 인스펙터에 뜨는 것과 동일 기준)이고 유효할 때, 빨강(bad)=`invalidPlacements`가 잡은 무효(겹침 등)일 때 — **선택 여부와 무관하게 항상** 표시(고쳐야 할 문제라서). 예전엔 `Placement.confirmed` 별도 플래그로 관리했는데, `beginDragNew`/`beginDragMove`가 `select()`를 안 거치고 selectedId를 직접 바꿔서 이전 석판의 플래그가 안 지워지고 초록이 남는 버그가 있었음(사용자 리포트로 발견, 2026-08-04 제거). 새 상태를 추가로 만들지 말고 selectedId에서 파생시킬 것
- 콤보박스: blur 시 닫기(onBlur), 화살표는 onMouseDown(포커스 꼬임 방지). 보드/팔레트 pointerdown 시 activeElement.blur() (단축키 먹통 방지)
- 삭제 = Del/우클릭/✕ (Backspace 금지)
- 도움말 등 안내 문구에 **게임 자체의 상식은 설명하지 않는다**(석판 칸수·보드 모양처럼 게임 화면 보면 바로 보이는 것). 사용자는 게임을 켜놓고 이 도구를 쓰므로, 안내는 **이 도구의 조작법**(드래그·저장·불러오기 등)에만 집중한다 — 2026-08-04 사용자 확정

## 남은 할일 / 미확인

- 우주의 균열 복제 연쇄 여부 미확인(현재 연쇄 없음으로 구현. 좌우 다중 석판 전부 복제는 사용자 확정 완료)
- (심판×인펙션 동시 적용은 **명왕 석판이 캐릭터당 1개뿐이라 실전에서 발생 불가** — 사용자 확정. 코드엔 일관성 차원에서 곱셈 경로만 남겨둠)
- tlidb 원문 참고처: `https://tlidb.com/ko/Nether_Kings_Divinity#NetherKingsDivinity` — 명왕 3종 효과 전문(영문 패치노트 섹션)이 여기 다 있음

확정 완료(2026-07-29): 추방 대각선 비연결 형태 맞음 / 구 도메인(torchlight-slate-simulator.vercel.app)은 유지 / 추방은 전투 발동형이라 계산 대상 아님
