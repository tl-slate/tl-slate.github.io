import type { SlotSpec, Talent } from '../types'

/** 핵심 재능은 1레벨(직업 보드)/2레벨(신 보드)로 나뉘므로 표기도 구분한다. 명왕은 게임 용어대로 '절대자'. */
export const talentTierLabel = (t: Talent): string => {
  if (t.tier === '핵심') {
    if (t.god === 'Nether King') return '절대자'
    if (t.coreLevel) return `${t.coreLevel}레벨 핵심`
  }
  return t.tier
}

/** 슬롯이 받는 등급 표기. 핵심에 레벨 제한이 걸려 있으면 그대로, 명왕 석판이면 '절대자'로 보여준다. */
export const slotTierLabel = (slot: SlotSpec, nether = false): string =>
  slot.tiers
    .map((t) => {
      if (t === '핵심') {
        if (nether) return '절대자'
        if (slot.coreLevels?.length) return slot.coreLevels.map((l) => `${l}레벨 핵심`).join('/')
      }
      return t
    })
    .join('/')

/** 슬롯이 이 재능을 받을 수 있는가. */
export const slotAccepts = (slot: SlotSpec, t: Talent): boolean => {
  if (!slot.tiers.includes(t.tier)) return false
  if (t.tier !== '핵심' || !slot.coreLevels?.length) return true
  return t.coreLevel != null && slot.coreLevels.includes(t.coreLevel)
}
