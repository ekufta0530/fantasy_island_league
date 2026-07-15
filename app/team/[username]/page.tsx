// app/team/[username]/page.tsx
import { notFound } from 'next/navigation'
import { getTeamData, enrichTeamData } from '@/lib/stats/team-data'
import { getStandingsData } from '@/lib/stats/standings'
import { getBenchTaxData } from '@/lib/stats/bench-tax-data'
import { getDraftGradeData } from '@/lib/stats/draft-grade-data'
import { getTradePageData } from '@/lib/stats/trade-grade-data'
import { getWaiverRoiData } from '@/lib/stats/waiver-roi-data'
import { MANAGERS } from '@/lib/managers'

export const revalidate = 300

export function generateStaticParams() {
  return MANAGERS.map(m => ({ username: m.username }))
}

function StatCard({ label, value, sub, highlight }: { label: string; value: string; sub?: string; highlight?: boolean }) {
  return (
    <div className={`rounded-xl border p-4 ${highlight ? 'bg-indigo-950 border-indigo-800' : 'bg-gray-900 border-gray-800'}`}>
      <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-2xl font-black ${highlight ? 'text-indigo-300' : 'text-white'}`}>{value}</p>
      {sub && <p className="text-gray-500 text-xs mt-1">{sub}</p>}
    </div>
  )
}

export default async function TeamPage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params

  // Fetch base team data + all engine data in parallel
  const [baseData, standings, benchTax, draftGrade, tradeGrade, waiverRoi] = await Promise.allSettled([
    getTeamData(username),
    getStandingsData(),
    getBenchTaxData(),
    getDraftGradeData(),
    getTradePageData(),
    getWaiverRoiData(),
  ])

  const base = baseData.status === 'fulfilled' ? baseData.value : null
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
    <main className="min-h-screen bg-gray-950 text-white px-4 py-8">
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="flex items-center gap-5 mb-8">
          {team.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={team.avatar_url} alt={team.display_name} className="w-20 h-20 rounded-full bg-gray-700" />
          ) : (
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-3xl font-black text-white">
              {team.real_name[0]}
            </div>
          )}
          <div>
            <h1 className="text-4xl font-black tracking-tight">{team.display_name}</h1>
            <p className="text-gray-400 mt-0.5">{team.real_name} · {team.nfl_team} fan</p>
            <p className="text-gray-500 text-sm mt-1 max-w-lg">{team.persona_notes}</p>
          </div>
        </div>

        {/* Season stats grid */}
        <section className="mb-8">
          <h2 className="text-lg font-bold mb-3 text-gray-300">Season Stats</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard label="Record" value={`${team.wins}–${team.losses}${team.ties > 0 ? `–${team.ties}` : ''}`} />
            <StatCard label="Points For" value={team.points_for.toFixed(1)} />
            <StatCard label="Power Rank" value={team.power_rank ? `#${team.power_rank}` : '—'} highlight={team.power_rank === 1} />
            <StatCard label="Luck Index" value={team.luck_index !== null ? (team.luck_index >= 0 ? `+${team.luck_index.toFixed(2)}` : team.luck_index.toFixed(2)) : '—'} sub={team.luck_index !== null ? (team.luck_index > 0.5 ? '🍀 Lucky schedule' : team.luck_index < -0.5 ? '💀 Rough schedule' : '⚖️ Fair schedule') : undefined} />
          </div>
        </section>

        {/* Advanced stats */}
        <section className="mb-8">
          <h2 className="text-lg font-bold mb-3 text-gray-300">Advanced Stats</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard label="🪑 Bench Tax" value={team.bench_tax_total !== null ? team.bench_tax_total.toFixed(1) : '—'} sub={team.bench_tax_rank !== null ? `Rank #${team.bench_tax_rank} (higher = worse)` : undefined} />
            <StatCard label="📋 Draft Grade" value={team.draft_grade ?? '—'} sub={team.draft_grade_score !== null ? `Score: ${team.draft_grade_score >= 0 ? '+' : ''}${team.draft_grade_score}` : undefined} highlight={team.draft_grade_rank === 1} />
            <StatCard label="🔄 Trade Δ" value={team.trade_delta !== null ? (team.trade_delta >= 0 ? `+${team.trade_delta.toFixed(1)}` : team.trade_delta.toFixed(1)) : '—'} sub={team.trade_king ? '👑 Trade King' : undefined} highlight={team.trade_king} />
            <StatCard label="📡 Waiver Pts" value={team.waiver_points !== null ? team.waiver_points.toFixed(1) : '—'} sub={team.waiver_wizard ? '🧙 Waiver Wizard' : undefined} highlight={team.waiver_wizard} />
          </div>
        </section>

        {/* H2H records */}
        {team.h2h.length > 0 && (
          <section className="mb-8">
            <h2 className="text-lg font-bold mb-3 text-gray-300">Head-to-Head (This Season)</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {team.h2h.map(rec => (
                <div key={rec.opponent_username} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                  <p className="font-semibold text-sm">{rec.opponent_display_name}</p>
                  <p className="text-2xl font-black mt-1">
                    <span className="text-green-400">{rec.wins}</span>
                    <span className="text-gray-600">–</span>
                    <span className="text-red-400">{rec.losses}</span>
                    {rec.ties > 0 && <span className="text-gray-400">–{rec.ties}</span>}
                  </p>
                  <p className="text-gray-500 text-xs mt-1">PF: {rec.points_for.toFixed(1)} / PA: {rec.points_against.toFixed(1)}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Current roster */}
        {team.current_roster.length > 0 && (
          <section>
            <h2 className="text-lg font-bold mb-3 text-gray-300">Current Roster</h2>
            <div className="flex flex-wrap gap-2">
              {team.current_roster.map(name => (
                <span key={name} className="bg-gray-800 border border-gray-700 text-gray-300 text-sm px-3 py-1 rounded-full">
                  {name}
                </span>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  )
}
