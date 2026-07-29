import type { AggregateResult, NamedEffect, NumericStat } from '../engine/aggregate'

function fmt(total: number, unit: string): string {
  const rounded = Math.round(total * 100) / 100
  return `${rounded > 0 ? '+' : ''}${rounded}${unit}`
}

/** 투영 계수 0.2 → "20%", 0.224 → "22.4%" */
const fmtFactor = (f: number) => `${Math.round(f * 1000) / 10}%`

/** 합산 목록: 텍스트를 앞에, 수치는 뒤에 덜 강조해서 나열. 수치 없는 재능도 같은 목록에 나열 */
function StatList({ stats, textual }: { stats: NumericStat[]; textual?: NamedEffect[] }) {
  return (
    <ul className="numeric-list">
      {stats.map((n) => (
        <li key={n.key}>
          {n.boosted > 0 && <span className="num-boost">명왕 적용</span>}
          <span className="num-desc">{n.descriptor}</span>
          <span className="num-val">{fmt(n.total, n.unit)}</span>
          {n.count > 1 && <span className="num-count">×{n.count}</span>}
        </li>
      ))}
      {textual?.map((f) => (
        <li key={f.name + f.effect}>
          <span className="num-desc">{f.effect}</span>
          {f.count > 1 && <span className="num-count">×{f.count}</span>}
        </li>
      ))}
    </ul>
  )
}

export function StatsPanel({ result }: { result: AggregateResult }) {
  return (
    <div className="stats">
      {result.overLimitCount > 0 && (
        <div className="stats-over">
          개수 제한 초과로 석판 {result.overLimitCount}개가 아래 계산에서 빠졌습니다 —{' '}
          {result.overLimitSummary.join(', ')}
        </div>
      )}

      {result.offSpotCount > 0 && (
        <div className="stats-over">
          놓을 수 없는 자리에 있는 명왕 석판 {result.offSpotCount}개가 아래 계산에서 빠졌습니다.
        </div>
      )}

      {result.core.length > 0 && (
        <section className="stats-section">
          <h3>핵심</h3>
          <ul className="named-list">
            {result.core.map((f) => (
              <li key={f.name + f.effect}>
                <span className="named-name">{f.name}</span>
                {f.count > 1 && <span className="num-count">×{f.count}</span>}
                <span className="named-effect">{f.effect}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="stats-section">
        <h3>합산 스탯</h3>
        {result.numeric.length === 0 && result.textual.length === 0 ? (
          <p className="muted small">석판에 재능을 붙이면 합산 스탯이 표시됩니다.</p>
        ) : (
          <StatList stats={result.numeric} textual={result.textual} />
        )}
      </section>

      {(result.hasCopiers || result.copied.length > 0) && (
        <section className="stats-section">
          <h3>복제 효과</h3>
          {result.copied.length === 0 ? (
            <p className="muted small">
              복제되는 재능이 없습니다. 복제 석판을 클릭해 조건(빛이 된 나방은 방향 선택, 인접 석판의 마지막 재능이
              핵심·신격 한도 1이면 복사 불가)을 확인하세요.
            </p>
          ) : (
            <>
              <ul className="copy-lines">
                {result.copied.map((c, i) => (
                  <li key={i}>
                    <span className="copy-src">
                      {c.copierName} ← {c.sourceName}
                    </span>
                    <span className="copy-effect">{c.talent.effect}</span>
                  </li>
                ))}
              </ul>
              <h4 className="copy-sum-title">복제 합산</h4>
              {result.copiedNumeric.length + result.copiedTextual.length > 0 ? (
                <StatList stats={result.copiedNumeric} textual={result.copiedTextual} />
              ) : (
                <p className="muted small">복제된 재능에 합산할 수치 스탯이 없습니다.</p>
              )}
              <p className="muted small">복제 재능은 위 합산 스탯에 포함되지 않고 여기서 따로 합산됩니다.</p>
            </>
          )}
        </section>
      )}

      {(result.hasInfection || result.infected.length > 0) && (
        <section className="stats-section">
          <h3>인펙션 투영</h3>
          {result.infected.length === 0 ? (
            <p className="muted small">
              투영되는 재능이 없습니다. 인펙션 석판의 슬롯 4개를 모두 채우고 다른 석판을 인접시키면 낙인 재능 3개가
              인접 석판마다 20% 강도로 투영됩니다.
            </p>
          ) : (
            <>
              <ul className="copy-lines">
                {result.infected.map((l, i) => (
                  <li key={i}>
                    <span className="copy-src">
                      {l.targetName} ← 투영 {fmtFactor(l.factor)}
                    </span>
                    <span className="copy-effect">{l.talent.effect}</span>
                  </li>
                ))}
              </ul>
              <h4 className="copy-sum-title">투영 합산</h4>
              {result.infectedNumeric.length + result.infectedTextual.length > 0 ? (
                <StatList stats={result.infectedNumeric} textual={result.infectedTextual} />
              ) : (
                <p className="muted small">투영된 재능에 합산할 수치 스탯이 없습니다.</p>
              )}
              <p className="muted small">
                투영 수치는 원본×계수 후 반올림한 정수이며 위 합산 스탯에 포함되지 않습니다. 텍스트형 재능은 원문
                그대로 표시되지만 실제로는 표기 계수의 강도로 적용됩니다.
              </p>
            </>
          )}
        </section>
      )}
    </div>
  )
}
