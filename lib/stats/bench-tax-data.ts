// lib/stats/bench-tax-data.ts
import { getLeague, getMatchups, getLeagueUsers, getRosters, getNFLState, getAllPlayers } from '../sleeper'
import { computeSeasonBenchTax, SeasonBenchTax } from './bench-tax'
import { getManagerByUsername } from '../managers'
import { CURRENT_LEAGUE_ID } from '../constants'
import { supabaseAdmin } from '../db/supabase'

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

async function getPlayerPositionsMap(): Promise<Map<string, string>> {
  // Try Supabase cache first
  try {
    const { data } = await supabaseAdmin
      .from('nfl_players_cache')
      .select('player_id, data')
      .limit(10000)
    if (data && data.length > 0) {
      return new Map(data.map((row: { player_id: string; data: { position?: string } }) => [
        row.player_id,
        (row.data as { position?: string }).position ?? 'UNK'
      ]))
    }
  } catch { /* fall through */ }

  // Fall back to live API (slow but safe)
  const players = await getAllPlayers()
  return new Map(Object.entries(players).map(([id, p]) => [id, p.position ?? 'UNK']))
}

function buildSwapLabel(
  missedStarts: SeasonBenchTax['worst_week']['missed_starts'],
  playerNames: Map<string, string>
): string {
  if (missedStarts.length === 0) return 'No bad swaps found'
  const top = missedStarts[0]
  const benched = playerNames.get(top.benched_player_id) ?? top.benched_player_id
  const started = playerNames.get(top.started_player_id) ?? top.started_player_id
  return `Started ${started} (${top.started_points.toFixed(1)}pts) over ${benched} (${top.benched_points.toFixed(1)}pts)`
}

export async function getBenchTaxData(): Promise<BenchTaxData> {
  const [nflState, league, users, rosters] = await Promise.all([
    getNFLState(),
    getLeague(CURRENT_LEAGUE_ID),
    getLeagueUsers(CURRENT_LEAGUE_ID),
    getRosters(CURRENT_LEAGUE_ID),
  ])

  const currentWeek = Math.min(nflState.week, (league.settings.playoff_week_start ?? 15) - 1)
  const rosterPositions: string[] = league.roster_positions ?? ['QB','RB','RB','WR','WR','TE','FLEX','BN','BN','BN','BN','BN']

  // Build rosterMap
  const rosterMap = new Map<number, { display_name: string; real_name: string; avatar_url: string | null }>()
  for (const roster of rosters) {
    if (!roster.owner_id) continue
    const user = users.find(u => u.user_id === roster.owner_id)
    if (!user) continue
    const manager = getManagerByUsername(user.username)
    const teamName = user.metadata?.team_name || manager?.teamName || null
    rosterMap.set(roster.roster_id, {
      display_name: teamName ?? user.display_name,
      real_name: manager?.realName ?? user.display_name,
      avatar_url: user.avatar ? `https://sleepercdn.com/avatars/thumbs/${user.avatar}` : null,
    })
  }

  // Fetch all completed weeks
  const weeklyData: Array<{ week: number; rosters: Array<{ roster_id: number; starters: string[]; players: string[]; players_points: Record<string, number> }> }> = []
  for (let w = 1; w <= currentWeek; w++) {
    try {
      const matchups = await getMatchups(CURRENT_LEAGUE_ID, w)
      if (matchups.length === 0) break
      weeklyData.push({
        week: w,
        rosters: matchups.map(m => ({
          roster_id: m.roster_id,
          starters: m.starters,
          players: m.players,
          players_points: m.players_points,
        })),
      })
    } catch { break }
  }

  const playerPositions = await getPlayerPositionsMap()

  // Build player name lookup (first + last name)
  const playerNames = new Map<string, string>()
  try {
    const { data } = await supabaseAdmin
      .from('nfl_players_cache')
      .select('player_id, data')
      .limit(10000)
    if (data) {
      for (const row of data) {
        const d = row.data as { first_name?: string; last_name?: string; full_name?: string }
        const fallback = `${d.first_name ?? ''} ${d.last_name ?? ''}`.trim() || row.player_id
        playerNames.set(row.player_id, d.full_name ?? fallback)
      }
    }
  } catch { /* names will fall back to player_id */ }

  const seasonData = computeSeasonBenchTax(weeklyData, playerPositions, rosterPositions)

  const leaderboard: BenchTaxRow[] = seasonData.map(s => {
    const info = rosterMap.get(s.roster_id) ?? { display_name: `Team ${s.roster_id}`, real_name: `Team ${s.roster_id}`, avatar_url: null }
    return {
      roster_id: s.roster_id,
      display_name: info.display_name,
      real_name: info.real_name,
      avatar_url: info.avatar_url,
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
      const info = rosterMap.get(s.roster_id) ?? { display_name: `Team ${s.roster_id}` }
      worstOverall = {
        roster_id: s.roster_id,
        display_name: info.display_name,
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
