// app/page.tsx
import Link from 'next/link'
import { getThisWeekData } from '@/lib/stats/this-week'
import { getAllStoredRecaps } from '@/lib/recap/generate'
import { CURRENT_LEAGUE_ID } from '@/lib/constants'
import { ScoreRow } from '@/components/ScoreRow'
import { SectionHeading } from '@/components/PageHeader'
import { Card, Callout } from '@/components/Card'

export const dynamic = 'force-dynamic'
export const revalidate = 300

const NAV_LINKS = [
  { href: '/standings', label: 'Standings' },
  { href: '/hall-of-fame', label: 'Hall of Fame' },
  { href: '/draft', label: 'Draft Recap' },
  { href: '/trades', label: 'Trades' },
  { href: '/rivalries', label: 'Rivalries' },
  { href: '/archive', label: 'Archive' },
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
    <main className="min-h-screen px-4 py-10">
      <div className="max-w-4xl mx-auto">

        {/* Hero */}
        <div className="mb-10">
          <p className="text-coral-400 text-xs font-bold uppercase tracking-[0.2em] mb-2">
            A decade-plus of league history, mercilessly quantified
          </p>
          <h1 className="font-display text-5xl sm:text-6xl font-bold tracking-tight mb-2">
            Fantasy Island
          </h1>
          {week && (
            <p className="text-muted text-lg">
              Week {week.week} · {week.season} Season
            </p>
          )}
        </div>

        {/* AI Recap */}
        {latestRecap && (
          <section className="mb-10">
            <Card className="p-6 relative overflow-hidden">
              <div className="absolute inset-0 bg-linear-to-br from-coral-500/10 via-transparent to-gold-500/10 pointer-events-none" />
              <div className="relative">
                <div className="flex items-center justify-between mb-4 gap-4">
                  <h2 className="font-display text-lg font-bold text-gold-300">
                    Commissioner&apos;s Recap — Week {latestRecap.week}
                  </h2>
                  <Link href="/archive" className="text-coral-400 text-xs font-semibold hover:text-coral-300 transition-colors shrink-0">
                    All recaps →
                  </Link>
                </div>
                <p className="text-ink/90 leading-relaxed whitespace-pre-line">{latestRecap.recap_text}</p>
                <p className="text-faint text-xs mt-4">
                  Generated {new Date(latestRecap.generated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </p>
              </div>
            </Card>
          </section>
        )}

        {/* Scoreboard */}
        {week && week.matchups.length > 0 && (
          <section className="mb-10">
            <SectionHeading title={`Week ${week.week} Scoreboard`} />
            <div className="space-y-3">
              {week.matchups.map(m => (
                <ScoreRow key={m.matchup_id} home={m.home} away={m.away} />
              ))}
            </div>
          </section>
        )}

        {/* Weekly Awards */}
        {week?.awards && (
          <section className="mb-10">
            <SectionHeading title={`Week ${week.week} Awards`} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {week.awards.highest_scorer && (
                <Callout tone="coral" eyebrow="Highest Score" title={`${week.awards.highest_scorer.points.toFixed(2)} pts`} subtitle={`Roster #${week.awards.highest_scorer.roster_id}`} />
              )}
              {week.awards.lowest_scorer && (
                <Callout tone="teal" eyebrow="Lowest Score" title={`${week.awards.lowest_scorer.points.toFixed(2)} pts`} subtitle={`Roster #${week.awards.lowest_scorer.roster_id}`} />
              )}
              {week.awards.biggest_blowout && (
                <Callout tone="gold" eyebrow="Biggest Blowout" title={`+${week.awards.biggest_blowout.margin.toFixed(2)} margin`} subtitle={`R${week.awards.biggest_blowout.winner_roster_id} def R${week.awards.biggest_blowout.loser_roster_id}`} />
              )}
              {week.awards.closest_game && (
                <Callout tone="teal" eyebrow="Nail-Biter" title={`${week.awards.closest_game.margin.toFixed(2)} pts apart`} subtitle={`R${week.awards.closest_game.winner_roster_id} vs R${week.awards.closest_game.loser_roster_id}`} />
              )}
              {week.awards.shouldve_won && (
                <Callout tone="rose" eyebrow="Should've Won" title={`${week.awards.shouldve_won.points.toFixed(2)} pts — LOST`} subtitle={`Roster #${week.awards.shouldve_won.roster_id}`} />
              )}
              {week.awards.shouldve_lost && (
                <Callout tone="gold" eyebrow="Lucky Winner" title={`${week.awards.shouldve_lost.points.toFixed(2)} pts — won anyway`} subtitle={`Roster #${week.awards.shouldve_lost.roster_id}`} />
              )}
            </div>
          </section>
        )}

        {/* Quick nav */}
        <section>
          <SectionHeading title="Dig deeper" />
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {NAV_LINKS.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className="bg-surface border border-hairline rounded-xl px-4 py-3 text-sm font-semibold hover:border-hairline-strong hover:bg-surface-2 transition-all"
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
