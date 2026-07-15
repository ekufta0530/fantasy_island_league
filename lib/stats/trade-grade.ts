// lib/stats/trade-grade.ts

export interface TradeParticipant {
  roster_id: number
  players_received: string[]   // player_ids this roster received
  players_given: string[]      // player_ids this roster gave away
  ros_points_received: number  // sum of ROS points for players received
  ros_points_given: number     // sum of ROS points for players given away
  trade_value_delta: number    // ros_points_received - ros_points_given
}

export interface GradedTrade {
  transaction_id: string
  week: number                 // week the trade processed
  season: string
  participants: TradeParticipant[]
  is_in_progress: boolean      // true if traded after week (SEASON_WEEKS - MIN_ROS_WEEKS)
  /** Robbery magnitude: max(delta) - min(delta) across participants */
  robbery_score: number
  winner_roster_id: number     // participant with highest delta
  loser_roster_id: number      // participant with lowest delta
}

export interface RosterTradeGrade {
  roster_id: number
  cumulative_delta: number     // sum of trade_value_delta across all trades
  trades_involved: number
  best_trade_delta: number
  worst_trade_delta: number
}

export interface TradeGradeResult {
  graded_trades: GradedTrade[]
  roster_grades: RosterTradeGrade[]
  trade_king: RosterTradeGrade   // highest cumulative delta
  fleeced: RosterTradeGrade      // most negative cumulative delta
  robbery_of_year: GradedTrade   // single trade with highest robbery_score
}

/** Weeks at which we start labeling trades "in progress" (fewer than 3 weeks of ROS data) */
const MIN_ROS_WEEKS = 3

/**
 * Compute trade grades.
 *
 * @param trades           - all transactions of type 'trade'
 * @param playerRosPoints  - map of player_id → Map<week_number, points_that_week>
 *                           (all weeks' matchup points per player)
 * @param currentWeek      - the latest completed week
 * @param totalRegularSeasonWeeks - total regular season weeks (default 17)
 * @param season           - season string
 */
export function computeTradeGrades(
  trades: Array<{
    transaction_id: string
    week: number
    adds: Record<string, number> | null    // player_id → roster_id that received
    drops: Record<string, number> | null   // player_id → roster_id that gave away
    roster_ids: number[]
  }>,
  playerRosPoints: Map<string, Map<number, number>>,
  currentWeek: number,
  totalRegularSeasonWeeks: number = 17,
  season: string = ''
): TradeGradeResult {
  /** Sum a player's points from week `fromWeek` (inclusive) through `toWeek` (inclusive) */
  function rosPoints(player_id: string, fromWeek: number, toWeek: number): number {
    const weekMap = playerRosPoints.get(player_id)
    if (!weekMap) return 0
    let total = 0
    for (let w = fromWeek; w <= toWeek; w++) {
      total += weekMap.get(w) ?? 0
    }
    return total
  }

  const graded_trades: GradedTrade[] = []

  for (const trade of trades) {
    if (!trade.adds || !trade.drops) continue
    const tradeWeek = trade.week
    const rosFromWeek = tradeWeek + 1  // ROS starts the week AFTER the trade
    const rosToWeek = Math.min(currentWeek, totalRegularSeasonWeeks)

    // Determine what each roster gave and received
    const participantMap = new Map<number, TradeParticipant>()
    for (const rid of trade.roster_ids) {
      participantMap.set(rid, {
        roster_id: rid,
        players_received: [],
        players_given: [],
        ros_points_received: 0,
        ros_points_given: 0,
        trade_value_delta: 0,
      })
    }

    // adds: player_id → roster_id that RECEIVED the player
    for (const [player_id, to_roster_id] of Object.entries(trade.adds)) {
      const p = participantMap.get(to_roster_id)
      if (!p) continue
      p.players_received.push(player_id)
      p.ros_points_received += rosPoints(player_id, rosFromWeek, rosToWeek)
    }

    // drops: player_id → roster_id that HAD and GAVE AWAY the player
    for (const [player_id, from_roster_id] of Object.entries(trade.drops)) {
      const p = participantMap.get(from_roster_id)
      if (!p) continue
      p.players_given.push(player_id)
      p.ros_points_given += rosPoints(player_id, rosFromWeek, rosToWeek)
    }

    // Compute delta for each participant
    const participants = [...participantMap.values()].map(p => ({
      ...p,
      trade_value_delta: p.ros_points_received - p.ros_points_given,
    }))

    const deltas = participants.map(p => p.trade_value_delta)
    const maxDelta = Math.max(...deltas)
    const minDelta = Math.min(...deltas)
    const winner = participants.find(p => p.trade_value_delta === maxDelta)!
    const loser = participants.find(p => p.trade_value_delta === minDelta)!

    graded_trades.push({
      transaction_id: trade.transaction_id,
      week: tradeWeek,
      season,
      participants,
      is_in_progress: tradeWeek >= totalRegularSeasonWeeks - MIN_ROS_WEEKS,
      robbery_score: maxDelta - minDelta,
      winner_roster_id: winner.roster_id,
      loser_roster_id: loser.roster_id,
    })
  }

  // Per-roster cumulative grades
  const rosterAccum = new Map<number, { delta: number; count: number; best: number; worst: number }>()
  for (const gt of graded_trades) {
    for (const p of gt.participants) {
      const acc = rosterAccum.get(p.roster_id) ?? { delta: 0, count: 0, best: -Infinity, worst: Infinity }
      acc.delta += p.trade_value_delta
      acc.count++
      acc.best = Math.max(acc.best, p.trade_value_delta)
      acc.worst = Math.min(acc.worst, p.trade_value_delta)
      rosterAccum.set(p.roster_id, acc)
    }
  }

  const roster_grades: RosterTradeGrade[] = [...rosterAccum.entries()].map(([roster_id, acc]) => ({
    roster_id,
    cumulative_delta: acc.delta,
    trades_involved: acc.count,
    best_trade_delta: acc.best === -Infinity ? 0 : acc.best,
    worst_trade_delta: acc.worst === Infinity ? 0 : acc.worst,
  })).sort((a, b) => b.cumulative_delta - a.cumulative_delta)

  const trade_king = roster_grades[0] ?? { roster_id: 0, cumulative_delta: 0, trades_involved: 0, best_trade_delta: 0, worst_trade_delta: 0 }
  const fleeced = roster_grades[roster_grades.length - 1] ?? trade_king
  const robbery_of_year = graded_trades.sort((a, b) => b.robbery_score - a.robbery_score)[0] ?? null

  return { graded_trades, roster_grades, trade_king, fleeced, robbery_of_year }
}
