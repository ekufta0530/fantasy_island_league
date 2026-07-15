// app/draft/page.tsx
import { getDraftGradeData } from '@/lib/stats/draft-grade-data'
import type { GradedPick } from '@/lib/stats/draft-grade'

export const metadata = { title: 'Draft Recap' }

export const dynamic = 'force-dynamic'
export const revalidate = 3600  // re-grade hourly

const GRADE_COLORS: Record<string, string> = {
  '🔥 Steal':  'bg-green-900 border-green-700 text-green-300',
  '✅ Good':   'bg-emerald-900 border-emerald-700 text-emerald-300',
  '😐 Meh':   'bg-gray-800 border-gray-700 text-gray-400',
  '📉 Bust':  'bg-orange-900 border-orange-700 text-orange-300',
  '💀 Ghost': 'bg-red-950 border-red-800 text-red-400',
}

const LETTER_COLORS: Record<string, string> = {
  'A+': 'text-green-400', 'A': 'text-green-400',
  'B+': 'text-emerald-400', 'B': 'text-emerald-400',
  'C+': 'text-yellow-400', 'C': 'text-yellow-400',
  'D':  'text-orange-400', 'F': 'text-red-400',
}

function PickCell({ pick }: { pick: GradedPick | undefined }) {
  if (!pick) return <td className="border border-gray-800 p-2 bg-gray-900/30 min-w-[100px]" />
  const color = GRADE_COLORS[pick.grade_label] ?? GRADE_COLORS['😐 Meh']
  return (
    <td className={`border border-gray-800 p-2 min-w-[120px] align-top`}>
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
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-2xl mb-2">📋 Draft data not available yet</p>
          <p className="text-gray-400 text-sm">{String(err)}</p>
        </div>
      </div>
    )
  }

  const { result, rosterNames, totalPicks } = data
  const numRosters = result.rosters.length
  const numRounds = Math.ceil(totalPicks / Math.max(numRosters, 1))

  // Build pick lookup: round → [picks in snake order]
  // Snake: odd rounds L→R, even rounds R→L
  const pickBySlot = new Map<string, GradedPick>()
  for (const roster of result.rosters) {
    for (const pick of roster.picks) {
      const round = Math.ceil(pick.pick_no / numRosters)
      const posInRound = ((pick.pick_no - 1) % numRosters)
      const col = round % 2 === 1 ? posInRound : (numRosters - 1 - posInRound)
      pickBySlot.set(`${round}-${col}`, pick)
    }
  }

  // Roster order for columns (draft order = sort by first-round pick)
  const rosterOrder = [...result.rosters]
    .sort((a, b) => {
      const aFirst = a.picks.find(p => Math.ceil(p.pick_no / numRosters) === 1)
      const bFirst = b.picks.find(p => Math.ceil(p.pick_no / numRosters) === 1)
      return (aFirst?.pick_no ?? 99) - (bFirst?.pick_no ?? 99)
    })

  return (
    <main className="min-h-screen bg-gray-950 text-white px-4 py-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-black mb-1 tracking-tight">📋 Draft Recap</h1>
        <p className="text-gray-400 text-sm mb-8">
          How did everyone&apos;s picks actually pan out? Value over pick = (draft slot) − (actual finish rank by season points).
        </p>

        {/* Callout cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">🏆 Best Drafter</p>
            <p className="text-white font-bold">{rosterNames.get(result.best_drafter.roster_id)?.display_name ?? `Team ${result.best_drafter.roster_id}`}</p>
            <p className={`text-2xl font-black mt-1 ${LETTER_COLORS[result.best_drafter.letter_grade] ?? 'text-white'}`}>{result.best_drafter.letter_grade}</p>
            <p className="text-gray-500 text-xs mt-1">Score: {result.best_drafter.grade_score >= 0 ? '+' : ''}{result.best_drafter.grade_score}</p>
          </div>
          <div className="bg-green-950 border border-green-800 rounded-xl p-4">
            <p className="text-green-400 text-xs uppercase tracking-wider mb-1">🔥 Steal of Year</p>
            <p className="text-white font-bold">{result.steal_of_year.player_name}</p>
            <p className="text-green-400 text-sm mt-1">Pick #{result.steal_of_year.pick_no} → Finished #{result.steal_of_year.actual_finish_rank}</p>
            <p className="text-green-300 font-mono text-xs mt-1">VOP: +{result.steal_of_year.value_over_pick}</p>
          </div>
          <div className="bg-red-950 border border-red-800 rounded-xl p-4">
            <p className="text-red-400 text-xs uppercase tracking-wider mb-1">💀 Bust of Year</p>
            <p className="text-white font-bold">{result.bust_of_year.player_name}</p>
            <p className="text-red-400 text-sm mt-1">Pick #{result.bust_of_year.pick_no} → Finished #{result.bust_of_year.actual_finish_rank}</p>
            <p className="text-red-300 font-mono text-xs mt-1">VOP: {result.bust_of_year.value_over_pick}</p>
          </div>
          <div className="bg-orange-950 border border-orange-800 rounded-xl p-4">
            <p className="text-orange-400 text-xs uppercase tracking-wider mb-1">🎯 Reach of Year</p>
            <p className="text-white font-bold">{result.reach_of_year.player_name}</p>
            <p className="text-orange-400 text-sm mt-1">Taken #{result.reach_of_year.pick_no}, worth #{result.reach_of_year.actual_finish_rank}</p>
            <p className="text-orange-300 font-mono text-xs mt-1">VOP: {result.reach_of_year.value_over_pick}</p>
          </div>
        </div>

        {/* Per-manager grade summary */}
        <div className="flex flex-wrap gap-3 mb-8">
          {result.rosters.map(r => (
            <div key={r.roster_id} className="bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 flex items-center gap-3">
              <div>
                <p className="text-white font-semibold text-sm">{rosterNames.get(r.roster_id)?.display_name ?? `Team ${r.roster_id}`}</p>
                <p className="text-gray-500 text-xs">Score: {r.grade_score >= 0 ? '+' : ''}{r.grade_score}</p>
              </div>
              <span className={`text-3xl font-black ${LETTER_COLORS[r.letter_grade] ?? 'text-white'}`}>{r.letter_grade}</span>
            </div>
          ))}
        </div>

        {/* Draft board */}
        <div className="overflow-x-auto">
          <table className="border-collapse text-xs">
            <thead>
              <tr>
                <th className="border border-gray-700 bg-gray-900 px-3 py-2 text-gray-400 text-left w-16">Rd</th>
                {rosterOrder.map(r => (
                  <th key={r.roster_id} className="border border-gray-700 bg-gray-900 px-2 py-2 text-gray-300 font-semibold min-w-[120px]">
                    <div>{rosterNames.get(r.roster_id)?.display_name ?? `Team ${r.roster_id}`}</div>
                    <div className={`text-lg font-black ${LETTER_COLORS[r.letter_grade] ?? 'text-white'}`}>{r.letter_grade}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: numRounds }, (_, ri) => ri + 1).map(round => (
                <tr key={round}>
                  <td className="border border-gray-800 bg-gray-900 px-3 py-2 text-gray-500 font-bold text-center">{round}</td>
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
