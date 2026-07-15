import type { SleeperMatchup } from '../sleeper'

export interface WeekMatchups {
  week: number
  matchups: SleeperMatchup[]
}

export interface PowerRankingEntry {
  roster_id: number
  wins: number
  losses: number
  ties: number
  points_for: number
  points_against: number
  win_pct: number
  last3_points_for: number  // sum of PF in last 3 completed weeks
  power_score: number       // 0.5*norm_win_pct + 0.3*norm_pf + 0.2*norm_last3
  power_rank: number        // 1 = best
}

/**
 * Compute power rankings from all completed weeks of matchup data.
 * @param weeklyMatchups - array of { week, matchups[] }, one entry per completed week, sorted by week asc
 */
export function computePowerRankings(weeklyMatchups: WeekMatchups[]): PowerRankingEntry[] {
  if (weeklyMatchups.length === 0) return []

  // Build per-roster accumulators
  const rosters = new Map<number, {
    wins: number; losses: number; ties: number
    pf: number; pa: number
    weeklyPF: number[]  // pf per week, index = week-1
  }>()

  // Sort weeks ascending
  const sorted = [...weeklyMatchups].sort((a, b) => a.week - b.week)

  for (const { week, matchups } of sorted) {
    // Group matchups by matchup_id to find opponents
    const byMatchupId = new Map<number, SleeperMatchup[]>()
    for (const m of matchups) {
      if (!byMatchupId.has(m.matchup_id)) byMatchupId.set(m.matchup_id, [])
      byMatchupId.get(m.matchup_id)!.push(m)
    }

    // Initialize any new roster_ids
    for (const m of matchups) {
      if (!rosters.has(m.roster_id)) {
        rosters.set(m.roster_id, { wins: 0, losses: 0, ties: 0, pf: 0, pa: 0, weeklyPF: [] })
      }
    }

    for (const [, pair] of byMatchupId) {
      if (pair.length !== 2) continue  // bye week or incomplete data — skip
      const [a, b] = pair

      const aRec = rosters.get(a.roster_id)!
      const bRec = rosters.get(b.roster_id)!

      // Points for / against
      aRec.pf += a.points
      aRec.pa += b.points
      bRec.pf += b.points
      bRec.pa += a.points

      // Win/loss/tie
      if (a.points > b.points) { aRec.wins++; bRec.losses++ }
      else if (b.points > a.points) { bRec.wins++; aRec.losses++ }
      else { aRec.ties++; bRec.ties++ }

      // Per-week PF (for last-3 calculation)
      // week is 1-indexed; store at index week-1
      const weekIdx = week - 1
      while (aRec.weeklyPF.length <= weekIdx) aRec.weeklyPF.push(0)
      while (bRec.weeklyPF.length <= weekIdx) bRec.weeklyPF.push(0)
      aRec.weeklyPF[weekIdx] = a.points
      bRec.weeklyPF[weekIdx] = b.points
    }
  }

  // Compute last-3-weeks PF
  const maxWeek = sorted[sorted.length - 1].week
  const last3Start = Math.max(1, maxWeek - 2)  // inclusive

  const entries: Omit<PowerRankingEntry, 'power_score' | 'power_rank'>[] = []
  for (const [roster_id, rec] of rosters) {
    const gp = rec.wins + rec.losses + rec.ties
    const win_pct = gp > 0 ? (rec.wins + rec.ties * 0.5) / gp : 0

    // Sum PF for last 3 weeks (weeks last3Start through maxWeek)
    let last3PF = 0
    for (let w = last3Start; w <= maxWeek; w++) {
      last3PF += rec.weeklyPF[w - 1] ?? 0
    }

    entries.push({
      roster_id,
      wins: rec.wins,
      losses: rec.losses,
      ties: rec.ties,
      points_for: rec.pf,
      points_against: rec.pa,
      win_pct,
      last3_points_for: last3PF,
    })
  }

  // Normalize each term by league max
  const maxWinPct = Math.max(...entries.map(e => e.win_pct), 0.0001)
  const maxPF = Math.max(...entries.map(e => e.points_for), 0.0001)
  const maxLast3 = Math.max(...entries.map(e => e.last3_points_for), 0.0001)

  const withScore = entries.map(e => ({
    ...e,
    power_score:
      0.5 * (e.win_pct / maxWinPct) +
      0.3 * (e.points_for / maxPF) +
      0.2 * (e.last3_points_for / maxLast3),
    power_rank: 0,  // filled below
  }))

  // Rank: 1 = highest power_score
  withScore.sort((a, b) => b.power_score - a.power_score)
  withScore.forEach((e, i) => { e.power_rank = i + 1 })

  return withScore
}
