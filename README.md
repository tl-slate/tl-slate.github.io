# Nether King Slate Planner

Torchlight: Infinite **SS13 (Afterlight)** 신격의 석판(Divinity Slate) 보드 배치 플래너.
신의 조각상 격자에 6신 + 명왕(Nether King)의 석판을 배치·회전하고, 각 슬롯에 실제 게임 탈렌트를
채워 넣으면 인접·인펙션 규칙을 반영한 합산 스탯을 실시간으로 보여준다.

## 기능

- **보드 배치**: 폴리오미노 형태의 석판을 드래그/회전(R)으로 배치, 충돌·경계 판정, 구멍(hole) 편집
- **실데이터 재능(한글)**: 신·등급(핵심 재능 / 하위 재능)별로 실제 SS13 재능을 슬롯에 할당 (tlidb 한글 기준)
- **시즌 효과**
  - **Contamination** — 명왕의 신격이 인접 석판에 자기 탈렌트를 투영(총합 반영 토글 가능)
  - **Judgment** — 연결된 명왕 석판 체인 및 인접 강화 석판 표시
  - **Banishment** — 인접/고립 석판 수 기반 레이아웃 정보
- **집계**: 같은 접사 수치 합산(+18% & +9% → +27% ×2), 고유 효과 분리, 신별 분포
- **저장/공유**: localStorage 자동 저장 + URL 공유 코드(`#...`) 왕복

## 실행

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # 타입 체크 + 프로덕션 빌드 -> dist/
npm run preview
```

## 데이터

재능 데이터는 [tlidb.com/ko](https://tlidb.com/ko) 의 SS13 재능 페이지(신별 6개 + 명왕)에서
추출한 **한글 실데이터** (`public/data/talents.json`, 재능 285개). 스키마:

```
talents[god] = [{ id, god, tier:'핵심 재능'|'하위 재능', name, effect, stats:[{descriptor,value,unit}] }]
```

재추출 절차는 `scripts/build-data.mjs` 주석 참고(브라우저 DOM 파싱 권장).

> 참고: 석판의 정확한 **형태·보드 모양**과 심판/추방의 세부 수치는 공식 공개가 없어, 형태·보드는
> 앱에서 편집 가능한 근사치로 두었다. 배치·인접·인펙션·스탯 합산은 레이아웃으로부터 정확히 계산된다.

## 구조

```
src/
  types.ts              데이터/보드 모델 타입
  data/slates.ts        석판 카탈로그(신 메타 + 형태 + 슬롯)
  engine/
    geometry.ts         폴리오미노 회전/정규화/인접
    board.ts            점유/충돌/인접 그래프
    aggregate.ts        접사 합산 + 인펙션 + 심판/추방 계산
    share.ts            상태 <-> 공유 코드 인코딩
  state/store.ts        zustand 스토어(배치/할당/영속화)
  components/           BoardView / Palette / Inspector / StatsPanel / Toolbar / HelpModal
scripts/build-data.mjs  torchcodex -> public/data/talents.json 재생성
```

기술 스택: React 19 + Vite + TypeScript + zustand.
