// lib/stats/weekly-awards.ts

import type { SleeperMatchup } from '../sleeper'

export interface AwardEntry {
  roster_id: number
  points: number
}

export interface MatchupResult {
  winner_roster_id: number
  loser_roster_id: number
  winner_points: number
  loser_points: number
  margin: number
}

export interface WeeklyAwards {
  week: number
  /** Highest scorer this week (winner or loser) */
  highest_scorer: AwardEntry
  /** Lowest scorer this week */
  lowest_scorer: AwardEntry
  /** Matchup with largest margin */
  biggest_blowout: MatchupResult
  /** Matchup with smallest margin */
  closest_game: MatchupResult
  /**
   * "Should've Won": highest-scoring team that LOST their matchup.
   * null if every high scorer also won.
   */
  shouldve_won: AwardEntry | null
  /**
   * "Should've Lost": lowest-scoring team that WON their matchup.
   * null if every low scorer also lost.
   */
  shouldve_lost: AwardEntry | null
  /**
   * Bench tax leader for this week (roster_id + bench_tax).
   * Populated as null here — filled in by bench tax engine in Phase 3.
   */
  bench_tax_leader: { roster_id: number; bench_tax: number } | null
}

/**
 * Compute all weekly awards for a single week's matchups.
 * matchups: all SleeperMatchup objects for that week (typically 6 entries for a 6-team league)
 */
export function computeWeeklyAwards(week: number, matchups: SleeperMatchup[]): WeeklyAwards | null {
  if (matchups.length === 0) return null

  // Group by matchup_id to find pairs
  const byMatchupId = new Map<number, SleeperMatchup[]>()
  for (const m of matchups) {
    if (!byMatchupId.has(m.matchup_id)) byMatchupId.set(m.matchup_id, [])
    byMatchupId.get(m.matchup_id)!.push(m)
  }

  const matchupResults: MatchupResult[] = []
  const winnerIds = new Set<number>()
  const loserIds = new Set<number>()

  for (const [, pair] of byMatchupId) {
    if (pair.length !== 2) continue
    const [a, b] = pair
    const winner = a.points >= b.points ? a : b
    const loser = a.points >= b.points ? b : a
    matchupResults.push({
      winner_roster_id: winner.roster_id,
      loser_roster_id: loser.roster_id,
      winner_points: winner.points,
      loser_points: loser.points,
      margin: winner.points - loser.points,
    })
    winnerIds.add(winner.roster_id)
    loserIds.add(loser.roster_id)
  }

  if (matchupResults.length === 0) return null

  // Highest / lowest scorer across all teams
  const sorted = [...matchups].sort((a, b) => b.points - a.points)
  const highest_scorer: AwardEntry = { roster_id: sorted[0].roster_id, points: sorted[0].points }
  const lowest_scorer: AwardEntry = { roster_id: sorted[sorted.length - 1].roster_id, points: sorted[sorted.length - 1].points }

  // Blowout / nail-biter
  const byMargin = [...matchupResults].sort((a, b) => b.margin - a.margin)
  const biggest_blowout = byMargin[0]
  const closest_game = byMargin[byMargin.length - 1]

  // Should've Won: highest-scoring LOSER
  const losers = matchups.filter(m => loserIds.has(m.roster_id)).sort((a, b) => b.points - a.points)
  const shouldve_won: AwardEntry | null = losers.length > 0
    ? { roster_id: losers[0].roster_id, points: losers[0].points }
    : null

  // Should've Lost: lowest-scoring WINNER
  const winners = matchups.filter(m => winnerIds.has(m.roster_id)).sort((a, b) => a.points - b.points)
  const shouldve_lost: AwardEntry | null = winners.length > 0
    ? { roster_id: winners[0].roster_id, points: winners[0].points }
    : null

  return {
    week,
    highest_scorer,
    lowest_scorer,
    biggest_blowout,
    closest_game,
    shouldve_won,
    shouldve_lost,
    bench_tax_leader: null, // populated by bench tax engine in Phase 3
  }
}

/**
 * Compute awards for all weeks.
 * Returns most-recent week's awards first.
 */
export function computeAllWeeklyAwards(
  weeklyMatchups: { week: number; matchups: SleeperMatchup[] }[]
): WeeklyAwards[] {
  return weeklyMatchups
    .map(({ week, matchups }) => computeWeeklyAwards(week, matchups))
    .filter((a): a is WeeklyAwards => a !== null)
    .sort((a, b) => b.week - a.week) // most recent first
}
