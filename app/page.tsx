// app/page.tsx
import Link from 'next/link'
import { getThisWeekData } from '@/lib/stats/this-week'
import { getAllStoredRecaps } from '@/lib/recap/generate'
import { CURRENT_LEAGUE_ID } from '@/lib/constants'

export const dynamic = 'force-dynamic'
export const revalidate = 300

function AwardCard({ emoji, title, subtitle, detail }: { emoji: string; title: string; subtitle: string; detail?: string }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex gap-3 items-start">
      <span className="text-2xl mt-0.5">{emoji}</span>
      <div>
        <p className="text-gray-400 text-xs uppercase tracking-wider mb-0.5">{title}</p>
        <p className="text-white font-bold leading-tight">{subtitle}</p>
        {detail && <p className="text-gray-400 text-xs mt-1">{detail}</p>}
      </div>
    </div>
  )
}

const NAV_LINKS = [
  { href: '/standings',    label: '📊 Standings'    },
  { href: '/hall-of-fame', label: '🏆 Hall of Shame' },
  { href: '/draft',        label: '📋 Draft Recap'   },
  { href: '/trades',       label: '🔄 Trades'        },
  { href: '/rivalries',    label: '⚔️ Rivalries'     },
  { href: '/archive',      label: '📰 Archive'       },
]

export default async function HomePage() {
  // Fetch in parallel; failures degrade gracefully
  const [weekData, recaps] = await Promise.allSettled([
    getThisWeekData(),
    getAllStoredRecaps(CURRENT_LEAGUE_ID),
  ])

  const week = weekData.status === 'fulfilled' ? weekData.value : null
  const latestRecap = recaps.status === 'fulfilled' && recaps.value.length > 0 ? recaps.value[0] : null

  return (
    <main className="min-h-screen bg-gray-950 text-white px-4 py-8">
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-5xl font-black tracking-tight mb-1">🏝️ League Roast HQ</h1>
          {week && (
            <p className="text-gray-400 text-lg">
              Week {week.week} · {week.season} Season
            </p>
          )}
        </div>

        {/* AI Recap — top of page if available */}
        {latestRecap && (
          <section className="mb-10">
            <div className="bg-gradient-to-br from-indigo-950 to-purple-950 border border-indigo-800 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-indigo-300">
                  🤖 Commissioner&apos;s Recap — Week {latestRecap.week}
                </h2>
                <Link href="/archive" className="text-indigo-400 text-xs hover:text-indigo-300 transition-colors">
                  All recaps →
                </Link>
              </div>
              <p className="text-gray-200 leading-relaxed whitespace-pre-line">{latestRecap.recap_text}</p>
              <p className="text-indigo-600 text-xs mt-4">
                Generated {new Date(latestRecap.generated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </p>
            </div>
          </section>
        )}

        {/* Scoreboard */}
        {week && week.matchups.length > 0 && (
          <section className="mb-10">
            <h2 className="text-xl font-bold mb-4 text-gray-200">
              🏈 Week {week.week} Scoreboard
            </h2>
            <div className="space-y-3">
              {week.matchups.map(m => (
                <div key={m.matchup_id} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {m.home.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={m.home.avatar_url} alt="" className="w-9 h-9 rounded-full bg-gray-700 shrink-0" />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center font-bold text-sm shrink-0 text-white">
                          {m.home.real_name[0]}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="font-semibold text-sm truncate">{m.home.display_name}</p>
                        <p className="text-gray-500 text-xs">{m.home.real_name}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className={`text-2xl font-black font-mono ${m.home.points >= m.away.points ? 'text-green-400' : 'text-gray-500'}`}>
                        {m.home.points.toFixed(2)}
                      </span>
                      <span className="text-gray-700 text-sm font-bold">–</span>
                      <span className={`text-2xl font-black font-mono ${m.away.points > m.home.points ? 'text-green-400' : 'text-gray-500'}`}>
                        {m.away.points.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 flex-1 min-w-0 justify-end">
                      <div className="min-w-0 text-right">
                        <p className="font-semibold text-sm truncate">{m.away.display_name}</p>
                        <p className="text-gray-500 text-xs">{m.away.real_name}</p>
                      </div>
                      {m.away.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={m.away.avatar_url} alt="" className="w-9 h-9 rounded-full bg-gray-700 shrink-0" />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-pink-500 to-red-600 flex items-center justify-center font-bold text-sm shrink-0 text-white">
                          {m.away.real_name[0]}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Weekly Awards */}
        {week?.awards && (
          <section className="mb-10">
            <h2 className="text-xl font-bold mb-4 text-gray-200">🏆 Week {week.week} Awards</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {week.awards.highest_scorer && (
                <AwardCard emoji="🔥" title="Highest Score" subtitle={`${week.awards.highest_scorer.points.toFixed(2)} pts`} detail={`Roster #${week.awards.highest_scorer.roster_id}`} />
              )}
              {week.awards.lowest_scorer && (
                <AwardCard emoji="🧊" title="Lowest Score" subtitle={`${week.awards.lowest_scorer.points.toFixed(2)} pts`} detail={`Roster #${week.awards.lowest_scorer.roster_id}`} />
              )}
              {week.awards.biggest_blowout && (
                <AwardCard emoji="💥" title="Biggest Blowout" subtitle={`+${week.awards.biggest_blowout.margin.toFixed(2)} margin`} detail={`R${week.awards.biggest_blowout.winner_roster_id} def R${week.awards.biggest_blowout.loser_roster_id}`} />
              )}
              {week.awards.closest_game && (
                <AwardCard emoji="😰" title="Nail-Biter" subtitle={`${week.awards.closest_game.margin.toFixed(2)} pts apart`} detail={`R${week.awards.closest_game.winner_roster_id} vs R${week.awards.closest_game.loser_roster_id}`} />
              )}
              {week.awards.shouldve_won && (
                <AwardCard emoji="😭" title="Should've Won" subtitle={`${week.awards.shouldve_won.points.toFixed(2)} pts — LOST`} detail={`Roster #${week.awards.shouldve_won.roster_id}`} />
              )}
              {week.awards.shouldve_lost && (
                <AwardCard emoji="🎰" title="Lucky Winner" subtitle={`${week.awards.shouldve_lost.points.toFixed(2)} pts — won anyway`} detail={`Roster #${week.awards.shouldve_lost.roster_id}`} />
              )}
            </div>
          </section>
        )}

        {/* Quick nav */}
        <section>
          <h2 className="text-lg font-bold mb-3 text-gray-400">More</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {NAV_LINKS.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className="bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 text-sm font-semibold hover:border-gray-600 hover:bg-gray-800 transition-all"
              >
                {label}
              </Link>
            ))}
          </div>
        </section>

      </div>
    </main>
  )
}
