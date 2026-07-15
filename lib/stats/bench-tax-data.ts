// lib/stats/bench-tax-data.ts
import { getSeasonSnapshot } from './season-snapshot'
import { getPlayerEligiblePositionsMap, getPlayerNamesMap } from './player-data'
import { computeSeasonBenchTax, SeasonBenchTax } from './bench-tax'
import { CURRENT_LEAGUE_ID } from '../constants'

export interface BenchTaxRow {
  roster_id: number
  display_name: string
  real_name: string
  avatar_url: string | null
  total_bench_tax: number
  worst_week: number
  worst_week_bench_tax: number
  /** "Started [player] (Xpts) over [player] (Ypts)" */
  worst_swap_label: string
  weeks_played: number
  avg_bench_tax: number
}

export interface BenchTaxData {
  leaderboard: BenchTaxRow[]  // sorted: most bench tax first
  best_setter: BenchTaxRow    // lowest total bench tax
  season_worst: {
    roster_id: number
    display_name: string
    week: number
    bench_tax: number
    swap_label: string
  }
}

export function buildSwapLabel(
  missedStarts: SeasonBenchTax['worst_week']['missed_starts'],
  playerNames: Map<string, string>
): string {
  if (missedStarts.length === 0) return 'No bad swaps found'
  const top = missedStarts[0]
  const benched = playerNames.get(top.benched_player_id) ?? top.benched_player_id
  const started = playerNames.get(top.started_player_id) ?? top.started_player_id
  return `Started ${started} (${top.started_points.toFixed(1)}pts) over ${benched} (${top.benched_points.toFixed(1)}pts)`
}

export async function getBenchTaxData(leagueId: string = CURRENT_LEAGUE_ID): Promise<BenchTaxData> {
  const snapshot = await getSeasonSnapshot(leagueId)
  const rosterPositions: string[] = snapshot.league.roster_positions ?? ['QB','RB','RB','WR','WR','TE','FLEX','BN','BN','BN','BN','BN']

  const weeklyData = snapshot.weeklyMatchups.map(({ week, matchups }) => ({
    week,
    rosters: matchups.map(m => ({
      roster_id: m.roster_id,
      starters: m.starters,
      players: m.players,
      players_points: m.players_points,
    })),
  }))

  const [playerPositions, playerNames] = await Promise.all([
    getPlayerEligiblePositionsMap(),
    getPlayerNamesMap(),
  ])

  const seasonData = computeSeasonBenchTax(weeklyData, playerPositions, rosterPositions)

  const leaderboard: BenchTaxRow[] = seasonData.map(s => {
    const info = snapshot.rosterInfo.get(s.roster_id)
    return {
      roster_id: s.roster_id,
      display_name: info?.display_name ?? `Team ${s.roster_id}`,
      real_name: info?.real_name ?? `Team ${s.roster_id}`,
      avatar_url: info?.avatar_url ?? null,
      total_bench_tax: s.total_bench_tax,
      worst_week: s.worst_week.week,
      worst_week_bench_tax: s.worst_week.bench_tax,
      worst_swap_label: buildSwapLabel(s.worst_week.missed_starts, playerNames),
      weeks_played: s.weeks.length,
      avg_bench_tax: s.weeks.length > 0 ? s.total_bench_tax / s.weeks.length : 0,
    }
  })

  const best_setter = [...leaderboard].sort((a, b) => a.total_bench_tax - b.total_bench_tax)[0]

  // Find single worst week across entire league
  let worstOverall: { roster_id: number; display_name: string; week: number; bench_tax: number; swap_label: string } | null = null
  for (const s of seasonData) {
    const w = s.worst_week
    if (!worstOverall || w.bench_tax > worstOverall.bench_tax) {
      const info = snapshot.rosterInfo.get(s.roster_id)
      worstOverall = {
        roster_id: s.roster_id,
        display_name: info?.display_name ?? `Team ${s.roster_id}`,
        week: w.week,
        bench_tax: w.bench_tax,
        swap_label: buildSwapLabel(w.missed_starts, playerNames),
      }
    }
  }

  return {
    leaderboard,
    best_setter,
    season_worst: worstOverall ?? { roster_id: 0, display_name: 'N/A', week: 0, bench_tax: 0, swap_label: 'No data yet' },
  }
}
