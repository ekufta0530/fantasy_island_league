// lib/stats/bench-tax.ts

/** Position eligibility for each slot type */
export const SLOT_ELIGIBILITY: Record<string, string[]> = {
  QB: ['QB'],
  RB: ['RB'],
  WR: ['WR'],
  TE: ['TE'],
  FLEX: ['RB', 'WR', 'TE'],
  SUPER_FLEX: ['QB', 'RB', 'WR', 'TE'],
  K: ['K'],
  DEF: ['DEF'],
  // IDP slots (ignore for optimal lineup — not standard)
  DL: ['DL'],
  LB: ['LB'],
  DB: ['DB'],
  // BN, IR, TAXI are bench — not counted in optimal
}

/** Slots that count toward the starting lineup (not bench/IR/TAXI) */
const STARTING_SLOTS = new Set(['QB','RB','WR','TE','FLEX','SUPER_FLEX','K','DEF','DL','LB','DB'])

export interface PlayerPointEntry {
  player_id: string
  position: string   // from /players/nfl
  points: number
}

export interface OptimalLineupResult {
  optimal_points: number
  actual_points: number
  bench_tax: number
  /** Specific players that were benched but should have started, sorted by point delta desc */
  missed_starts: Array<{
    benched_player_id: string
    benched_points: number
    started_player_id: string
    started_points: number
    delta: number
    slot: string
  }>
}

/**
 * Compute the optimal lineup for a single roster in a single week.
 *
 * @param rosterPositions - league.roster_positions e.g. ["QB","RB","RB","WR","WR","TE","FLEX","BN","BN"]
 * @param starters        - player_ids actually started (in slot order matching rosterPositions)
 * @param allPlayers      - ALL players on the roster (starters + bench) with their position + points this week
 */
export function computeOptimalLineup(
  rosterPositions: string[],
  starters: string[],
  allPlayers: PlayerPointEntry[]
): OptimalLineupResult {
  // Only consider starting slots
  const startingSlots = rosterPositions.filter(slot => STARTING_SLOTS.has(slot))

  // Sort players by points descending
  const sorted = [...allPlayers].sort((a, b) => b.points - a.points)

  // Greedy assignment: assign best available eligible player to each slot
  // Process FLEX/SUPER_FLEX last so dedicated slots (QB, RB, WR, TE) get first pick
  const slotPriority = (slot: string) => {
    if (slot === 'SUPER_FLEX') return 2
    if (slot === 'FLEX') return 1
    return 0
  }
  const orderedSlots = [...startingSlots].sort((a, b) => slotPriority(a) - slotPriority(b))

  const used = new Set<string>()
  const optimalAssignment: Array<{ slot: string; player_id: string; points: number }> = []

  for (const slot of orderedSlots) {
    const eligible = (SLOT_ELIGIBILITY[slot] ?? [])
    // Find highest-scoring unused eligible player
    const best = sorted.find(p => eligible.includes(p.position) && !used.has(p.player_id))
    if (best) {
      used.add(best.player_id)
      optimalAssignment.push({ slot, player_id: best.player_id, points: best.points })
    }
  }

  const optimal_points = optimalAssignment.reduce((s, a) => s + a.points, 0)

  // Actual points: sum of starters' points (players in the starters array)
  const starterSet = new Set(starters)
  const actual_points = allPlayers
    .filter(p => starterSet.has(p.player_id))
    .reduce((s, p) => s + p.points, 0)

  const bench_tax = Math.max(0, optimal_points - actual_points)

  // Find missed starts: symmetric diff between optimal and actual player sets.
  // Players in optimal but not actual = should have started (benched).
  // Players in actual but not optimal = shouldn't have started (wrongly started).
  const missed_starts: OptimalLineupResult['missed_starts'] = []
  if (bench_tax > 0) {
    const actualMap = new Map(allPlayers.map(p => [p.player_id, p]))
    const optimalPlayerIds = new Set(optimalAssignment.map(a => a.player_id))

    // Benched players that should have started, sorted by points desc
    const shouldHaveStarted = optimalAssignment
      .filter(a => !starterSet.has(a.player_id))
      .sort((a, b) => b.points - a.points)

    // Started players that shouldn't have, sorted by points asc (worst choices first)
    const shouldHaveBeenBenched = [...starterSet]
      .map(id => actualMap.get(id))
      .filter((p): p is PlayerPointEntry => !!p && !optimalPlayerIds.has(p.player_id))
      .sort((a, b) => a.points - b.points)

    const count = Math.min(shouldHaveStarted.length, shouldHaveBeenBenched.length)
    for (let i = 0; i < count; i++) {
      const benched = shouldHaveStarted[i]
      const started = shouldHaveBeenBenched[i]
      missed_starts.push({
        benched_player_id: benched.player_id,
        benched_points: benched.points,
        started_player_id: started.player_id,
        started_points: started.points,
        delta: benched.points - started.points,
        slot: benched.slot,
      })
    }
    missed_starts.sort((a, b) => b.delta - a.delta)
  }

  return { optimal_points, actual_points, bench_tax, missed_starts }
}

export interface WeekBenchTax {
  roster_id: number
  week: number
  bench_tax: number
  optimal_points: number
  actual_points: number
  missed_starts: OptimalLineupResult['missed_starts']
}

export interface SeasonBenchTax {
  roster_id: number
  total_bench_tax: number
  weeks: WeekBenchTax[]
  /** Single worst week */
  worst_week: WeekBenchTax
}

/**
 * Compute bench tax for all rosters across all weeks.
 *
 * @param weeklyData  - per week: matchup data (roster_id, starters, players, players_points)
 * @param playerPositions - map of player_id -> position string (from /players/nfl cache)
 * @param rosterPositions - league.roster_positions
 */
export function computeSeasonBenchTax(
  weeklyData: Array<{
    week: number
    rosters: Array<{
      roster_id: number
      starters: string[]
      players: string[]
      players_points: Record<string, number>
    }>
  }>,
  playerPositions: Map<string, string>,
  rosterPositions: string[]
): SeasonBenchTax[] {
  const byRoster = new Map<number, WeekBenchTax[]>()

  for (const { week, rosters } of weeklyData) {
    for (const roster of rosters) {
      const allPlayers: PlayerPointEntry[] = roster.players.map(pid => ({
        player_id: pid,
        position: playerPositions.get(pid) ?? 'UNK',
        points: roster.players_points[pid] ?? 0,
      }))

      const result = computeOptimalLineup(rosterPositions, roster.starters, allPlayers)
      const entry: WeekBenchTax = {
        roster_id: roster.roster_id,
        week,
        bench_tax: result.bench_tax,
        optimal_points: result.optimal_points,
        actual_points: result.actual_points,
        missed_starts: result.missed_starts,
      }

      if (!byRoster.has(roster.roster_id)) byRoster.set(roster.roster_id, [])
      byRoster.get(roster.roster_id)!.push(entry)
    }
  }

  const results: SeasonBenchTax[] = []
  for (const [roster_id, weeks] of byRoster) {
    const total_bench_tax = weeks.reduce((s, w) => s + w.bench_tax, 0)
    const worst_week = weeks.reduce((worst, w) => w.bench_tax > worst.bench_tax ? w : worst, weeks[0])
    results.push({ roster_id, total_bench_tax, weeks, worst_week })
  }

  // Sort by total bench tax descending (Captain Bench first)
  results.sort((a, b) => b.total_bench_tax - a.total_bench_tax)
  return results
}
