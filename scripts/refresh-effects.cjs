// talents.json의 effect/stats를 tlidb Divinity_Slate에서 재추출한다.
// - effect: <br/> 를 \n 으로 보존 (UI는 pre-line으로 렌더)
// - stats: 부호(+/-)가 있는 text-mod 수치만 스탯으로 인정 (지속시간·임계치 등 무부호 수치는 문맥 텍스트)
// - descriptor: 줄(line) 단위. 값 앞 텍스트가 기본, 비면 값 뒤 텍스트. 줄에 값이 하나면 뒤 문맥도 이어붙임.
const fs = require('fs')
const DB = 'public/data/talents.json'

const dec = (s) =>
  s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&')
// 태그를 먼저 제거(속성 안 툴팁 HTML은 인코딩돼 있어 안전)하고 나서 엔티티를 디코드한다
const stripText = (h) => dec(h.replace(/<[^>]*>/g, '')).replace(/\s+/g, ' ').trim()
const effectText = (h) =>
  h.split(/<br\s*\/?>/i).map((line) => stripText(line)).filter(Boolean).join('\n')

// descriptor 정리: 앞뒤 연결 문장부호 제거. 문장부호만 남으면 빈 문자열
const clean = (s) => {
  const out = s.replace(/^[\s,·:;~/-]+/, '').replace(/[\s,·:;/-]+$/, '').replace(/\s+/g, ' ').trim()
  return /^[.\s]*$/.test(out) ? '' : out.replace(/\s*\.$/, '.')
}

function parseStats(effHtml) {
  const out = []
  for (const line of effHtml.split(/<br\s*\/?>/i)) {
    const re = /<span class="text-mod">([^<]*)<\/span>(\s*%)?/g
    const vals = []
    let m
    let lastUnsigned = null
    while ((m = re.exec(line))) {
      const raw = dec(m[1]).trim()
      const value = parseFloat(raw.replace(/[+,]/g, ''))
      if (Number.isNaN(value)) continue
      if (/^[+-]/.test(raw)) {
        vals.push({ value, unit: m[2] ? '%' : '', start: m.index, end: re.lastIndex })
      } else {
        lastUnsigned = { value, unit: m[2] ? '%' : '', start: m.index, end: re.lastIndex }
      }
    }
    // 무부호 수치라도 줄 끝에 오는 값("… 크리티컬 대미지 0.5%")은 스탯으로 인정.
    // 뒤에 문장이 이어지면("18% 미만인 적 처치") 텍스트 취급.
    if (lastUnsigned && /^[\s.]*$/.test(stripText(line.slice(lastUnsigned.end)))) {
      if (!vals.some((v) => v.start === lastUnsigned.start)) vals.push(lastUnsigned)
      vals.sort((a, b) => a.start - b.start)
    }
    for (let i = 0; i < vals.length; i++) {
      const v = vals[i]
      const prevEnd = i > 0 ? vals[i - 1].end : 0
      let desc = clean(stripText(line.slice(prevEnd, v.start)))
      const isLast = i === vals.length - 1
      if (isLast) {
        const tail = clean(stripText(line.slice(v.end)))
        if (!desc) desc = tail
        else if (vals.length === 1 && tail) desc = `${desc}, ${tail}`
      }
      out.push({ descriptor: desc, value: v.value, unit: v.unit })
    }
  }
  return out
}

const get = (u) => fetch(u, { headers: { 'user-agent': 'Mozilla/5.0' } }).then((r) => (r.ok ? r.text() : Promise.reject(new Error(`HTTP ${r.status} ${u}`))))

;(async () => {
  const items = new Map() // 숫자 id -> effHtml
  const put = (id, eff) => {
    if (eff && eff.trim() && !items.has(id)) items.set(id, eff) // 빈 효과 블록은 저장 안 함
  }
  // 명왕 절대자(92xxxxxx 일부)는 Divinity_Slate에선 효과가 비어 있고 Nether_Kings_Divinity에만 있다
  for (const url of ['https://tlidb.com/ko/Divinity_Slate', 'https://tlidb.com/ko/Nether_Kings_Divinity']) {
    const html = await get(url)
    for (const b of html.split('<div class="col">').slice(1)) {
      const m = b.match(/<span(?: class="fw-bold")? data-id="(\d+)"[^>]*>[^<]*<\/span>\s*<span>[\s\S]*?<\/span>\s*<\/div>([\s\S]*?)<\/div>\s*<\/div>/)
      if (m) put(m[1], m[2])
      // Nether_Kings_Divinity 형식: data-talent-id + <hr/> 뒤 div 줄들
      const n = b.match(/<span class="fw-bold" data-talent-id="(\d+)"[^>]*>[^<]*<\/span>[\s\S]*?<hr[^>]*\/?>([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>/)
      if (n) put(n[1], n[2].replace(/<\/div>/gi, '<br/>').replace(/<div[^>]*>/gi, ''))
    }
  }
  console.log('page items:', items.size)

  const db = JSON.parse(fs.readFileSync(DB, 'utf8'))
  let updated = 0
  let missing = []
  let statCountChanged = 0
  let emptyDescBefore = 0
  let emptyDescAfter = 0
  let nlEffects = 0
  const samples = []

  for (const god of db.gods) {
    for (const t of db.talents[god] ?? []) {
      for (const s of t.stats) if (!s.descriptor) emptyDescBefore++
      const num = t.id.split('-')[1]
      const eff = items.get(num)
      if (!eff) { missing.push(t.id); continue }
      const newEffect = effectText(eff)
      const newStats = parseStats(eff)
      if (newStats.length !== t.stats.length) statCountChanged++
      if (samples.length < 8 && (newStats.length !== t.stats.length || newEffect.includes('\n')))
        samples.push({ id: t.id, effect: newEffect, old: t.stats, new: newStats })
      t.effect = newEffect
      t.stats = newStats
      if (newEffect.includes('\n')) nlEffects++
      for (const s of newStats) if (!s.descriptor) emptyDescAfter++
      updated++
    }
  }

  fs.writeFileSync(DB, JSON.stringify(db, null, 1), 'utf8')
  console.log(JSON.stringify({ updated, missing: missing.length, statCountChanged, nlEffects, emptyDescBefore, emptyDescAfter }, null, 1))
  if (missing.length) console.log('MISSING:', missing.slice(0, 20).join(' '))
  for (const s of samples) {
    console.log(`\n--- ${s.id}\nEFFECT: ${s.effect.replace(/\n/g, ' ⏎ ')}\nOLD: ${JSON.stringify(s.old)}\nNEW: ${JSON.stringify(s.new)}`)
  }
})().catch((e) => { console.error('ERR', e.message); process.exit(1) })
