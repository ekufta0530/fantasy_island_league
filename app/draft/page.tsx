// app/draft/page.tsx
import { getDraftGradeData } from '@/lib/stats/draft-grade-data'
import type { GradedPick } from '@/lib/stats/draft-grade'
import { PageHeader } from '@/components/PageHeader'
import { EmptyState } from '@/components/EmptyState'
import { Callout } from '@/components/Card'

export const metadata = { title: 'Draft Recap' }

export const dynamic = 'force-dynamic'
export const revalidate = 3600  // re-grade hourly

const GRADE_BOX: Record<string, string> = {
  '🔥 Steal':  'bg-lime-950 border-lime-800 text-lime-300',
  '✅ Good':   'bg-teal-950 border-teal-800 text-teal-300',
  '😐 Meh':    'bg-surface-2 border-hairline-strong text-muted',
  '📉 Bust':   'bg-coral-950 border-coral-800 text-coral-300',
  '💀 Ghost':  'bg-rose-950 border-rose-800 text-rose-300',
}

const LETTER_TONE: Record<string, string> = {
  'A+': 'text-lime-400', 'A': 'text-lime-400',
  'B+': 'text-teal-300', 'B': 'text-teal-300',
  'C+': 'text-gold-400', 'C': 'text-gold-400',
  'D':  'text-coral-400', 'F': 'text-rose-400',
}

function PickCell({ pick }: { pick: GradedPick | undefined }) {
  if (!pick) return <td className="border border-hairline p-2 bg-surface/30 min-w-25" />
  const color = GRADE_BOX[pick.grade_label] ?? GRADE_BOX['😐 Meh']
  return (
    <td className="border border-hairline p-2 min-w-30 align-top">
      <div className={`rounded-lg border px-2 py-1.5 text-xs ${color}`}>
        <p className="font-bold leading-tight truncate">{pick.player_name}</p>
        <p className="text-[10px] opacity-75 mt-0.5">{pick.position} · {pick.season_points.toFixed(0)}pts</p>
        <p className="text-[10px] mt-0.5 font-mono">{pick.grade_label} ({pick.value_over_pick >= 0 ? '+' : ''}{pick.value_over_pick})</p>
      </div>
    </td>
  )
}

export default async function DraftPage() {
  let data
  try {
    data = await getDraftGradeData()
  } catch (err) {
    return (
      <main className="min-h-screen px-4 py-10">
        <div className="max-w-4xl mx-auto">
          <EmptyState icon="📋" title="Draft data not available yet" subtitle={String(err)} />
        </div>
      </main>
    )
  }

  const { result, rosterNames, totalPicks } = data
  const numRosters = result.rosters.length
  const numRounds = Math.ceil(totalPicks / Math.max(numRosters, 1))

  // Build pick lookup: round → [picks in snake order]
  const pickBySlot = new Map<string, GradedPick>()
  for (const roster of result.rosters) {
    for (const pick of roster.picks) {
      const round = Math.ceil(pick.pick_no / numRosters)
      const posInRound = ((pick.pick_no - 1) % numRosters)
      const col = round % 2 === 1 ? posInRound : (numRosters - 1 - posInRound)
      pickBySlot.set(`${round}-${col}`, pick)
    }
  }

  const rosterOrder = [...result.rosters]
    .sort((a, b) => {
      const aFirst = a.picks.find(p => Math.ceil(p.pick_no / numRosters) === 1)
      const bFirst = b.picks.find(p => Math.ceil(p.pick_no / numRosters) === 1)
      return (aFirst?.pick_no ?? 99) - (bFirst?.pick_no ?? 99)
    })

  return (
    <main className="min-h-screen px-4 py-10">
      <div className="max-w-7xl mx-auto">
        <PageHeader
          eyebrow="Receipts, kept forever"
          title="Draft Recap"
          subtitle="How did everyone's picks actually pan out? Value over pick = (draft slot) − (actual finish rank by season points)."
        />

        {/* Callout cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          <div className="bg-surface border border-hairline rounded-2xl p-4">
            <p className="text-muted text-xs uppercase tracking-wider mb-1">Best Drafter</p>
            <p className="text-ink font-bold">{rosterNames.get(result.best_drafter.roster_id)?.display_name ?? `Team ${result.best_drafter.roster_id}`}</p>
            <p className={`font-display text-2xl font-bold mt-1 ${LETTER_TONE[result.best_drafter.letter_grade] ?? 'text-ink'}`}>{result.best_drafter.letter_grade}</p>
            <p className="text-faint text-xs mt-1">Score: {result.best_drafter.grade_score >= 0 ? '+' : ''}{result.best_drafter.grade_score}</p>
          </div>
          <Callout
            tone="lime"
            eyebrow="Steal of Year"
            title={result.steal_of_year.player_name}
            subtitle={`Pick #${result.steal_of_year.pick_no} → Finished #${result.steal_of_year.actual_finish_rank}`}
            stat={`VOP: +${result.steal_of_year.value_over_pick}`}
          />
          <Callout
            tone="rose"
            eyebrow="Bust of Year"
            title={result.bust_of_year.player_name}
            subtitle={`Pick #${result.bust_of_year.pick_no} → Finished #${result.bust_of_year.actual_finish_rank}`}
            stat={`VOP: ${result.bust_of_year.value_over_pick}`}
          />
          <Callout
            tone="coral"
            eyebrow="Reach of Year"
            title={result.reach_of_year.player_name}
            subtitle={`Taken #${result.reach_of_year.pick_no}, worth #${result.reach_of_year.actual_finish_rank}`}
            stat={`VOP: ${result.reach_of_year.value_over_pick}`}
          />
        </div>

        {/* Per-manager grade summary */}
        <div className="flex flex-wrap gap-3 mb-8">
          {result.rosters.map(r => (
            <div key={r.roster_id} className="bg-surface border border-hairline rounded-xl px-4 py-3 flex items-center gap-3">
              <div>
                <p className="text-ink font-semibold text-sm">{rosterNames.get(r.roster_id)?.display_name ?? `Team ${r.roster_id}`}</p>
                <p className="text-faint text-xs">Score: {r.grade_score >= 0 ? '+' : ''}{r.grade_score}</p>
              </div>
              <span className={`font-display text-3xl font-bold ${LETTER_TONE[r.letter_grade] ?? 'text-ink'}`}>{r.letter_grade}</span>
            </div>
          ))}
        </div>

        {/* Draft board */}
        <div className="overflow-x-auto rounded-2xl">
          <table className="border-collapse text-xs">
            <thead>
              <tr>
                <th className="border border-hairline bg-surface px-3 py-2 text-muted text-left w-16">Rd</th>
                {rosterOrder.map(r => (
                  <th key={r.roster_id} className="border border-hairline bg-surface px-2 py-2 text-ink font-semibold min-w-30">
                    <div>{rosterNames.get(r.roster_id)?.display_name ?? `Team ${r.roster_id}`}</div>
                    <div className={`font-display text-lg font-bold ${LETTER_TONE[r.letter_grade] ?? 'text-ink'}`}>{r.letter_grade}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: numRounds }, (_, ri) => ri + 1).map(round => (
                <tr key={round}>
                  <td className="border border-hairline bg-surface px-3 py-2 text-faint font-bold text-center">{round}</td>
                  {rosterOrder.map((_, ci) => {
                    const pick = pickBySlot.get(`${round}-${ci}`)
                    return <PickCell key={ci} pick={pick} />
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  )
}
