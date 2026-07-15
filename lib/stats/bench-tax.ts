// lib/stats/bench-tax.ts
//
// "Hindsight Trophy" engine — the gap between the highest-scoring lineup a
// manager could have started (given hindsight of final scores) and the one
// they actually played.

/** Position eligibility for each starting slot type */
export const SLOT_ELIGIBILITY: Record<string, string[]> = {
  QB: ['QB'],
  RB: ['RB'],
  WR: ['WR'],
  TE: ['TE'],
  FLEX: ['RB', 'WR', 'TE'],
  SUPER_FLEX: ['QB', 'RB', 'WR', 'TE'],
  K: ['K'],
  DEF: ['DEF'],
  // IDP slots
  DL: ['DL'],
  LB: ['LB'],
  DB: ['DB'],
  IDP_FLEX: ['DL', 'LB', 'DB'],
  // BN, IR, TAXI are bench — not counted in optimal
}

/** Slots that count toward the starting lineup (not bench/IR/TAXI) */
const STARTING_SLOTS = new Set(Object.keys(SLOT_ELIGIBILITY))

export interface PlayerPointEntry {
  player_id: string
  /** All fantasy-eligible positions for this player (from Sleeper's fantasy_positions), not just their primary position — a player can legally fill any slot matching any of these. */
  positions: string[]
  points: number
}

export interface OptimalLineupResult {
  optimal_points: number
  actual_points: number
  bench_tax: number
  /**
   * Real, slot-eligible swap suggestions: each entry pairs a benched player
   * who genuinely wasn't started anywhere with an actual starter who
   * genuinely wasn't part of the optimal lineup anywhere AND occupied a
   * slot the benched player was legally eligible for — so every suggestion
   * here is a substitution that could actually have been made.
   * Sorted by point delta descending (worst decision first).
   */
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
 * @param starters        - player_ids actually started, in slot order matching the starting-slot prefix of rosterPositions (Sleeper's convention)
 * @param allPlayers      - ALL players on the roster (starters + bench) with their eligible positions + points this week
 */
export function computeOptimalLineup(
  rosterPositions: string[],
  starters: string[],
  allPlayers: PlayerPointEntry[]
): OptimalLineupResult {
  // Only consider starting slots, in the order Sleeper lists them — this
  // order matches the `starters` array 1:1 (Sleeper convention: starters[i]
  // fills the i-th starting slot in roster_positions).
  const startingSlots = rosterPositions.filter(slot => STARTING_SLOTS.has(slot))
  const playerById = new Map(allPlayers.map(p => [p.player_id, p]))

  // Sort players by points descending
  const sorted = [...allPlayers].sort((a, b) => b.points - a.points)

  // Greedy assignment: assign best available eligible player to each slot.
  // Process slots from most-restrictive to least-restrictive eligibility
  // (dedicated slots, then FLEX, then SUPER_FLEX/IDP_FLEX) — since these
  // eligibility sets are nested/laminar (QB/RB/WR/TE ⊂ FLEX ⊂ SUPER_FLEX;
  // DL/LB/DB ⊂ IDP_FLEX), this greedy order is provably optimal, not just
  // a heuristic.
  const slotPriority = (slot: string) => SLOT_ELIGIBILITY[slot]?.length ?? 0
  const slotOrder = startingSlots
    .map((slot, index) => ({ slot, index }))
    .sort((a, b) => slotPriority(a.slot) - slotPriority(b.slot))

  const used = new Set<string>()
  // optimal pick per starting-slot index (aligned with startingSlots/starters)
  const optimalBySlotIndex = new Map<number, { player_id: string; points: number }>()

  for (const { slot, index } of slotOrder) {
    const eligible = SLOT_ELIGIBILITY[slot] ?? []
    const best = sorted.find(p => !used.has(p.player_id) && p.positions.some(pos => eligible.includes(pos)))
    if (best) {
      used.add(best.player_id)
      optimalBySlotIndex.set(index, { player_id: best.player_id, points: best.points })
    }
  }

  const optimal_points = [...optimalBySlotIndex.values()].reduce((s, a) => s + a.points, 0)

  // Actual points: sum of starters' points (whoever was actually started, in any slot)
  const actual_points = starters.reduce((s, pid) => s + (playerById.get(pid)?.points ?? 0), 0)

  const bench_tax = Math.max(0, optimal_points - actual_points)

  // Find missed starts: players the optimal lineup wanted but who weren't
  // started anywhere, paired with actual starters who weren't part of the
  // optimal lineup anywhere AND whose slot the benched player could legally
  // have filled. Excluding players who appear in both lineups (just at a
  // different, equally-valid slot) avoids flagging harmless reshuffles as
  // "missed starts."
  const missed_starts: OptimalLineupResult['missed_starts'] = []
  if (bench_tax > 0) {
    const optimalPlayerIds = new Set([...optimalBySlotIndex.values()].map(a => a.player_id))
    const starterIds = new Set(starters)

    const shouldHaveStarted = [...optimalBySlotIndex.values()]
      .filter(a => !starterIds.has(a.player_id))
      .sort((a, b) => b.points - a.points)

    const shouldHaveBeenBenched = starters
      .map((pid, i) => ({ player: playerById.get(pid), slot: startingSlots[i] }))
      .filter((x): x is { player: PlayerPointEntry; slot: string } => !!x.player && !optimalPlayerIds.has(x.player.player_id))

    const usedBenched = new Set<string>()
    for (const snub of shouldHaveStarted) {
      const snubPositions = playerById.get(snub.player_id)?.positions ?? []
      // Among actual starters not in the optimal lineup, find ones whose
      // slot the snubbed player was actually eligible for — a real,
      // legal substitution — and pick the worst-scoring one (biggest snub).
      const candidates = shouldHaveBeenBenched
        .filter(c => !usedBenched.has(c.player.player_id) && snubPositions.some(pos => (SLOT_ELIGIBILITY[c.slot] ?? []).includes(pos)))
        .sort((a, b) => a.player.points - b.player.points)

      const worst = candidates[0]
      if (!worst) continue
      usedBenched.add(worst.player.player_id)
      missed_starts.push({
        benched_player_id: snub.player_id,
        benched_points: snub.points,
        started_player_id: worst.player.player_id,
        started_points: worst.player.points,
        delta: snub.points - worst.player.points,
        slot: worst.slot,
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
 * Compute bench tax (the "Hindsight Trophy" metric) for all rosters across all weeks.
 *
 * @param weeklyData  - per week: matchup data (roster_id, starters, players, players_points)
 * @param playerPositions - map of player_id -> eligible positions array (from Sleeper's fantasy_positions)
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
  playerPositions: Map<string, string[]>,
  rosterPositions: string[]
): SeasonBenchTax[] {
  const byRoster = new Map<number, WeekBenchTax[]>()

  for (const { week, rosters } of weeklyData) {
    for (const roster of rosters) {
      const allPlayers: PlayerPointEntry[] = roster.players.map(pid => ({
        player_id: pid,
        positions: playerPositions.get(pid) ?? [],
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
