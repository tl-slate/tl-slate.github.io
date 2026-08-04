// ---- Real talent data (tlidb.com/ko SS13 재능) ----
export type Tier = '핵심' | '레전드중위' | '중위' | '하위'

export interface Stat {
  descriptor: string
  value: number
  unit: string // '%' or ''
}

/** 핵심 재능 레벨: 2 = 신 보드(신당 6개), 1 = 그 신 소속 직업 보드(신당 4보드×4=16개) */
export type CoreLevel = 1 | 2

export interface Talent {
  id: string
  god: string
  tier: Tier
  coreLevel?: CoreLevel // 핵심 재능에만 존재
  board?: string // 소속 보드 한글명(예: 기계의 신 / 명사수)
  name: string
  effect: string
  stats: Stat[]
  max: number // 최대 몇 개(포인트)까지: 하위3 / 중위3 / 레전드중위1 / 핵심1
  /** 신격 유효 한도 — 옵션에 "(신격 유효 한도: N)"이 적힌 재능만 갖는 개별 속성. 1이면 복제 불가 */
  divLimit?: number
  pts: number | null
}

export interface TalentDB {
  source: string
  gods: string[]
  labels: Record<string, string>
  tierMax: Record<Tier, number>
  talents: Record<string, Talent[]>
}

// ---- Board / shapes ----
export interface Cell {
  x: number
  y: number
}

export type Category = '일반' | '레전드' | '명왕'
export type Rot = 0 | 1 | 2 | 3

/** 방향형 복제 효과(빛이 된 나방)의 방향. 보드 기준(회전과 무관). */
export type CopyDir = 'up' | 'down' | 'left' | 'right'

/** A slot on a slate: which talent tiers are allowed, and base(고정) vs brand(낙인). */
export interface SlotSpec {
  tiers: Tier[]
  /** tiers에 '핵심'이 있을 때 허용 레벨 제한. 없으면 레벨 무관. */
  coreLevels?: CoreLevel[]
  kind?: 'base' | 'brand'
}

/** A palette piece the player can drop onto the board. */
export interface SlateType {
  key: string
  name: string
  category: Category
  shape: Cell[]
  slots: SlotSpec[]
  note?: string // special option (copy effect) for slates with no talent slots
  /**
   * 놓을 수 있는 방향(회전). 없으면 4방향 전부.
   * 예: 인펙션은 세워서만 놓이므로 [0, 2] (눕히는 rot 1·3 불가).
   */
  rots?: Rot[]
  /**
   * 놓을 수 있는 자리. 없으면 보드 어디든.
   * 명왕 석판은 정해진 자리에만 들어간다(추방=네 모서리, 심판=네 가운데 모서리).
   */
  spots?: { x: number; y: number; rot: Rot }[]
  /** 보드에 놓을 수 있는 최대 개수. 없으면 무제한 */
  limit?: number
  /**
   * 한도를 여러 석판이 공유할 때의 묶음 키(예: 명왕 3종은 통틀어 1개).
   * 지정하면 같은 그룹 석판들의 배치 수를 합쳐서 limit과 비교한다.
   */
  limitGroup?: string
}

/** A placed slate. Shape/slots denormalized so custom shapes just work. */
export interface Placement {
  id: string
  key?: string // SlateType.key — 불러올 때 최신 정의로 다시 맞추는 용도
  name: string
  category: Category
  shape: Cell[]
  slots: SlotSpec[]
  note?: string
  x: number
  y: number
  rot: Rot
  god: string | null
  talents: (string | null)[] // indexed by slot
  /** 빛이 된 나방 전용: 어느 방향 석판을 복제할지(아이템에 한 방향만 붙음) */
  copyDir?: CopyDir
  /**
   * 배치 순번(작을수록 먼저 놓음). 개수 한도 초과 판정에 쓴다.
   * placements 배열 순서는 석판을 잡을 때마다 뒤로 재정렬되므로(겹침 판정용)
   * 클릭만 해도 초과 대상이 바뀌어 버린다 — 그래서 순서를 따로 들고 있는다.
   */
  seq?: number
}

export interface BoardConfig {
  w: number
  h: number
  disabled: string[]
}

export interface SimState {
  board: BoardConfig
  placements: Placement[]
}
