/**
 * WeekBrief — compact structured summary of a single completed week.
 * This is the ONLY data the AI model sees. Keep it small and factual.
 * No player_ids, no raw API fields — only human-readable names + numbers.
 */
export interface MatchupResult {
  matchup_id: number
  winner: string        // display name
  winner_points: number
  loser: string
  loser_points: number
  margin: number
}

export interface BenchTaxHighlight {
  manager: string        // display name
  bench_tax: number
  /** "Started [X] (Npts) over [Y] (Mpts)" */
  worst_swap: string
}

export interface TradeHighlight {
  week: number
  sides: Array<{
    manager: string
    received_summary: string  // "Player A + Player B"
    ros_points: number
    delta: number
  }>
  robbery_score: number
}

export interface WaiverHighlight {
  manager: string
  player_name: string
  points_gained: number
}

export interface StandingsSummary {
  manager: string
  wins: number
  losses: number
  power_rank: number
  points_for: number
}

export interface WeekBrief {
  season: string
  week: number
  /** Matchup-by-matchup results */
  matchup_results: MatchupResult[]
  /** Season standings snapshot (sorted by power rank) */
  standings: StandingsSummary[]
  /** This week's notable awards */
  awards: {
    highest_scorer: { manager: string; points: number } | null
    lowest_scorer: { manager: string; points: number } | null
    biggest_blowout: { winner: string; loser: string; margin: number } | null
    closest_game: { winner: string; loser: string; margin: number } | null
    shouldve_won: { manager: string; points: number } | null
    shouldve_lost: { manager: string; points: number } | null
  }
  /** Bench tax highlight for this week */
  bench_tax: BenchTaxHighlight | null
  /** Notable trades this week (may be empty) */
  trades: TradeHighlight[]
  /** Top waiver pickup this week (may be null) */
  top_waiver: WaiverHighlight | null
  /** Standings movement — managers who gained/dropped most power rank spots */
  standings_movement: Array<{ manager: string; power_rank_change: number }>
}

/**
 * Assembles a WeekBrief from pre-computed data.
 * All inputs must already be resolved (no API calls here — pure data transformation).
 */
export function assembleWeekBrief(input: {
  season: string
  week: number
  matchups: Array<{
    matchup_id: number
    home: { display_name: string; points: number }
    away: { display_name: string; points: number }
  }>
  standings: Array<{
    display_name: string
    wins: number
    losses: number
    power_rank: number
    points_for: number
  }>
  prevStandings: Array<{
    display_name: string
    power_rank: number
  }> | null
  awards: {
    highest_scorer: { roster_id: number; points: number } | null
    lowest_scorer: { roster_id: number; points: number } | null
    biggest_blowout: { winner_roster_id: number; loser_roster_id: number; margin: number } | null
    closest_game: { winner_roster_id: number; loser_roster_id: number; margin: number } | null
    shouldve_won: { roster_id: number; points: number } | null
    shouldve_lost: { roster_id: number; points: number } | null
  } | null
  rosterIdToName: Map<number, string>
  benchTaxLeader: { roster_id: number; bench_tax: number; swap_label: string } | null
  trades: Array<{
    week: number
    robbery_score: number
    participants: Array<{
      roster_id: number
      ros_points_received: number
      trade_value_delta: number
      players_received: string[]  // player names (already resolved)
    }>
  }>
  topWaiver: { roster_id: number; player_name: string; points_gained: number } | null
}): WeekBrief {
  function name(roster_id: number): string {
    return input.rosterIdToName.get(roster_id) ?? `Team ${roster_id}`
  }

  // Matchup results
  const matchup_results: MatchupResult[] = input.matchups.map(m => {
    const winner = m.home.points >= m.away.points ? m.home : m.away
    const loser  = m.home.points >= m.away.points ? m.away : m.home
    return {
      matchup_id: m.matchup_id,
      winner: winner.display_name,
      winner_points: winner.points,
      loser: loser.display_name,
      loser_points: loser.points,
      margin: winner.points - loser.points,
    }
  })

  // Standings (sorted by power rank)
  const standings: StandingsSummary[] = [...input.standings]
    .sort((a, b) => a.power_rank - b.power_rank)
    .map(s => ({
      manager: s.display_name,
      wins: s.wins,
      losses: s.losses,
      power_rank: s.power_rank,
      points_for: s.points_for,
    }))

  // Standings movement vs previous week
  const standings_movement: WeekBrief['standings_movement'] = []
  if (input.prevStandings) {
    const prevRankMap = new Map(input.prevStandings.map(s => [s.display_name, s.power_rank]))
    for (const s of standings) {
      const prev = prevRankMap.get(s.manager)
      if (prev !== undefined) {
        const change = prev - s.power_rank  // positive = moved up
        if (change !== 0) {
          standings_movement.push({ manager: s.manager, power_rank_change: change })
        }
      }
    }
    standings_movement.sort((a, b) => Math.abs(b.power_rank_change) - Math.abs(a.power_rank_change))
  }

  // Awards
  const a = input.awards
  const awards: WeekBrief['awards'] = {
    highest_scorer: a?.highest_scorer ? { manager: name(a.highest_scorer.roster_id), points: a.highest_scorer.points } : null,
    lowest_scorer:  a?.lowest_scorer  ? { manager: name(a.lowest_scorer.roster_id),  points: a.lowest_scorer.points  } : null,
    biggest_blowout: a?.biggest_blowout ? { winner: name(a.biggest_blowout.winner_roster_id), loser: name(a.biggest_blowout.loser_roster_id), margin: a.biggest_blowout.margin } : null,
    closest_game:    a?.closest_game    ? { winner: name(a.closest_game.winner_roster_id),    loser: name(a.closest_game.loser_roster_id),    margin: a.closest_game.margin    } : null,
    shouldve_won:  a?.shouldve_won  ? { manager: name(a.shouldve_won.roster_id),  points: a.shouldve_won.points  } : null,
    shouldve_lost: a?.shouldve_lost ? { manager: name(a.shouldve_lost.roster_id), points: a.shouldve_lost.points } : null,
  }

  // Bench tax
  const bench_tax: BenchTaxHighlight | null = input.benchTaxLeader
    ? { manager: name(input.benchTaxLeader.roster_id), bench_tax: input.benchTaxLeader.bench_tax, worst_swap: input.benchTaxLeader.swap_label }
    : null

  // Trades this week
  const trades: TradeHighlight[] = input.trades
    .filter(t => t.week === input.week)
    .map(t => ({
      week: t.week,
      sides: t.participants.map(p => ({
        manager: name(p.roster_id),
        received_summary: p.players_received.join(' + ') || '—',
        ros_points: p.ros_points_received,
        delta: p.trade_value_delta,
      })),
      robbery_score: t.robbery_score,
    }))

  // Top waiver
  const top_waiver: WaiverHighlight | null = input.topWaiver
    ? { manager: name(input.topWaiver.roster_id), player_name: input.topWaiver.player_name, points_gained: input.topWaiver.points_gained }
    : null

  return { season: input.season, week: input.week, matchup_results, standings, awards, bench_tax, trades, top_waiver, standings_movement }
}
