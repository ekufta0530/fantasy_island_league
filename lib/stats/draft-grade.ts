// lib/stats/draft-grade.ts

export interface DraftPickInput {
  pick_no: number
  player_id: string
  roster_id: number
  player_name: string    // resolved from /players/nfl
  position: string
}

export interface PlayerSeasonPoints {
  player_id: string
  season_points: number  // total fantasy points for the season
}

export interface GradedPick {
  pick_no: number
  player_id: string
  player_name: string
  position: string
  roster_id: number
  season_points: number
  actual_finish_rank: number   // 1 = highest scorer among all drafted players
  value_over_pick: number      // pick_no - actual_finish_rank (positive = steal)
  grade_label: '🔥 Steal' | '✅ Good' | '😐 Meh' | '📉 Bust' | '💀 Ghost'
}

export interface RosterDraftGrade {
  roster_id: number
  grade_score: number         // sum of value_over_pick across all picks
  letter_grade: string        // A+, A, B+, B, C+, C, D, F
  rank: number                // 1 = best drafter
  picks: GradedPick[]
  best_pick: GradedPick       // highest value_over_pick
  worst_pick: GradedPick      // lowest value_over_pick
}

export interface DraftGradeResult {
  rosters: RosterDraftGrade[]
  best_drafter: RosterDraftGrade
  steal_of_year: GradedPick
  bust_of_year: GradedPick
  reach_of_year: GradedPick   // earliest pick with lowest actual finish rank
}

function pickGradeLabel(vop: number): GradedPick['grade_label'] {
  if (vop >= 10) return '🔥 Steal'
  if (vop >= 3)  return '✅ Good'
  if (vop >= -3) return '😐 Meh'
  if (vop >= -10) return '📉 Bust'
  return '💀 Ghost'
}

function letterGrade(rank: number, total: number): string {
  const pct = 1 - (rank - 1) / Math.max(total - 1, 1)  // 1.0 = best, 0.0 = worst
  if (pct >= 0.92) return 'A+'
  if (pct >= 0.83) return 'A'
  if (pct >= 0.67) return 'B+'
  if (pct >= 0.50) return 'B'
  if (pct >= 0.33) return 'C+'
  if (pct >= 0.17) return 'C'
  if (pct >= 0.08) return 'D'
  return 'F'
}

/**
 * Grade all draft picks for a season.
 *
 * @param picks         - all draft picks with player names/positions
 * @param seasonPoints  - map of player_id → total season fantasy points
 */
export function computeDraftGrades(
  picks: DraftPickInput[],
  seasonPoints: Map<string, number>
): DraftGradeResult {
  if (picks.length === 0) {
    throw new Error('No draft picks provided')
  }

  // Rank all drafted players by season points descending
  const ranked = [...picks]
    .map(p => ({ ...p, season_points: seasonPoints.get(p.player_id) ?? 0 }))
    .sort((a, b) => b.season_points - a.season_points)

  // actual_finish_rank: 1 = highest scorer
  const finishRankByPlayer = new Map<string, number>()
  ranked.forEach((p, i) => finishRankByPlayer.set(p.player_id, i + 1))

  // Grade each pick
  const gradedPicks: GradedPick[] = picks.map(p => {
    const sp = seasonPoints.get(p.player_id) ?? 0
    const finish = finishRankByPlayer.get(p.player_id) ?? picks.length
    const vop = p.pick_no - finish
    return {
      pick_no: p.pick_no,
      player_id: p.player_id,
      player_name: p.player_name,
      position: p.position,
      roster_id: p.roster_id,
      season_points: sp,
      actual_finish_rank: finish,
      value_over_pick: vop,
      grade_label: pickGradeLabel(vop),
    }
  })

  // Group by roster
  const byRoster = new Map<number, GradedPick[]>()
  for (const gp of gradedPicks) {
    if (!byRoster.has(gp.roster_id)) byRoster.set(gp.roster_id, [])
    byRoster.get(gp.roster_id)!.push(gp)
  }

  // Compute per-roster grade scores
  const rosterScores: Array<{ roster_id: number; grade_score: number; picks: GradedPick[] }> = []
  for (const [roster_id, rPicks] of byRoster) {
    const grade_score = rPicks.reduce((s, p) => s + p.value_over_pick, 0)
    rosterScores.push({ roster_id, grade_score, picks: rPicks })
  }

  // Sort by grade_score descending → rank
  rosterScores.sort((a, b) => b.grade_score - a.grade_score)
  const total = rosterScores.length

  const rosters: RosterDraftGrade[] = rosterScores.map((rs, i) => {
    const rank = i + 1
    const sortedPicks = [...rs.picks].sort((a, b) => b.value_over_pick - a.value_over_pick)
    return {
      roster_id: rs.roster_id,
      grade_score: rs.grade_score,
      letter_grade: letterGrade(rank, total),
      rank,
      picks: rs.picks,
      best_pick: sortedPicks[0],
      worst_pick: sortedPicks[sortedPicks.length - 1],
    }
  })

  // Season-wide callouts
  const allGraded = gradedPicks.sort((a, b) => b.value_over_pick - a.value_over_pick)
  const steal_of_year = allGraded[0]
  const bust_of_year = allGraded[allGraded.length - 1]
  // Reach: earliest pick (low pick_no = high draft position) with worst finish rank
  // = pick with highest (pick_no low, finish_rank high) → lowest value_over_pick among top-half picks
  const topHalfPicks = gradedPicks.filter(p => p.pick_no <= Math.ceil(picks.length / 2))
  const reach_of_year = topHalfPicks.length > 0
    ? topHalfPicks.sort((a, b) => a.value_over_pick - b.value_over_pick)[0]
    : bust_of_year

  return { rosters, best_drafter: rosters[0], steal_of_year, bust_of_year, reach_of_year }
}
