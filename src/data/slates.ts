import type { Category, Cell, SlateType, SlotSpec, Tier } from '../types'

const c = (...pairs: [number, number][]): Cell[] => pairs.map(([x, y]) => ({ x, y }))
const S = (...tiers: Tier[]): SlotSpec => ({ tiers, kind: 'base' }) // 고정
const B = (...tiers: Tier[]): SlotSpec => ({ tiers, kind: 'brand' }) // 낙인(랜덤)

// 모든 신격의 석판 공통: 고정 슬롯 뒤에 낙인 재능 최대 3개[하위/중위/레전드중위]가 붙는다.
const BRAND3: SlotSpec[] = [B('하위', '중위', '레전드중위'), B('하위', '중위', '레전드중위'), B('하위', '중위', '레전드중위')]

// 일반(신) 석판: 고정 재능 2개[하위/중위] + 낙인 3개.
const GOD_SLOTS: SlotSpec[] = [S('하위', '중위'), S('하위', '중위'), ...BRAND3]

// 일반 슬레이트: 4칸. tlidb 신격 석판 아이콘(O1/T1/L1/L2/Z1/Z2)을 실제로 읽어 형태 반영.
const NORMAL: SlateType[] = [
  { key: 'n-O', name: 'O (정사각)', category: '일반', shape: c([0, 0], [1, 0], [0, 1], [1, 1]), slots: GOD_SLOTS },
  { key: 'n-T', name: 'T', category: '일반', shape: c([0, 0], [1, 0], [2, 0], [1, 1]), slots: GOD_SLOTS },
  { key: 'n-J', name: 'J', category: '일반', shape: c([0, 0], [0, 1], [1, 1], [2, 1]), slots: GOD_SLOTS }, // L1
  { key: 'n-L', name: 'L', category: '일반', shape: c([2, 0], [0, 1], [1, 1], [2, 1]), slots: GOD_SLOTS }, // L2
  { key: 'n-S', name: 'S', category: '일반', shape: c([0, 0], [0, 1], [1, 1], [1, 2]), slots: GOD_SLOTS }, // Z1
  { key: 'n-Z', name: 'Z', category: '일반', shape: c([1, 0], [0, 1], [1, 1], [0, 2]), slots: GOD_SLOTS }, // Z2
]

// 전설 슬레이트: "레전드 장비" 탭(tlidb Divinity_Slate)의 실제 이름·특수 옵션.
// 각 석판은 고유 이름 + 특수 옵션(복제 효과) 또는 재능 슬롯 구성을 가진다.
const LEGEND: SlateType[] = [
  {
    key: 'l-moth',
    name: '빛이 된 나방',
    category: '레전드',
    shape: c([0, 0]), // O1 · 1칸
    slots: [],
    limit: 3,
    // tlidb 원문: 위쪽/왼쪽/아래쪽/오른쪽 4종이 각각 별도 옵션으로 존재(한 방향만 굴러 붙음).
    // 마지막 재능 한 줄 = 제일 아래 채워진 재능. 핵심·신격 한도 1 재능은 복제 불가(사용자 확인).
    note: '위쪽·왼쪽·아래쪽·오른쪽 중 한 방향 석판의 마지막 재능 한 줄을 해당 석판으로 복제한다. 핵심 재능과 신격 한도 1 재능은 복제할 수 없다.',
  },
  {
    key: 'l-prairie',
    name: '들불 번지는 순간',
    category: '레전드',
    shape: c([0, 0]), // O3 · 1칸
    slots: [],
    limit: 1,
    note: '모든 인접 석판의 마지막 재능 한 줄을 해당 석판으로 복제한다. 핵심 재능과 신격 한도 1 재능은 복제할 수 없다.',
  },
  {
    key: 'l-starlight',
    name: '추락하는 별빛',
    category: '레전드',
    shape: c([0, 0], [1, 0]), // I1 · 2칸
    limit: 3,
    // tlidb 표기: <하위><하위><하위 또는 중위><중위> — 이 중위 칸에는 레전드 중위도 들어간다.
    slots: [S('하위'), S('하위'), S('하위', '중위', '레전드중위'), S('중위', '레전드중위')],
  },
  {
    key: 'l-corner',
    name: '신성의 일각',
    category: '레전드',
    shape: c([0, 0], [0, 1], [1, 1]), // V1 · 3칸
    limit: 3,
    slots: [S('레전드중위'), S('레전드중위')],
  },
  {
    key: 'l-rift',
    name: '우주의 균열',
    category: '레전드',
    shape: c([0, 0], [0, 1], [0, 2], [0, 3], [0, 4], [0, 5]), // II1 · 세로 6칸
    slots: [],
    // tlidb 원문: 왼쪽/오른쪽이 각각 별도 옵션 줄로 존재.
    note: '왼쪽 석판의 중위 재능, 레전드 중위 재능과 절대자 명왕 재능을 해당 석판으로 복제한다. 오른쪽 석판에 대해서도 동일한 옵션이 있다.',
  },
  {
    key: 'l-pedigree',
    name: '신의 계보',
    category: '레전드',
    shape: c([0, 0], [1, 0], [0, 1], [1, 1], [2, 1], [1, 2], [2, 2]), // ZZ1 · 7칸
    limit: 1, // tlidb /ko/Pedigree_of_Gods: "(해당 신격의 석판 유효 최대치: 1)"
    // tlidb 원문: <하위 또는 중위><하위 또는 중위><중위 또는 1레벨 핵심><2레벨 핵심>
    // (중위 칸에는 레전드 중위도 포함되고, 마지막 칸에는 1레벨 핵심도 들어간다 — 사용자 확인)
    slots: [
      S('하위', '중위', '레전드중위'),
      S('하위', '중위', '레전드중위'),
      { tiers: ['중위', '레전드중위', '핵심'], coreLevels: [1], kind: 'base' },
      { tiers: ['핵심'], coreLevels: [1, 2], kind: 'base' },
    ],
  },
  {
    key: 'l-stars',
    name: '별들의 고향',
    category: '레전드',
    shape: c([2, 0], [0, 1], [1, 1], [2, 1], [1, 2], [2, 2], [3, 2], [1, 3]), // LL1 · 8칸
    slots: [],
    note: '인접 석판의 중위 재능을 해당 석판으로 복제한다. 레전드 중위 재능은 복제할 수 없다.',
  },
]

// 명왕 석판 슬롯(사용자 확인): 고정 1개 = 명왕 재능만(전 등급, 절대자 포함).
// 낙인(랜덤) 3개 = 명왕 제외 6신 재능의 하위/중위/레전드중위. 풀 분리는 Inspector poolFor가 kind로 판단.
const NK_FIXED: SlotSpec = { tiers: ['하위', '중위', '레전드중위', '핵심'], kind: 'base' }
const NK_BRAND = (): SlotSpec => ({ tiers: ['하위', '중위', '레전드중위'], kind: 'brand' })
const NK_SLOTS: SlotSpec[] = [NK_FIXED, NK_BRAND(), NK_BRAND(), NK_BRAND()]

// 명왕 신규 석판(전설급). 3종, 형태 전부 다름. tlidb Devilblock 아이콘에서 읽음.
// 캐릭터당 명왕 석판은 3종 통틀어 1개(사용자 확정) — limitGroup으로 묶어 합산 한도를 건다.
const NK_LIMIT = { limit: 1, limitGroup: 'nether' } as const

const NETHER_SLATES: SlateType[] = [
  {
    key: 'nk-judgment',
    name: '명왕의 신격: 심판',
    category: '명왕',
    shape: c([0, 0], [3, 0], [3, 3]), // shenpan · 사이 2칸 빈 ㄱ자 (모서리 배치)
    ...NK_LIMIT,
    slots: NK_SLOTS,
    // tlidb Nether_Kings_Divinity: "Divinity Slates on links between Divinities have 70% increased affix effect."
    note: '심판: 슬롯을 모두 채우면 활성화 — 신격 조각 사이 연결선 상의 신격의 석판은 옵션 효과 계수 +70%. 캐릭터당 명왕 석판 1개.',
  },
  {
    key: 'nk-contam',
    name: '명왕의 신격: 인펙션',
    category: '명왕',
    shape: c([0, 0], [0, 1], [0, 2]), // qinran · 세로 3
    ...NK_LIMIT,
    slots: NK_SLOTS,
    // tlidb: "Existing Brand Talents … are projected at 20% strength to all Slates directly adjacent to the Divinity."
    note: '인펙션: 슬롯을 모두 채우면 활성화 — 이 석판에 새겨진 낙인 재능을 직접 인접한 모든 석판에 20% 강도로 투영한다. 캐릭터당 명왕 석판 1개.',
  },
  {
    key: 'nk-banish',
    name: '명왕의 신격: 추방',
    category: '명왕',
    shape: c([0, 0], [1, 1], [2, 2]), // fangzhu · 대각선 3
    ...NK_LIMIT,
    slots: NK_SLOTS,
    // tlidb: Demolisher / Steep Strike / Shadow Strike 계열별 전투 효과 3종 — 보드 배치 계산과 무관.
    note: '추방: 슬롯을 모두 채우면 활성화 — 스킬 계열별(Demolisher·Steep Strike·Shadow Strike·Spell Burst·Ill Omen·Quagmire·Projection·Provision) 전투 특수 효과를 부여한다(전투 발동형이라 보드 계산과 무관). 캐릭터당 명왕 석판 1개.',
  },
]

export const SHAPE_LIBRARY: SlateType[] = [...NORMAL, ...LEGEND, ...NETHER_SLATES]

export const CATEGORY_COLOR: Record<Category, string> = {
  일반: '#5a7fa5',
  레전드: '#c9932f',
  명왕: '#8368d1',
}

// ---- Gods (for talent assignment) ----
export interface GodMeta {
  god: string
  label: string
  color: string
}

// 신 분류(선택기)는 6신만. 명왕은 별도(명왕 석판 전용).
export const GODS: GodMeta[] = [
  { god: 'Might', label: '힘의 신', color: '#c0392b' },
  { god: 'War', label: '전쟁의 신', color: '#d1691f' },
  { god: 'Hunting', label: '사냥의 여신', color: '#2a9d5a' },
  { god: 'Knowledge', label: '지식의 여신', color: '#2b7fc0' },
  { god: 'Machines', label: '기계의 신', color: '#159b86' },
  { god: 'Deception', label: '기만의 여신', color: '#8e44ad' },
]

export const NETHER_META: GodMeta = { god: 'Nether King', label: '명왕', color: '#8368d1' }

const GOD_BY_KEY = new Map([...GODS, NETHER_META].map((g) => [g.god, g]))
export const godMeta = (god: string | null): GodMeta | null => (god ? GOD_BY_KEY.get(god) ?? null : null)
