// app/trades/page.tsx
import { getTradePageData } from '@/lib/stats/trade-grade-data'
import { resolveSeason } from '@/lib/season'
import { PageHeader } from '@/components/PageHeader'
import { EmptyState } from '@/components/EmptyState'
import { Callout } from '@/components/Card'
import { Badge, type Tone } from '@/components/Badge'

export const metadata = { title: 'Trades' }

export const dynamic = 'force-dynamic'
export const revalidate = 1800 // 30 min

function DeltaBadge({ delta }: { delta: number }) {
  const tone: Tone = delta > 30 ? 'lime' : delta > 0 ? 'teal' : delta > -30 ? 'neutral' : 'rose'
  return (
    <Badge tone={tone}>
      {delta >= 0 ? '+' : ''}
      {delta.toFixed(1)}
    </Badge>
  )
}

export default async function TradesPage({
  searchParams,
}: {
  searchParams: Promise<{ season?: string }>
}) {
  const { season: seasonParam } = await searchParams
  const { leagueId, year } = await resolveSeason(seasonParam)

  let data
  try {
    data = await getTradePageData(leagueId)
  } catch (err) {
    return (
      <main className="min-h-screen px-4 py-10">
        <div className="max-w-4xl mx-auto">
          <EmptyState icon="🌊" title="Couldn't load trades" subtitle={String(err)} />
        </div>
      </main>
    )
  }

  const { result, rosterNames, playerNames } = data

  function rosterName(id: number) {
    return rosterNames.get(id)?.display_name ?? `Team ${id}`
  }
  function playerName(id: string) {
    return playerNames.get(id) ?? id
  }

  return (
    <main className="min-h-screen px-4 py-10">
      <div className="max-w-4xl mx-auto">
        <PageHeader
          eyebrow={year ? `Who got got — ${year}` : 'Who got got'}
          title="Trades"
          subtitle="Graded by rest-of-season fantasy points each side received. Positive = won the trade."
        />

        {/* Summary leaderboard */}
        {result.roster_grades.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
            <Callout
              tone="lime"
              eyebrow="Trade King"
              title={rosterName(result.trade_king.roster_id)}
              stat={`+${result.trade_king.cumulative_delta.toFixed(1)} pts net`}
              subtitle={`${result.trade_king.trades_involved} trade${result.trade_king.trades_involved !== 1 ? 's' : ''}`}
            />
            <Callout
              tone="rose"
              eyebrow="Fleeced"
              title={rosterName(result.fleeced.roster_id)}
              stat={`${result.fleeced.cumulative_delta.toFixed(1)} pts net`}
              subtitle={`${result.fleeced.trades_involved} trade${result.fleeced.trades_involved !== 1 ? 's' : ''}`}
            />
            {result.robbery_of_year && (
              <Callout
                tone="coral"
                eyebrow="Robbery of the Year"
                title={`${rosterName(result.robbery_of_year.winner_roster_id)} robbed ${rosterName(result.robbery_of_year.loser_roster_id)}`}
                stat={`Week ${result.robbery_of_year.week} · ${result.robbery_of_year.robbery_score.toFixed(1)} pt swing`}
              />
            )}
          </div>
        )}

        {/* Trade history */}
        <div className="space-y-6">
          {result.graded_trades.length === 0 && (
            <p className="text-muted text-center py-12">No completed trades yet this season.</p>
          )}
          {[...result.graded_trades]
            .sort((a, b) => b.week - a.week)
            .map(trade => (
              <div
                key={trade.transaction_id}
                className={`rounded-2xl border p-5 ${
                  trade.is_in_progress
                    ? 'border-gold-800 bg-gold-950/10'
                    : 'border-hairline bg-surface'
                }`}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-muted">Week {trade.week}</span>
                    {trade.is_in_progress && <Badge tone="gold">In Progress</Badge>}
                  </div>
                  <span className="text-xs text-faint">
                    Robbery: {trade.robbery_score.toFixed(1)} pts
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {trade.participants.map(p => (
                    <div
                      key={p.roster_id}
                      className={`rounded-xl p-3 border ${
                        p.trade_value_delta >= 0
                          ? 'bg-lime-950/20 border-lime-900'
                          : 'bg-rose-950/20 border-rose-900'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-sm text-ink">{rosterName(p.roster_id)}</span>
                        <DeltaBadge delta={p.trade_value_delta} />
                      </div>
                      <div className="text-xs text-muted space-y-1">
                        <div>
                          <span className="text-lime-400 font-semibold">Received: </span>
                          {p.players_received.length > 0
                            ? p.players_received.map(pid => playerName(pid)).join(', ')
                            : '—'}
                          {p.players_received.length > 0 && (
                            <span className="text-faint ml-1">
                              ({p.ros_points_received.toFixed(0)} pts ROS)
                            </span>
                          )}
                        </div>
                        <div>
                          <span className="text-rose-400 font-semibold">Gave away: </span>
                          {p.players_given.length > 0
                            ? p.players_given.map(pid => playerName(pid)).join(', ')
                            : '—'}
                          {p.players_given.length > 0 && (
                            <span className="text-faint ml-1">
                              ({p.ros_points_given.toFixed(0)} pts ROS)
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
        </div>
      </div>
    </main>
  )
}
