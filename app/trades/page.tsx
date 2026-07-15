// app/trades/page.tsx
import { getTradePageData } from '@/lib/stats/trade-grade-data'

export const metadata = { title: 'Trades' }

export const dynamic = 'force-dynamic'
export const revalidate = 1800 // 30 min

function DeltaBadge({ delta }: { delta: number }) {
  const color =
    delta > 30
      ? 'bg-green-900 text-green-300'
      : delta > 0
      ? 'bg-emerald-900 text-emerald-300'
      : delta > -30
      ? 'bg-gray-800 text-gray-400'
      : 'bg-red-950 text-red-400'
  return (
    <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded-full ${color}`}>
      {delta >= 0 ? '+' : ''}
      {delta.toFixed(1)}
    </span>
  )
}

export default async function TradesPage() {
  let data
  try {
    data = await getTradePageData()
  } catch (err) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <p className="text-gray-400">⚠️ {String(err)}</p>
      </div>
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
    <main className="min-h-screen bg-gray-950 text-white px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-black mb-1 tracking-tight">🔄 Trades</h1>
        <p className="text-gray-400 text-sm mb-8">
          Graded by rest-of-season fantasy points each side received. Positive = won the trade.
        </p>

        {/* Summary leaderboard */}
        {result.roster_grades.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
            <div className="bg-green-950 border border-green-800 rounded-xl p-4">
              <p className="text-green-400 text-xs uppercase tracking-wider mb-1">👑 Trade King</p>
              <p className="text-white font-bold text-lg">{rosterName(result.trade_king.roster_id)}</p>
              <p className="text-green-300 font-mono font-bold">
                +{result.trade_king.cumulative_delta.toFixed(1)} pts net
              </p>
              <p className="text-green-500 text-xs mt-1">
                {result.trade_king.trades_involved} trade
                {result.trade_king.trades_involved !== 1 ? 's' : ''}
              </p>
            </div>
            <div className="bg-red-950 border border-red-800 rounded-xl p-4">
              <p className="text-red-400 text-xs uppercase tracking-wider mb-1">💸 Fleeced</p>
              <p className="text-white font-bold text-lg">{rosterName(result.fleeced.roster_id)}</p>
              <p className="text-red-300 font-mono font-bold">
                {result.fleeced.cumulative_delta.toFixed(1)} pts net
              </p>
              <p className="text-red-500 text-xs mt-1">
                {result.fleeced.trades_involved} trade
                {result.fleeced.trades_involved !== 1 ? 's' : ''}
              </p>
            </div>
            {result.robbery_of_year && (
              <div className="bg-orange-950 border border-orange-800 rounded-xl p-4">
                <p className="text-orange-400 text-xs uppercase tracking-wider mb-1">
                  🚨 Robbery of the Year
                </p>
                <p className="text-white font-bold">
                  {rosterName(result.robbery_of_year.winner_roster_id)} robbed{' '}
                  {rosterName(result.robbery_of_year.loser_roster_id)}
                </p>
                <p className="text-orange-300 font-mono text-sm mt-1">
                  Week {result.robbery_of_year.week} · {result.robbery_of_year.robbery_score.toFixed(1)} pt swing
                </p>
              </div>
            )}
          </div>
        )}

        {/* Trade history */}
        <div className="space-y-6">
          {result.graded_trades.length === 0 && (
            <p className="text-gray-500 text-center py-12">No completed trades yet this season.</p>
          )}
          {[...result.graded_trades]
            .sort((a, b) => b.week - a.week)
            .map(trade => (
              <div
                key={trade.transaction_id}
                className={`rounded-xl border ${
                  trade.is_in_progress
                    ? 'border-yellow-800 bg-yellow-950/20'
                    : 'border-gray-800 bg-gray-900'
                } p-5`}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-300">Week {trade.week}</span>
                    {trade.is_in_progress && (
                      <span className="text-xs bg-yellow-900 text-yellow-300 px-2 py-0.5 rounded-full">
                        ⏳ In Progress
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-gray-500">
                    Robbery: {trade.robbery_score.toFixed(1)} pts
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {trade.participants.map(p => (
                    <div
                      key={p.roster_id}
                      className={`rounded-lg p-3 border ${
                        p.trade_value_delta >= 0
                          ? 'bg-green-950/30 border-green-900'
                          : 'bg-red-950/30 border-red-900'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-sm">{rosterName(p.roster_id)}</span>
                        <DeltaBadge delta={p.trade_value_delta} />
                      </div>
                      <div className="text-xs text-gray-400 space-y-1">
                        <div>
                          <span className="text-green-500 font-semibold">Received: </span>
                          {p.players_received.length > 0
                            ? p.players_received.map(pid => playerName(pid)).join(', ')
                            : '—'}
                          {p.players_received.length > 0 && (
                            <span className="text-gray-500 ml-1">
                              ({p.ros_points_received.toFixed(0)} pts ROS)
                            </span>
                          )}
                        </div>
                        <div>
                          <span className="text-red-500 font-semibold">Gave away: </span>
                          {p.players_given.length > 0
                            ? p.players_given.map(pid => playerName(pid)).join(', ')
                            : '—'}
                          {p.players_given.length > 0 && (
                            <span className="text-gray-500 ml-1">
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
