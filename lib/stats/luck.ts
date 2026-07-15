// lib/stats/luck.ts

import type { SleeperMatchup } from '../sleeper'
import type { WeekMatchups } from './power'

export interface LuckIndexEntry {
  roster_id: number
  actual_wins: number
  all_play_wins: number      // total wins if played every other team every week
  all_play_losses: number
  all_play_ties: number
  all_play_win_pct: number   // all_play_wins / (all_play_wins + all_play_losses + all_play_ties)
  luck_index: number         // actual_wins - all_play_expected_wins
  // all_play_expected_wins = all_play_win_pct * actual_games_played
}

/**
 * Compute the luck index for each roster.
 * @param weeklyMatchups - completed weeks, sorted by week asc (same shape as power.ts input)
 */
export function computeLuckIndex(weeklyMatchups: WeekMatchups[]): LuckIndexEntry[] {
  if (weeklyMatchups.length === 0) return []

  // Accumulate per-roster: actual wins, and all-play W/L/T
  const acc = new Map<number, {
    actualWins: number
    actualGP: number  // games played (for expected wins calc)
    apWins: number
    apLosses: number
    apTies: number
  }>()

  for (const { matchups } of weeklyMatchups) {
    // All roster_ids this week
    const allThisWeek = matchups.map(m => ({ id: m.roster_id, pts: m.points }))

    // Initialize any new rosters
    for (const { id } of allThisWeek) {
      if (!acc.has(id)) {
        acc.set(id, { actualWins: 0, actualGP: 0, apWins: 0, apLosses: 0, apTies: 0 })
      }
    }

    // --- Actual wins: find opponent via matchup_id ---
    const byMatchupId = new Map<number, SleeperMatchup[]>()
    for (const m of matchups) {
      if (!byMatchupId.has(m.matchup_id)) byMatchupId.set(m.matchup_id, [])
      byMatchupId.get(m.matchup_id)!.push(m)
    }
    for (const [, pair] of byMatchupId) {
      if (pair.length !== 2) continue
      const [a, b] = pair
      const aRec = acc.get(a.roster_id)!
      const bRec = acc.get(b.roster_id)!
      aRec.actualGP++
      bRec.actualGP++
      if (a.points > b.points) { aRec.actualWins++ }
      else if (b.points > a.points) { bRec.actualWins++ }
      // ties: neither gets an actual win (consistent with power.ts where ties = 0.5)
    }

    // --- All-play: each team vs every other team this week ---
    for (let i = 0; i < allThisWeek.length; i++) {
      const me = allThisWeek[i]
      const meRec = acc.get(me.id)!
      for (let j = 0; j < allThisWeek.length; j++) {
        if (i === j) continue
        const opp = allThisWeek[j]
        if (me.pts > opp.pts) meRec.apWins++
        else if (me.pts < opp.pts) meRec.apLosses++
        else meRec.apTies++
      }
    }
  }

  const results: LuckIndexEntry[] = []
  for (const [roster_id, rec] of acc) {
    const apTotal = rec.apWins + rec.apLosses + rec.apTies
    const apWinPct = apTotal > 0 ? rec.apWins / apTotal : 0
    const apExpectedWins = apWinPct * rec.actualGP

    results.push({
      roster_id,
      actual_wins: rec.actualWins,
      all_play_wins: rec.apWins,
      all_play_losses: rec.apLosses,
      all_play_ties: rec.apTies,
      all_play_win_pct: apWinPct,
      luck_index: rec.actualWins - apExpectedWins,
    })
  }

  // Sort by luck_index descending (luckiest first)
  results.sort((a, b) => b.luck_index - a.luck_index)
  return results
}
