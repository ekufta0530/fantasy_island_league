// app/hall-of-fame/page.tsx
export const metadata = { title: 'Hall of Fame' }

import { getHallOfFameData } from '@/lib/stats/hall-of-fame-data'
import { BenchTaxData } from '@/lib/stats/bench-tax-data'
import { DraftGradePageData } from '@/lib/stats/draft-grade-data'
import { TradePageData } from '@/lib/stats/trade-grade-data'
import { WaiverRoiPageData } from '@/lib/stats/waiver-roi-data'
import { StandingsRow } from '@/lib/stats/standings'
import { PageHeader, SectionHeading } from '@/components/PageHeader'
import { EmptyState } from '@/components/EmptyState'
import { Avatar } from '@/components/Avatar'
import { Badge } from '@/components/Badge'
import { Callout } from '@/components/Card'

export const dynamic = 'force-dynamic'
export const revalidate = 600

// ─── Bench Tax Section ───────────────────────────────────────────────────────

function BenchTaxSection({ data }: { data: BenchTaxData }) {
  const { leaderboard, best_setter, season_worst } = data
  return (
    <section className="mb-14">
      <SectionHeading title="Bench Tax" subtitle="Points left on the bench by starting the wrong players." />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        {season_worst.bench_tax > 0 && (
          <Callout
            tone="rose"
            eyebrow="Captain Bench — Season's Worst Lineup"
            title={`${leaderboard[0]?.display_name ?? 'N/A'} — Most Bench Tax`}
            subtitle={`Week ${season_worst.week}: ${season_worst.swap_label}`}
            stat={`+${season_worst.bench_tax.toFixed(2)} pts left sitting`}
          />
        )}
        <Callout
          tone="lime"
          eyebrow="Best Lineup Setter"
          title={best_setter.display_name}
          subtitle={best_setter.real_name}
          stat={`${best_setter.total_bench_tax.toFixed(2)} pts total bench tax`}
        />
      </div>
      <div className="rounded-2xl border border-hairline bg-surface overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-hairline text-muted uppercase text-xs tracking-wider">
              <th className="px-4 py-3 text-left">Manager</th>
              <th className="px-4 py-3 text-right">Total Tax</th>
              <th className="px-4 py-3 text-right">Avg/Wk</th>
              <th className="px-4 py-3 text-right hidden sm:table-cell">Worst Wk</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-hairline">
            {leaderboard.map((row, i) => (
              <tr
                key={row.roster_id}
                className={`hover:bg-surface-2 transition-colors ${i === 0 ? 'bg-rose-950/20' : ''} ${row.roster_id === best_setter.roster_id ? 'bg-lime-950/10' : ''}`}
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Avatar src={row.avatar_url} name={row.real_name} size="sm" />
                    <div>
                      <p className="font-semibold text-ink text-xs">{row.display_name}</p>
                      <p className="text-faint text-xs">{row.real_name}</p>
                    </div>
                    {i === 0 && <Badge tone="rose">Captain Bench</Badge>}
                    {row.roster_id === best_setter.roster_id && <Badge tone="lime">Best Setter</Badge>}
                  </div>
                </td>
                <td className={`px-4 py-3 text-right font-mono font-bold ${i === 0 ? 'text-rose-300' : 'text-muted'}`}>
                  {row.total_bench_tax.toFixed(2)}
                </td>
                <td className="px-4 py-3 text-right font-mono text-faint text-xs">
                  {row.avg_bench_tax.toFixed(2)}
                </td>
                <td className="px-4 py-3 text-right font-mono text-coral-400 text-xs hidden sm:table-cell">
                  {row.worst_week_bench_tax.toFixed(2)}
                  <span className="text-faint ml-1">Wk{row.worst_week}</span>
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

const LETTER_TONE: Record<string, string> = {
  'A+': 'text-lime-400', 'A': 'text-lime-400',
  'B+': 'text-teal-300', 'B': 'text-teal-300',
  'C+': 'text-gold-400', 'C': 'text-gold-400',
  'D': 'text-coral-400', 'F': 'text-rose-400',
}

function DraftSection({ data }: { data: DraftGradePageData }) {
  const { result, rosterNames } = data
  const fGraders = result.rosters.filter(r => r.letter_grade === 'F')
  const bestDrafter = result.best_drafter

  return (
    <section className="mb-14">
      <SectionHeading title="Draft Grades" subtitle="Season-long performance vs draft position. Higher grade = better value extracted." />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Callout
          tone="lime"
          eyebrow="Best Drafter"
          title={rosterNames.get(bestDrafter.roster_id)?.display_name ?? `Team ${bestDrafter.roster_id}`}
          subtitle={rosterNames.get(bestDrafter.roster_id)?.real_name}
          stat={`Grade: ${bestDrafter.letter_grade} (+${bestDrafter.grade_score.toFixed(0)} value)`}
        />
        <Callout
          tone="gold"
          eyebrow="Steal of the Year"
          title={result.steal_of_year.player_name}
          subtitle={`Pick #${result.steal_of_year.pick_no} · ${result.steal_of_year.position}`}
          stat={`+${result.steal_of_year.value_over_pick} value over pick`}
        />
        <Callout
          tone="rose"
          eyebrow="Bust of the Year"
          title={result.bust_of_year.player_name}
          subtitle={`Pick #${result.bust_of_year.pick_no} · ${result.bust_of_year.position}`}
          stat={`${result.bust_of_year.value_over_pick} value under pick`}
        />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {[...result.rosters]
          .sort((a, b) => a.rank - b.rank)
          .map(r => {
            const info = rosterNames.get(r.roster_id)
            const isBest = r.roster_id === bestDrafter.roster_id
            const isWorst = fGraders.some(f => f.roster_id === r.roster_id)
            return (
              <div
                key={r.roster_id}
                className={`rounded-2xl border p-3 text-center ${
                  isBest
                    ? 'border-lime-800 bg-lime-950/20'
                    : isWorst
                    ? 'border-rose-800 bg-rose-950/20'
                    : 'border-hairline bg-surface'
                }`}
              >
                <Avatar src={info?.avatar_url} name={info?.real_name ?? 'T'} size="lg" className="mx-auto mb-2" />
                <p className="text-ink font-semibold text-xs truncate">{info?.display_name ?? `Team ${r.roster_id}`}</p>
                <p className={`font-display font-bold text-2xl mt-1 ${LETTER_TONE[r.letter_grade] ?? 'text-ink'}`}>{r.letter_grade}</p>
                <p className="text-faint text-xs">#{r.rank}</p>
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
      <section className="mb-14">
        <SectionHeading title="Trade Grades" subtitle="No completed trades this season." />
        <p className="text-muted text-sm">No trades to grade yet.</p>
      </section>
    )
  }

  function rosterName(id: number) {
    return rosterNames.get(id)?.display_name ?? `Team ${id}`
  }

  return (
    <section className="mb-14">
      <SectionHeading title="Trade Grades" subtitle="Graded by rest-of-season fantasy points each side received." />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Callout
          tone="lime"
          eyebrow="Trade King"
          title={rosterName(result.trade_king.roster_id)}
          stat={`+${result.trade_king.cumulative_delta.toFixed(1)} pts net across ${result.trade_king.trades_involved} trade${result.trade_king.trades_involved !== 1 ? 's' : ''}`}
        />
        <Callout
          tone="rose"
          eyebrow="Fleeced"
          title={rosterName(result.fleeced.roster_id)}
          stat={`${result.fleeced.cumulative_delta.toFixed(1)} pts net across ${result.fleeced.trades_involved} trade${result.fleeced.trades_involved !== 1 ? 's' : ''}`}
        />
        {result.robbery_of_year && (
          <Callout
            tone="coral"
            eyebrow="Robbery of the Year"
            title={`${rosterName(result.robbery_of_year.winner_roster_id)} robbed ${rosterName(result.robbery_of_year.loser_roster_id)}`}
            subtitle={`Week ${result.robbery_of_year.week}`}
            stat={`${result.robbery_of_year.robbery_score.toFixed(1)} pt swing`}
          />
        )}
      </div>
      <div className="rounded-2xl border border-hairline bg-surface overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-hairline text-muted uppercase text-xs tracking-wider">
              <th className="px-4 py-3 text-left">Manager</th>
              <th className="px-4 py-3 text-right">Net Delta</th>
              <th className="px-4 py-3 text-right hidden sm:table-cell">Trades</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-hairline">
            {[...result.roster_grades]
              .sort((a, b) => b.cumulative_delta - a.cumulative_delta)
              .map(r => {
                const info = rosterNames.get(r.roster_id)
                const isKing = r.roster_id === result.trade_king.roster_id
                const isFleeced = r.roster_id === result.fleeced.roster_id
                return (
                  <tr
                    key={r.roster_id}
                    className={`hover:bg-surface-2 transition-colors ${isKing ? 'bg-lime-950/10' : ''} ${isFleeced ? 'bg-rose-950/10' : ''}`}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Avatar src={info?.avatar_url} name={info?.real_name ?? 'T'} size="sm" />
                        <div>
                          <p className="font-semibold text-ink text-xs">{info?.display_name ?? `Team ${r.roster_id}`}</p>
                          <p className="text-faint text-xs">{info?.real_name}</p>
                        </div>
                        {isKing && <Badge tone="lime">King</Badge>}
                        {isFleeced && <Badge tone="rose">Fleeced</Badge>}
                      </div>
                    </td>
                    <td className={`px-4 py-3 text-right font-mono font-bold ${r.cumulative_delta > 0 ? 'text-lime-300' : r.cumulative_delta < 0 ? 'text-rose-300' : 'text-muted'}`}>
                      {r.cumulative_delta >= 0 ? '+' : ''}{r.cumulative_delta.toFixed(1)}
                    </td>
                    <td className="px-4 py-3 text-right text-muted hidden sm:table-cell">{r.trades_involved}</td>
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
    <section className="mb-14">
      <SectionHeading
        title="Waiver Wire ROI"
        subtitle={isFAAB ? 'Points gained per FAAB dollar spent.' : 'Points gained from waiver pickups.'}
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <Callout
          tone="teal"
          eyebrow="Waiver Wizard"
          title={rosterName(result.waiver_wizard.roster_id)}
          stat={isFAAB ? `${result.waiver_wizard.roi.toFixed(2)} pts/$` : `${result.waiver_wizard.total_points_gained.toFixed(1)} pts gained`}
        />
        {isFAAB && result.money_drain && (
          <Callout
            tone="rose"
            eyebrow="Money Drain"
            title={rosterName(result.money_drain.roster_id)}
            stat={`$${result.money_drain.total_faab_spent} spent · ${result.money_drain.total_points_gained.toFixed(1)} pts`}
          />
        )}
      </div>
      {topAdds.length > 0 && (
        <div className="rounded-2xl border border-hairline bg-surface overflow-hidden">
          <div className="px-4 py-2 border-b border-hairline text-muted text-xs uppercase tracking-wider">
            Top 5 Waiver Adds by Points Gained
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-faint text-xs uppercase tracking-wider">
                <th className="px-4 py-2 text-left">Player</th>
                <th className="px-4 py-2 text-left hidden sm:table-cell">Manager</th>
                <th className="px-4 py-2 text-right">Pts Gained</th>
                {isFAAB && <th className="px-4 py-2 text-right hidden sm:table-cell">FAAB</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline">
              {topAdds.map((add, i) => (
                <tr key={add.transaction_id} className="hover:bg-surface-2">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {i === 0 && <span className="text-gold-400">★</span>}
                      <span className="text-ink font-medium">{add.player_name}</span>
                      <span className="text-faint text-xs">Wk{add.week}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted text-xs hidden sm:table-cell">
                    {rosterName(add.roster_id)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-lime-300 font-bold">
                    {add.points_gained.toFixed(1)}
                  </td>
                  {isFAAB && (
                    <td className="px-4 py-3 text-right font-mono text-muted hidden sm:table-cell">
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
  const allIds = new Set<number>()
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

  if (benchTax && benchTax.leaderboard.length > 0) {
    const captainBench = benchTax.leaderboard[0]
    awards.get(captainBench.roster_id)?.shame.push('Captain Bench')
    awards.get(benchTax.best_setter.roster_id)?.fame.push('Best Lineup Setter')
  }

  if (draftGrade) {
    awards.get(draftGrade.result.best_drafter.roster_id)?.fame.push('Best Drafter')
    draftGrade.result.rosters
      .filter(r => r.letter_grade === 'F')
      .forEach(r => awards.get(r.roster_id)?.shame.push('F-Grade Drafter'))
  }

  if (tradeGrade && tradeGrade.result.graded_trades.length > 0) {
    awards.get(tradeGrade.result.trade_king.roster_id)?.fame.push('Trade King')
    awards.get(tradeGrade.result.fleeced.roster_id)?.shame.push('Fleeced')
  }

  if (waiverRoi) {
    awards.get(waiverRoi.result.waiver_wizard.roster_id)?.fame.push('Waiver Wizard')
    if (waiverRoi.result.money_drain) {
      awards.get(waiverRoi.result.money_drain.roster_id)?.shame.push('Money Drain')
    }
  }

  if (standings && standings.length > 0) {
    const sorted = [...standings].sort((a, b) => b.points_for - a.points_for)
    awards.get(sorted[0].roster_id)?.fame.push('Points King')
    awards.get(sorted[sorted.length - 1].roster_id)?.shame.push('Points Last')
    const mostLucky = [...standings].sort((a, b) => b.luck_index - a.luck_index)[0]
    const mostUnlucky = [...standings].sort((a, b) => a.luck_index - b.luck_index)[0]
    awards.get(mostLucky.roster_id)?.fame.push('Luckiest')
    awards.get(mostUnlucky.roster_id)?.shame.push('Unluckiest')
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
    <section className="mb-14">
      <SectionHeading title="Award Board" subtitle="Every manager's tally of fame and shame across all categories." />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {managers.map(m => {
          const netScore = m.fame.length - m.shame.length
          const borderClass =
            netScore > 0
              ? 'border-lime-800 bg-lime-950/10'
              : netScore < 0
              ? 'border-rose-800 bg-rose-950/10'
              : 'border-hairline bg-surface'

          return (
            <div key={m.roster_id} className={`rounded-2xl border p-4 ${borderClass}`}>
              <div className="flex items-center gap-3 mb-3">
                <Avatar src={m.avatar_url} name={m.real_name} size="lg" />
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-ink truncate">{m.display_name}</p>
                  <p className="text-faint text-xs">{m.real_name}</p>
                </div>
                <div className="flex gap-2 text-sm font-bold shrink-0">
                  <span className="text-lime-400">{m.fame.length}</span>
                  <span className="text-faint">/</span>
                  <span className="text-rose-400">{m.shame.length}</span>
                </div>
              </div>
              {m.fame.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-1">
                  {m.fame.map((award, i) => (
                    <Badge key={i} tone="lime">{award}</Badge>
                  ))}
                </div>
              )}
              {m.shame.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {m.shame.map((award, i) => (
                    <Badge key={i} tone="rose">{award}</Badge>
                  ))}
                </div>
              )}
              {m.fame.length === 0 && m.shame.length === 0 && (
                <p className="text-faint text-xs italic">No awards yet</p>
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
    <main className="min-h-screen px-4 py-10">
      <div className="max-w-4xl mx-auto">
        <PageHeader
          eyebrow="Fame & shame, quantified"
          title="Hall of Fame"
          subtitle="Season leaderboards across every category — from bench blunders to waiver wizardry."
        />

        {!anyData && (
          <EmptyState icon="🐚" title="Data is loading or unavailable" subtitle="Check back soon." />
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
