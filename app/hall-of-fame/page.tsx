// app/hall-of-fame/page.tsx
export const metadata = { title: 'Hall of Shame' }

import { getHallOfFameData } from '@/lib/stats/hall-of-fame-data'
import { BenchTaxData } from '@/lib/stats/bench-tax-data'
import { DraftGradePageData } from '@/lib/stats/draft-grade-data'
import { TradePageData } from '@/lib/stats/trade-grade-data'
import { WaiverRoiPageData } from '@/lib/stats/waiver-roi-data'
import { StandingsRow } from '@/lib/stats/standings'

export const dynamic = 'force-dynamic'
export const revalidate = 600

// ─── helpers ────────────────────────────────────────────────────────────────

function SectionHeader({ icon, title, subtitle }: { icon: string; title: string; subtitle?: string }) {
  return (
    <div className="mb-5">
      <h2 className="text-2xl font-black tracking-tight">
        {icon} {title}
      </h2>
      {subtitle && <p className="text-gray-400 text-sm mt-0.5">{subtitle}</p>}
    </div>
  )
}

function CalloutCard({
  accent,
  label,
  name,
  sub,
  stat,
}: {
  accent: 'green' | 'red' | 'orange' | 'yellow' | 'purple'
  label: string
  name: string
  sub?: string
  stat?: string
}) {
  const colors: Record<string, string> = {
    green:  'bg-green-950 border-green-800',
    red:    'bg-red-950 border-red-800',
    orange: 'bg-orange-950 border-orange-800',
    yellow: 'bg-yellow-950 border-yellow-800',
    purple: 'bg-purple-950 border-purple-800',
  }
  const textColors: Record<string, string> = {
    green:  'text-green-400',
    red:    'text-red-400',
    orange: 'text-orange-400',
    yellow: 'text-yellow-400',
    purple: 'text-purple-400',
  }
  const statColors: Record<string, string> = {
    green:  'text-green-300',
    red:    'text-red-300',
    orange: 'text-orange-300',
    yellow: 'text-yellow-300',
    purple: 'text-purple-300',
  }
  return (
    <div className={`${colors[accent]} border rounded-xl p-4`}>
      <p className={`${textColors[accent]} text-xs uppercase tracking-wider mb-1`}>{label}</p>
      <p className="text-white font-bold text-lg leading-tight">{name}</p>
      {sub && <p className="text-gray-400 text-xs mt-0.5">{sub}</p>}
      {stat && <p className={`${statColors[accent]} font-mono font-bold mt-1`}>{stat}</p>}
    </div>
  )
}

// ─── Bench Tax Section ───────────────────────────────────────────────────────

function BenchTaxSection({ data }: { data: BenchTaxData }) {
  const { leaderboard, best_setter, season_worst } = data
  return (
    <section className="mb-12">
      <SectionHeader
        icon="🪑"
        title="Bench Tax"
        subtitle="Points left on the bench by starting the wrong players."
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        {season_worst.bench_tax > 0 && (
          <CalloutCard
            accent="red"
            label="💀 Captain Bench — Season's Worst Lineup"
            name={`${leaderboard[0]?.display_name ?? 'N/A'} — Most Bench Tax`}
            sub={`Week ${season_worst.week}: ${season_worst.swap_label}`}
            stat={`+${season_worst.bench_tax.toFixed(2)} pts left sitting`}
          />
        )}
        <CalloutCard
          accent="green"
          label="✅ Best Lineup Setter"
          name={best_setter.display_name}
          sub={best_setter.real_name}
          stat={`${best_setter.total_bench_tax.toFixed(2)} pts total bench tax`}
        />
      </div>
      <div className="rounded-xl border border-gray-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-900 text-gray-400 uppercase text-xs tracking-wider">
              <th className="px-4 py-3 text-left">Manager</th>
              <th className="px-4 py-3 text-right">Total Tax</th>
              <th className="px-4 py-3 text-right">Avg/Wk</th>
              <th className="px-4 py-3 text-right hidden sm:table-cell">Worst Wk</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {leaderboard.map((row, i) => (
              <tr
                key={row.roster_id}
                className={`hover:bg-gray-900 transition-colors ${i === 0 ? 'bg-red-950/20' : ''} ${row.roster_id === best_setter.roster_id ? 'bg-green-950/10' : ''}`}
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {row.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={row.avatar_url} alt="" className="w-7 h-7 rounded-full bg-gray-700" />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center font-bold text-xs text-white">
                        {row.real_name[0]}
                      </div>
                    )}
                    <div>
                      <p className="font-semibold text-white text-xs">{row.display_name}</p>
                      <p className="text-gray-500 text-xs">{row.real_name}</p>
                    </div>
                    {i === 0 && <span className="text-xs bg-red-900 text-red-300 px-2 py-0.5 rounded-full">🪑</span>}
                    {row.roster_id === best_setter.roster_id && (
                      <span className="text-xs bg-green-900 text-green-300 px-2 py-0.5 rounded-full">✅</span>
                    )}
                  </div>
                </td>
                <td className={`px-4 py-3 text-right font-mono font-bold ${i === 0 ? 'text-red-400' : 'text-gray-300'}`}>
                  {row.total_bench_tax.toFixed(2)}
                </td>
                <td className="px-4 py-3 text-right font-mono text-gray-400 text-xs">
                  {row.avg_bench_tax.toFixed(2)}
                </td>
                <td className="px-4 py-3 text-right font-mono text-orange-400 text-xs hidden sm:table-cell">
                  {row.worst_week_bench_tax.toFixed(2)}
                  <span className="text-gray-600 ml-1">Wk{row.worst_week}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

// ─── Draft Grades Section ────────────────────────────────────────────────────

function DraftSection({ data }: { data: DraftGradePageData }) {
  const { result, rosterNames } = data
  const gradeColor = (g: string) => {
    if (g.startsWith('A')) return 'text-green-400'
    if (g.startsWith('B')) return 'text-emerald-400'
    if (g.startsWith('C')) return 'text-yellow-400'
    if (g.startsWith('D')) return 'text-orange-400'
    return 'text-red-400'
  }
  const fGraders = result.rosters.filter(r => r.letter_grade === 'F')
  const bestDrafter = result.best_drafter

  return (
    <section className="mb-12">
      <SectionHeader
        icon="📋"
        title="Draft Grades"
        subtitle="Season-long performance vs draft position. Higher grade = better value extracted."
      />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <CalloutCard
          accent="green"
          label="🏆 Best Drafter"
          name={rosterNames.get(bestDrafter.roster_id)?.display_name ?? `Team ${bestDrafter.roster_id}`}
          sub={rosterNames.get(bestDrafter.roster_id)?.real_name}
          stat={`Grade: ${bestDrafter.letter_grade} (+${bestDrafter.grade_score.toFixed(0)} value)`}
        />
        <CalloutCard
          accent="yellow"
          label="💎 Steal of the Year"
          name={result.steal_of_year.player_name}
          sub={`Pick #${result.steal_of_year.pick_no} · ${result.steal_of_year.position}`}
          stat={`+${result.steal_of_year.value_over_pick} value over pick`}
        />
        <CalloutCard
          accent="red"
          label="💩 Bust of the Year"
          name={result.bust_of_year.player_name}
          sub={`Pick #${result.bust_of_year.pick_no} · ${result.bust_of_year.position}`}
          stat={`${result.bust_of_year.value_over_pick} value under pick`}
        />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {[...result.rosters]
          .sort((a, b) => a.rank - b.rank)
          .map(r => {
            const info = rosterNames.get(r.roster_id)
            return (
              <div
                key={r.roster_id}
                className={`rounded-xl border p-3 text-center ${
                  r.roster_id === bestDrafter.roster_id
                    ? 'border-green-700 bg-green-950/20'
                    : fGraders.some(f => f.roster_id === r.roster_id)
                    ? 'border-red-800 bg-red-950/20'
                    : 'border-gray-800 bg-gray-900/50'
                }`}
              >
                {info?.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={info.avatar_url}
                    alt=""
                    className="w-10 h-10 rounded-full mx-auto mb-2 bg-gray-700"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center font-bold text-sm text-white mx-auto mb-2">
                    {(info?.real_name ?? 'T')[0]}
                  </div>
                )}
                <p className="text-white font-semibold text-xs truncate">{info?.display_name ?? `Team ${r.roster_id}`}</p>
                <p className={`font-black text-2xl mt-1 ${gradeColor(r.letter_grade)}`}>{r.letter_grade}</p>
                <p className="text-gray-500 text-xs">#{r.rank}</p>
              </div>
            )
          })}
      </div>
    </section>
  )
}

// ─── Trade Grades Section ────────────────────────────────────────────────────

function TradeSection({ data }: { data: TradePageData }) {
  const { result, rosterNames } = data

  if (result.graded_trades.length === 0) {
    return (
      <section className="mb-12">
        <SectionHeader icon="🔄" title="Trade Grades" subtitle="No completed trades this season." />
        <p className="text-gray-500 text-sm">No trades to grade yet.</p>
      </section>
    )
  }

  function rosterName(id: number) {
    return rosterNames.get(id)?.display_name ?? `Team ${id}`
  }

  return (
    <section className="mb-12">
      <SectionHeader
        icon="🔄"
        title="Trade Grades"
        subtitle="Graded by rest-of-season fantasy points each side received."
      />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <CalloutCard
          accent="green"
          label="👑 Trade King"
          name={rosterName(result.trade_king.roster_id)}
          stat={`+${result.trade_king.cumulative_delta.toFixed(1)} pts net across ${result.trade_king.trades_involved} trade${result.trade_king.trades_involved !== 1 ? 's' : ''}`}
        />
        <CalloutCard
          accent="red"
          label="💸 Fleeced"
          name={rosterName(result.fleeced.roster_id)}
          stat={`${result.fleeced.cumulative_delta.toFixed(1)} pts net across ${result.fleeced.trades_involved} trade${result.fleeced.trades_involved !== 1 ? 's' : ''}`}
        />
        {result.robbery_of_year && (
          <CalloutCard
            accent="orange"
            label="🚨 Robbery of the Year"
            name={`${rosterName(result.robbery_of_year.winner_roster_id)} robbed ${rosterName(result.robbery_of_year.loser_roster_id)}`}
            sub={`Week ${result.robbery_of_year.week}`}
            stat={`${result.robbery_of_year.robbery_score.toFixed(1)} pt swing`}
          />
        )}
      </div>
      <div className="rounded-xl border border-gray-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-900 text-gray-400 uppercase text-xs tracking-wider">
              <th className="px-4 py-3 text-left">Manager</th>
              <th className="px-4 py-3 text-right">Net Delta</th>
              <th className="px-4 py-3 text-right hidden sm:table-cell">Trades</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {[...result.roster_grades]
              .sort((a, b) => b.cumulative_delta - a.cumulative_delta)
              .map((r, i) => {
                const info = rosterNames.get(r.roster_id)
                const isKing = r.roster_id === result.trade_king.roster_id
                const isFleeced = r.roster_id === result.fleeced.roster_id
                return (
                  <tr
                    key={r.roster_id}
                    className={`hover:bg-gray-900 transition-colors ${isKing ? 'bg-green-950/10' : ''} ${isFleeced ? 'bg-red-950/10' : ''}`}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {info?.avatar_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={info.avatar_url} alt="" className="w-7 h-7 rounded-full bg-gray-700" />
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center font-bold text-xs text-white">
                            {(info?.real_name ?? 'T')[0]}
                          </div>
                        )}
                        <div>
                          <p className="font-semibold text-white text-xs">{info?.display_name ?? `Team ${r.roster_id}`}</p>
                          <p className="text-gray-500 text-xs">{info?.real_name}</p>
                        </div>
                        {isKing && <span className="text-xs bg-green-900 text-green-300 px-2 py-0.5 rounded-full">👑</span>}
                        {isFleeced && <span className="text-xs bg-red-900 text-red-300 px-2 py-0.5 rounded-full">💸</span>}
                      </div>
                    </td>
                    <td className={`px-4 py-3 text-right font-mono font-bold ${r.cumulative_delta > 0 ? 'text-green-400' : r.cumulative_delta < 0 ? 'text-red-400' : 'text-gray-400'}`}>
                      {r.cumulative_delta >= 0 ? '+' : ''}{r.cumulative_delta.toFixed(1)}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-400 hidden sm:table-cell">{r.trades_involved}</td>
                  </tr>
                )
              })}
          </tbody>
        </table>
      </div>
    </section>
  )
}

// ─── Waiver ROI Section ──────────────────────────────────────────────────────

function WaiverSection({ data }: { data: WaiverRoiPageData }) {
  const { result, rosterNames, isFAAB } = data

  function rosterName(id: number) {
    return rosterNames.get(id)?.display_name ?? `Team ${id}`
  }

  const topAdds = [...result.adds]
    .sort((a, b) => b.points_gained - a.points_gained)
    .slice(0, 5)

  return (
    <section className="mb-12">
      <SectionHeader
        icon="📡"
        title="Waiver Wire ROI"
        subtitle={isFAAB ? 'Points gained per FAAB dollar spent.' : 'Points gained from waiver pickups.'}
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <CalloutCard
          accent="purple"
          label="🧙 Waiver Wizard"
          name={rosterName(result.waiver_wizard.roster_id)}
          stat={
            isFAAB
              ? `${result.waiver_wizard.roi.toFixed(2)} pts/$`
              : `${result.waiver_wizard.total_points_gained.toFixed(1)} pts gained`
          }
        />
        {isFAAB && result.money_drain && (
          <CalloutCard
            accent="red"
            label="🚽 Money Drain"
            name={rosterName(result.money_drain.roster_id)}
            stat={`$${result.money_drain.total_faab_spent} spent · ${result.money_drain.total_points_gained.toFixed(1)} pts`}
          />
        )}
      </div>
      {topAdds.length > 0 && (
        <div className="rounded-xl border border-gray-800 overflow-hidden">
          <div className="bg-gray-900 px-4 py-2 text-gray-400 text-xs uppercase tracking-wider">
            Top 5 Waiver Adds by Points Gained
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-900/50 text-gray-500 text-xs uppercase tracking-wider">
                <th className="px-4 py-2 text-left">Player</th>
                <th className="px-4 py-2 text-left hidden sm:table-cell">Manager</th>
                <th className="px-4 py-2 text-right">Pts Gained</th>
                {isFAAB && <th className="px-4 py-2 text-right hidden sm:table-cell">FAAB</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {topAdds.map((add, i) => (
                <tr key={add.transaction_id} className="hover:bg-gray-900/50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {i === 0 && <span className="text-yellow-400">🥇</span>}
                      <span className="text-white font-medium">{add.player_name}</span>
                      <span className="text-gray-500 text-xs">Wk{add.week}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs hidden sm:table-cell">
                    {rosterName(add.roster_id)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-green-400 font-bold">
                    {add.points_gained.toFixed(1)}
                  </td>
                  {isFAAB && (
                    <td className="px-4 py-3 text-right font-mono text-gray-400 hidden sm:table-cell">
                      ${add.faab_spent}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

// ─── Award Count Section ─────────────────────────────────────────────────────

interface ManagerAwards {
  roster_id: number
  display_name: string
  real_name: string
  avatar_url: string | null
  fame: string[]
  shame: string[]
}

function buildAwardCounts(
  benchTax: BenchTaxData | null,
  draftGrade: DraftGradePageData | null,
  tradeGrade: TradePageData | null,
  waiverRoi: WaiverRoiPageData | null,
  standings: StandingsRow[] | null,
): ManagerAwards[] {
  // Collect all roster_ids
  const allIds = new Set<number>()

  // Helper to get display info from any source
  const infoMap = new Map<number, { display_name: string; real_name: string; avatar_url: string | null }>()

  function maybeAdd(id: number, info: { display_name: string; real_name: string; avatar_url: string | null }) {
    allIds.add(id)
    if (!infoMap.has(id)) infoMap.set(id, info)
  }

  if (benchTax) {
    benchTax.leaderboard.forEach(r =>
      maybeAdd(r.roster_id, { display_name: r.display_name, real_name: r.real_name, avatar_url: r.avatar_url })
    )
  }
  if (draftGrade) {
    draftGrade.rosterNames.forEach((info, id) => maybeAdd(id, info))
  }
  if (tradeGrade) {
    tradeGrade.rosterNames.forEach((info, id) => maybeAdd(id, info))
  }
  if (waiverRoi) {
    waiverRoi.rosterNames.forEach((info, id) => maybeAdd(id, info))
  }
  if (standings) {
    standings.forEach(s =>
      maybeAdd(s.roster_id, { display_name: s.display_name, real_name: s.real_name, avatar_url: s.avatar_url })
    )
  }

  const awards = new Map<number, ManagerAwards>()
  for (const id of allIds) {
    const info = infoMap.get(id)!
    awards.set(id, { roster_id: id, ...info, fame: [], shame: [] })
  }

  // Bench Tax awards
  if (benchTax && benchTax.leaderboard.length > 0) {
    const captainBench = benchTax.leaderboard[0]
    awards.get(captainBench.roster_id)?.shame.push('🪑 Captain Bench')
    awards.get(benchTax.best_setter.roster_id)?.fame.push('✅ Best Lineup Setter')
  }

  // Draft Grade awards
  if (draftGrade) {
    awards.get(draftGrade.result.best_drafter.roster_id)?.fame.push('📋 Best Drafter')
    draftGrade.result.rosters
      .filter(r => r.letter_grade === 'F')
      .forEach(r => awards.get(r.roster_id)?.shame.push('📋 F-Grade Drafter'))
  }

  // Trade Grade awards
  if (tradeGrade && tradeGrade.result.graded_trades.length > 0) {
    awards.get(tradeGrade.result.trade_king.roster_id)?.fame.push('👑 Trade King')
    awards.get(tradeGrade.result.fleeced.roster_id)?.shame.push('💸 Fleeced')
  }

  // Waiver ROI awards
  if (waiverRoi) {
    awards.get(waiverRoi.result.waiver_wizard.roster_id)?.fame.push('🧙 Waiver Wizard')
    if (waiverRoi.result.money_drain) {
      awards.get(waiverRoi.result.money_drain.roster_id)?.shame.push('🚽 Money Drain')
    }
  }

  // Standings awards
  if (standings && standings.length > 0) {
    const sorted = [...standings].sort((a, b) => b.points_for - a.points_for)
    awards.get(sorted[0].roster_id)?.fame.push('💯 Points King')
    awards.get(sorted[sorted.length - 1].roster_id)?.shame.push('📉 Points Last')
    const mostLucky = [...standings].sort((a, b) => b.luck_index - a.luck_index)[0]
    const mostUnlucky = [...standings].sort((a, b) => a.luck_index - b.luck_index)[0]
    awards.get(mostLucky.roster_id)?.fame.push('🍀 Luckiest')
    awards.get(mostUnlucky.roster_id)?.shame.push('😤 Unluckiest')
  }

  return [...awards.values()].sort((a, b) => {
    const scoreA = a.fame.length - a.shame.length
    const scoreB = b.fame.length - b.shame.length
    return scoreB - scoreA
  })
}

function AwardCountSection({
  benchTax,
  draftGrade,
  tradeGrade,
  waiverRoi,
  standings,
}: {
  benchTax: BenchTaxData | null
  draftGrade: DraftGradePageData | null
  tradeGrade: TradePageData | null
  waiverRoi: WaiverRoiPageData | null
  standings: StandingsRow[] | null
}) {
  const managers = buildAwardCounts(benchTax, draftGrade, tradeGrade, waiverRoi, standings)
  if (managers.length === 0) return null

  return (
    <section className="mb-12">
      <SectionHeader
        icon="🏅"
        title="Award Board"
        subtitle="Every manager's tally of fame 🏆 and shame 💀 awards across all categories."
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {managers.map(m => {
          const netScore = m.fame.length - m.shame.length
          const borderClass =
            netScore > 0
              ? 'border-green-800 bg-green-950/10'
              : netScore < 0
              ? 'border-red-800 bg-red-950/10'
              : 'border-gray-700 bg-gray-900/30'

          return (
            <div key={m.roster_id} className={`rounded-xl border p-4 ${borderClass}`}>
              <div className="flex items-center gap-3 mb-3">
                {m.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={m.avatar_url} alt="" className="w-10 h-10 rounded-full bg-gray-700" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center font-bold text-sm text-white">
                    {m.real_name[0]}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-white truncate">{m.display_name}</p>
                  <p className="text-gray-500 text-xs">{m.real_name}</p>
                </div>
                <div className="flex gap-2 text-sm font-bold shrink-0">
                  <span className="text-green-400">🏆 {m.fame.length}</span>
                  <span className="text-red-400">💀 {m.shame.length}</span>
                </div>
              </div>
              {m.fame.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-1">
                  {m.fame.map((award, i) => (
                    <span key={i} className="text-xs bg-green-900/50 text-green-300 border border-green-800 px-2 py-0.5 rounded-full">
                      {award}
                    </span>
                  ))}
                </div>
              )}
              {m.shame.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {m.shame.map((award, i) => (
                    <span key={i} className="text-xs bg-red-900/50 text-red-300 border border-red-800 px-2 py-0.5 rounded-full">
                      {award}
                    </span>
                  ))}
                </div>
              )}
              {m.fame.length === 0 && m.shame.length === 0 && (
                <p className="text-gray-600 text-xs italic">No awards yet</p>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default async function HallOfFamePage() {
  const data = await getHallOfFameData()

  const anyData = data.benchTax || data.draftGrade || data.tradeGrade || data.waiverRoi || data.standings

  return (
    <main className="min-h-screen bg-gray-950 text-white px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-black mb-1 tracking-tight">🏆 Hall of Shame &amp; Fame</h1>
        <p className="text-gray-400 text-sm mb-10">
          Season leaderboards across every category — from bench blunders to waiver wizardry.
        </p>

        {!anyData && (
          <div className="text-gray-500 text-center py-20">
            <p className="text-4xl mb-4">⏳</p>
            <p>Data is loading or unavailable. Check back soon.</p>
          </div>
        )}

        {data.benchTax && <BenchTaxSection data={data.benchTax} />}

        {data.draftGrade && <DraftSection data={data.draftGrade} />}

        {data.tradeGrade && <TradeSection data={data.tradeGrade} />}

        {data.waiverRoi && <WaiverSection data={data.waiverRoi} />}

        <AwardCountSection
          benchTax={data.benchTax}
          draftGrade={data.draftGrade}
          tradeGrade={data.tradeGrade}
          waiverRoi={data.waiverRoi}
          standings={data.standings}
        />
      </div>
    </main>
  )
}
