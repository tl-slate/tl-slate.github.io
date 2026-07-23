// 재능별 "(신격 유효 한도: N)" → talents.json 의 divLimit 필드로 기록
const dec = (s) =>
  s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&')
const get = (u) => fetch(u, { headers: { 'user-agent': 'Mozilla/5.0' } }).then((r) => (r.ok ? r.text() : Promise.reject(new Error(`HTTP ${r.status} ${u}`))))
const fs = require('fs')
const DB = 'public/data/talents.json'

;(async () => {
  const limits = new Map()
  for (const url of ['https://tlidb.com/ko/Divinity_Slate', 'https://tlidb.com/ko/Nether_Kings_Divinity']) {
    const html = await get(url)
    for (const b of html.split('<div class="col">').slice(1)) {
      const m = b.match(/data-(?:talent-)?id="(\d+)"/)
      if (!m) continue
      const lm = dec(b).match(/신격 유효 한도\s*[:：]\s*(\d+)/)
      if (lm) limits.set(m[1], parseInt(lm[1], 10))
    }
  }
  const db = JSON.parse(fs.readFileSync(DB, 'utf8'))
  let set = 0
  let cleared = 0
  for (const g of db.gods) for (const t of db.talents[g] ?? []) {
    const n = limits.get(t.id.split('-')[1])
    if (n != null) { t.divLimit = n; set++ }
    else if (t.divLimit != null) { delete t.divLimit; cleared++ }
  }
  fs.writeFileSync(DB, JSON.stringify(db, null, 1), 'utf8')
  console.log('divLimit 기록:', set, '/ 제거:', cleared)
})().catch((e) => { console.error('ERR', e.message); process.exit(1) })
