import { useEffect, useState } from 'react'

export function VisitorCount() {
  const [n, setN] = useState<number | null>(null)

  useEffect(() => {
    fetch('https://tl-slate.goatcounter.com/counter/TOTAL.json')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setN(d.count_unique ?? d.count))
      .catch(() => {})
  }, [])

  if (n == null) return null
  return (
    <span className="visitor-count" title="누적 방문 (같은 IP 하루 1회)">
      👣 {n.toLocaleString()}
    </span>
  )
}
