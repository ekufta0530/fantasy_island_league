// app/team/[username]/page.tsx
import { notFound } from 'next/navigation'
import { getTeamData, enrichTeamData } from '@/lib/stats/team-data'
import { getStandingsData } from '@/lib/stats/standings'
import { getBenchTaxData } from '@/lib/stats/bench-tax-data'
import { getDraftGradeData } from '@/lib/stats/draft-grade-data'
import { getTradePageData } from '@/lib/stats/trade-grade-data'
import { getWaiverRoiData } from '@/lib/stats/waiver-roi-data'
import { MANAGERS, getManagerByUsername } from '@/lib/managers'
import { Avatar } from '@/components/Avatar'
import { SectionHeading } from '@/components/PageHeader'
import { StatTile } from '@/components/StatTile'
import { Badge } from '@/components/Badge'
import { EmptyState } from '@/components/EmptyState'

export const revalidate = 300

export function generateStaticParams() {
  return MANAGERS.map(m => ({ username: m.username }))
}

export default async function TeamPage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params

  // A username that isn't in our roster config is a real 404 — no point fetching.
  if (!getManagerByUsername(username)) notFound()

  const [baseData, standings, benchTax, draftGrade, tradeGrade, waiverRoi] = await Promise.allSettled([
    getTeamData(username),
    getStandingsData(),
    getBenchTaxData(),
    getDraftGradeData(),
    getTradePageData(),
    getWaiverRoiData(),
  ])

  // A rejection here means an upstream fetch (Sleeper/Supabase) failed —
  // that's a data-layer problem, not a missing page, so show the real error
  // instead of a silent 404.
  if (baseData.status === 'rejected') {
    return (
      <main className="min-h-screen px-4 py-10">
        <div className="max-w-4xl mx-auto">
          <EmptyState icon="🌊" title="Couldn't load this team" subtitle={String(baseData.reason)} />
        </div>
      </main>
    )
  }

  const base = baseData.value
  if (!base) notFound()

  const team = enrichTeamData(base, {
    standings: standings.status === 'fulfilled'
      ? standings.value.map(s => ({ roster_id: s.roster_id, power_rank: s.power_rank, luck_index: s.luck_index }))
      : null,
    benchTaxLeaderboard: benchTax.status === 'fulfilled'
      ? benchTax.value.leaderboard.map(b => ({ roster_id: b.roster_id, total_bench_tax: b.total_bench_tax }))
      : null,
    draftGradeRosters: draftGrade.status === 'fulfilled'
      ? draftGrade.value.result.rosters.map(r => ({ roster_id: r.roster_id, letter_grade: r.letter_grade, grade_score: r.grade_score, rank: r.rank }))
      : null,
    tradeGradeRosters: tradeGrade.status === 'fulfilled'
      ? tradeGrade.value.result.roster_grades.map(r => ({ roster_id: r.roster_id, cumulative_delta: r.cumulative_delta }))
      : null,
    tradeKingRosterId: tradeGrade.status === 'fulfilled' ? tradeGrade.value.result.trade_king?.roster_id ?? null : null,
    waiverRosters: waiverRoi.status === 'fulfilled'
      ? waiverRoi.value.result.roster_summaries.map(r => ({ roster_id: r.roster_id, total_points_gained: r.total_points_gained }))
      : null,
    waiverWizardRosterId: waiverRoi.status === 'fulfilled' ? waiverRoi.value.result.waiver_wizard?.roster_id ?? null : null,
  })

  return (
    <main className="min-h-screen px-4 py-10">
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="flex items-center gap-5 mb-10">
          <Avatar src={team.avatar_url} name={team.real_name} size="xl" />
          <div>
            <h1 className="font-display text-4xl font-bold tracking-tight text-ink">{team.display_name}</h1>
            <p className="text-muted mt-0.5">{team.real_name} · {team.nfl_team} fan</p>
            <p className="text-faint text-sm mt-1 max-w-lg">{team.persona_notes}</p>
          </div>
        </div>

        {/* Season stats grid */}
        <section className="mb-8">
          <SectionHeading title="Season Stats" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatTile label="Record" value={`${team.wins}–${team.losses}${team.ties > 0 ? `–${team.ties}` : ''}`} />
            <StatTile label="Points For" value={team.points_for.toFixed(1)} tone="teal" />
            <StatTile
              label="Power Rank"
              value={team.power_rank ? `#${team.power_rank}` : '—'}
              tone={team.power_rank === 1 ? 'gold' : 'neutral'}
            />
            <StatTile
              label="Luck Index"
              value={team.luck_index !== null ? (team.luck_index >= 0 ? `+${team.luck_index.toFixed(2)}` : team.luck_index.toFixed(2)) : '—'}
              sub={team.luck_index !== null ? (team.luck_index > 0.5 ? 'Lucky schedule' : team.luck_index < -0.5 ? 'Rough schedule' : 'Fair schedule') : undefined}
            />
          </div>
        </section>

        {/* Advanced stats */}
        <section className="mb-8">
          <SectionHeading title="Advanced Stats" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatTile
              label="Bench Tax"
              value={team.bench_tax_total !== null ? team.bench_tax_total.toFixed(1) : '—'}
              sub={team.bench_tax_rank !== null ? `Rank #${team.bench_tax_rank} (higher = worse)` : undefined}
            />
            <StatTile
              label="Draft Grade"
              value={team.draft_grade ?? '—'}
              sub={team.draft_grade_score !== null ? `Score: ${team.draft_grade_score >= 0 ? '+' : ''}${team.draft_grade_score}` : undefined}
              tone={team.draft_grade_rank === 1 ? 'gold' : 'neutral'}
            />
            <StatTile
              label="Trade Δ"
              value={team.trade_delta !== null ? (team.trade_delta >= 0 ? `+${team.trade_delta.toFixed(1)}` : team.trade_delta.toFixed(1)) : '—'}
              sub={team.trade_king ? 'Trade King' : undefined}
              tone={team.trade_king ? 'gold' : 'neutral'}
            />
            <StatTile
              label="Waiver Pts"
              value={team.waiver_points !== null ? team.waiver_points.toFixed(1) : '—'}
              sub={team.waiver_wizard ? 'Waiver Wizard' : undefined}
              tone={team.waiver_wizard ? 'gold' : 'neutral'}
            />
          </div>
        </section>

        {/* H2H records */}
        {team.h2h.length > 0 && (
          <section className="mb-8">
            <SectionHeading title="Head-to-Head (This Season)" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {team.h2h.map(rec => (
                <div key={rec.opponent_username} className="bg-surface border border-hairline rounded-xl p-4">
                  <p className="font-semibold text-sm text-ink">{rec.opponent_display_name}</p>
                  <p className="font-display text-2xl font-bold mt-1">
                    <span className="text-lime-300">{rec.wins}</span>
                    <span className="text-faint">–</span>
                    <span className="text-rose-300">{rec.losses}</span>
                    {rec.ties > 0 && <span className="text-muted">–{rec.ties}</span>}
                  </p>
                  <p className="text-faint text-xs mt-1">PF: {rec.points_for.toFixed(1)} / PA: {rec.points_against.toFixed(1)}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Current roster */}
        {team.current_roster.length > 0 && (
          <section>
            <SectionHeading title="Current Roster" />
            <div className="flex flex-wrap gap-2">
              {team.current_roster.map(name => (
                <Badge key={name} tone="neutral" className="text-sm px-3 py-1">{name}</Badge>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  )
}
