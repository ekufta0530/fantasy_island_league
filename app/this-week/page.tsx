// app/this-week/page.tsx
import { getThisWeekData } from '@/lib/stats/this-week'

export const metadata = { title: 'This Week' }

export const dynamic = 'force-dynamic'
export const revalidate = 300

function AwardCard({ emoji, title, subtitle, detail }: { emoji: string; title: string; subtitle: string; detail?: string }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 flex gap-4 items-start hover:border-gray-700 transition-colors">
      <span className="text-3xl mt-0.5">{emoji}</span>
      <div>
        <p className="text-gray-400 text-xs uppercase tracking-wider mb-0.5">{title}</p>
        <p className="text-white font-bold text-lg leading-tight">{subtitle}</p>
        {detail && <p className="text-gray-400 text-sm mt-1">{detail}</p>}
      </div>
    </div>
  )
}

export default async function ThisWeekPage() {
  let data
  try {
    data = await getThisWeekData()
  } catch (err) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-2xl mb-2">⚠️ Couldn&apos;t load this week&apos;s data</p>
          <p className="text-gray-400 text-sm">{String(err)}</p>
        </div>
      </div>
    )
  }

  const { week, season, matchups, awards, transactions } = data

  return (
    <main className="min-h-screen bg-gray-950 text-white px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-black mb-1 tracking-tight">
          🏈 Week {week}
        </h1>
        <p className="text-gray-400 mb-8 text-sm">{season} Season</p>

        {/* Matchup scoreboard */}
        <section className="mb-10">
          <h2 className="text-xl font-bold mb-4 text-gray-200">Scoreboard</h2>
          <div className="space-y-3">
            {matchups.length === 0 && (
              <p className="text-gray-500 italic">No matchups yet for this week.</p>
            )}
            {matchups.map(m => (
              <div key={m.matchup_id} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                <div className="flex items-center justify-between gap-4">
                  {/* Home team */}
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {m.home.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={m.home.avatar_url} alt="" className="w-9 h-9 rounded-full bg-gray-700 shrink-0" />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center font-bold text-sm shrink-0">
                        {m.home.real_name[0]}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="font-semibold text-sm truncate">{m.home.display_name}</p>
                      <p className="text-gray-500 text-xs">{m.home.real_name}</p>
                    </div>
                  </div>
                  {/* Scores */}
                  <div className="flex items-center gap-3 shrink-0">
                    <span className={`text-2xl font-black font-mono tabular-nums ${m.home.points >= m.away.points ? 'text-green-400' : 'text-gray-400'}`}>
                      {m.home.points.toFixed(2)}
                    </span>
                    <span className="text-gray-600 text-sm font-bold">vs</span>
                    <span className={`text-2xl font-black font-mono tabular-nums ${m.away.points > m.home.points ? 'text-green-400' : 'text-gray-400'}`}>
                      {m.away.points.toFixed(2)}
                    </span>
                  </div>
                  {/* Away team */}
                  <div className="flex items-center gap-3 flex-1 min-w-0 justify-end">
                    <div className="min-w-0 text-right">
                      <p className="font-semibold text-sm truncate">{m.away.display_name}</p>
                      <p className="text-gray-500 text-xs">{m.away.real_name}</p>
                    </div>
                    {m.away.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={m.away.avatar_url} alt="" className="w-9 h-9 rounded-full bg-gray-700 shrink-0" />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-pink-500 to-red-600 flex items-center justify-center font-bold text-sm shrink-0">
                        {m.away.real_name[0]}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Weekly Awards */}
        {awards && (
          <section className="mb-10">
            <h2 className="text-xl font-bold mb-4 text-gray-200">🏆 Week {week} Awards</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <AwardCard
                emoji="🔥"
                title="Highest Score"
                subtitle={`${awards.highest_scorer.points.toFixed(2)} pts`}
                detail={`Roster #${awards.highest_scorer.roster_id}`}
              />
              <AwardCard
                emoji="🧊"
                title="Lowest Score"
                subtitle={`${awards.lowest_scorer.points.toFixed(2)} pts`}
                detail={`Roster #${awards.lowest_scorer.roster_id}`}
              />
              <AwardCard
                emoji="💥"
                title="Biggest Blowout"
                subtitle={`+${awards.biggest_blowout.margin.toFixed(2)} margin`}
                detail={`R${awards.biggest_blowout.winner_roster_id} ${awards.biggest_blowout.winner_points.toFixed(2)} — R${awards.biggest_blowout.loser_roster_id} ${awards.biggest_blowout.loser_points.toFixed(2)}`}
              />
              <AwardCard
                emoji="😰"
                title="Nail-Biter"
                subtitle={`Only ${awards.closest_game.margin.toFixed(2)} pts`}
                detail={`R${awards.closest_game.winner_roster_id} edged R${awards.closest_game.loser_roster_id}`}
              />
              {awards.shouldve_won && (
                <AwardCard
                  emoji="😭"
                  title="Should've Won"
                  subtitle={`${awards.shouldve_won.points.toFixed(2)} pts — and LOST`}
                  detail={`Roster #${awards.shouldve_won.roster_id} had the highest losing score`}
                />
              )}
              {awards.shouldve_lost && (
                <AwardCard
                  emoji="🎰"
                  title="Lucky Winner"
                  subtitle={`${awards.shouldve_lost.points.toFixed(2)} pts — somehow won`}
                  detail={`Roster #${awards.shouldve_lost.roster_id} had the lowest winning score`}
                />
              )}
              {awards.bench_tax_leader && (
                <AwardCard
                  emoji="🪑"
                  title="Worst Lineup Decision"
                  subtitle={`Left ${awards.bench_tax_leader.bench_tax.toFixed(2)} pts on the bench`}
                  detail={`Roster #${awards.bench_tax_leader.roster_id} — Captain Bench strikes again`}
                />
              )}
            </div>
          </section>
        )}

        {/* Transactions */}
        {transactions.length > 0 && (
          <section>
            <h2 className="text-xl font-bold mb-4 text-gray-200">📋 Moves This Week</h2>
            <div className="space-y-2">
              {transactions.map((t, i) => (
                <div key={i} className="bg-gray-900 border border-gray-800 rounded-lg px-4 py-3 text-sm text-gray-300">
                  {t.summary}
                </div>
              ))}
            </div>
          </section>
        )}

        {!awards && matchups.length === 0 && (
          <div className="text-center py-16 text-gray-600">
            <p className="text-5xl mb-4">🏈</p>
            <p className="text-lg font-semibold">No games yet this week</p>
            <p className="text-sm mt-2">Check back once the matchups kick off.</p>
          </div>
        )}
      </div>
    </main>
  )
}
