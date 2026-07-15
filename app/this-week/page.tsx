// app/this-week/page.tsx
import { getThisWeekData } from '@/lib/stats/this-week'
import { PageHeader, SectionHeading } from '@/components/PageHeader'
import { EmptyState } from '@/components/EmptyState'
import { ScoreRow } from '@/components/ScoreRow'
import { Callout } from '@/components/Card'

export const metadata = { title: 'This Week' }

export const dynamic = 'force-dynamic'
export const revalidate = 300

export default async function ThisWeekPage() {
  let data
  try {
    data = await getThisWeekData()
  } catch (err) {
    return (
      <main className="min-h-screen px-4 py-10">
        <div className="max-w-4xl mx-auto">
          <EmptyState icon="🌊" title="Couldn't load this week's data" subtitle={String(err)} />
        </div>
      </main>
    )
  }

  const { week, season, matchups, awards, transactions } = data

  return (
    <main className="min-h-screen px-4 py-10">
      <div className="max-w-4xl mx-auto">
        <PageHeader eyebrow={`${season} Season`} title={`Week ${week}`} />

        {/* Matchup scoreboard */}
        <section className="mb-10">
          <SectionHeading title="Scoreboard" />
          <div className="space-y-3">
            {matchups.length === 0 && (
              <p className="text-muted italic">No matchups yet for this week.</p>
            )}
            {matchups.map(m => (
              <ScoreRow key={m.matchup_id} home={m.home} away={m.away} />
            ))}
          </div>
        </section>

        {/* Weekly Awards */}
        {awards && (
          <section className="mb-10">
            <SectionHeading title={`Week ${week} Awards`} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Callout tone="coral" eyebrow="Highest Score" title={`${awards.highest_scorer.points.toFixed(2)} pts`} subtitle={`Roster #${awards.highest_scorer.roster_id}`} />
              <Callout tone="teal" eyebrow="Lowest Score" title={`${awards.lowest_scorer.points.toFixed(2)} pts`} subtitle={`Roster #${awards.lowest_scorer.roster_id}`} />
              <Callout tone="gold" eyebrow="Biggest Blowout" title={`+${awards.biggest_blowout.margin.toFixed(2)} margin`} subtitle={`R${awards.biggest_blowout.winner_roster_id} ${awards.biggest_blowout.winner_points.toFixed(2)} — R${awards.biggest_blowout.loser_roster_id} ${awards.biggest_blowout.loser_points.toFixed(2)}`} />
              <Callout tone="teal" eyebrow="Nail-Biter" title={`Only ${awards.closest_game.margin.toFixed(2)} pts`} subtitle={`R${awards.closest_game.winner_roster_id} edged R${awards.closest_game.loser_roster_id}`} />
              {awards.shouldve_won && (
                <Callout tone="rose" eyebrow="Should've Won" title={`${awards.shouldve_won.points.toFixed(2)} pts — and LOST`} subtitle={`Roster #${awards.shouldve_won.roster_id} had the highest losing score`} />
              )}
              {awards.shouldve_lost && (
                <Callout tone="gold" eyebrow="Lucky Winner" title={`${awards.shouldve_lost.points.toFixed(2)} pts — somehow won`} subtitle={`Roster #${awards.shouldve_lost.roster_id} had the lowest winning score`} />
              )}
              {awards.bench_tax_leader && (
                <Callout tone="rose" eyebrow="Worst Lineup Decision" title={`Left ${awards.bench_tax_leader.bench_tax.toFixed(2)} pts on the bench`} subtitle={`Roster #${awards.bench_tax_leader.roster_id} — Captain Bench strikes again`} />
              )}
            </div>
          </section>
        )}

        {/* Transactions */}
        {transactions.length > 0 && (
          <section>
            <SectionHeading title="Moves This Week" />
            <div className="space-y-2">
              {transactions.map((t, i) => (
                <div key={i} className="bg-surface border border-hairline rounded-xl px-4 py-3 text-sm text-muted">
                  {t.summary}
                </div>
              ))}
            </div>
          </section>
        )}

        {!awards && matchups.length === 0 && (
          <EmptyState title="No games yet this week" subtitle="Check back once the matchups kick off." />
        )}
      </div>
    </main>
  )
}
