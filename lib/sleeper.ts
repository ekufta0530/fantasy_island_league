const BASE_URL = 'https://api.sleeper.app/v1'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface SleeperLeague {
  league_id: string
  name: string
  season: string
  season_type: string
  status: string
  sport: string
  total_rosters: number
  roster_positions: string[]  // e.g. ['QB','RB','RB','WR','WR','TE','FLEX','BN','BN','BN','BN','BN','BN']
  scoring_settings: Record<string, number>
  settings: {
    waiver_type: number  // 0=rolling, 1=reset, 2=FAAB
    playoff_week_start: number
    num_teams: number
    [key: string]: unknown
  }
  previous_league_id: string | null
  draft_id: string
  avatar: string | null
  metadata: Record<string, unknown>
}

export interface SleeperRoster {
  roster_id: number
  owner_id: string | null
  league_id: string
  players: string[]
  starters: string[]
  reserve: string[] | null
  settings: {
    wins: number
    losses: number
    ties: number
    fpts: number
    fpts_decimal: number
    fpts_against: number
    fpts_against_decimal: number
    [key: string]: unknown
  }
  metadata: Record<string, unknown> | null
}

export interface SleeperUser {
  user_id: string
  username: string
  display_name: string
  avatar: string | null
  metadata: {
    team_name?: string
    [key: string]: unknown
  }
}

export interface SleeperMatchup {
  matchup_id: number
  roster_id: number
  points: number
  custom_points: number | null
  players: string[]
  starters: string[]
  players_points: Record<string, number>  // player_id -> points
  starters_points: number[]
}

export interface SleeperTransaction {
  transaction_id: string
  type: 'trade' | 'waiver' | 'free_agent'
  status: string
  created: number
  status_updated: number
  roster_ids: number[]
  adds: Record<string, number> | null   // player_id -> roster_id
  drops: Record<string, number> | null  // player_id -> roster_id
  draft_picks: SleeperTradedPick[]
  waiver_budget: { sender: number; receiver: number; amount: number }[]
  metadata: Record<string, unknown> | null
  leg: number
}

export interface SleeperTradedPick {
  season: string
  round: number
  roster_id: number      // owner at time of trade
  previous_owner_id: number
  owner_id: number       // current owner
}

export interface SleeperDraft {
  draft_id: string
  league_id: string
  season: string
  type: string
  status: string
  sport: string
  settings: {
    teams: number
    rounds: number
    pick_timer: number
    [key: string]: unknown
  }
  slot_to_roster_id: Record<string, number>
  draft_order: Record<string, number> | null
  metadata: Record<string, unknown>
  start_time: number
}

export interface SleeperDraftPick {
  pick_id: string
  draft_id: string
  draft_slot: number
  pick_no: number
  round: number
  roster_id: number
  player_id: string
  picked_by: string
  metadata: {
    first_name: string
    last_name: string
    position: string
    team: string
    [key: string]: unknown
  }
}

export interface SleeperNFLState {
  week: number
  season: string
  season_type: string   // 'regular', 'post', 'pre'
  season_start_date: string
  display_week: number
  user_week: number
  leg: number
}

export interface SleeperPlayerStats {
  // Map of player_id -> stat fields
  // Key stat fields: pts_ppr, pts_half_ppr, pts_std, pass_yd, pass_td, rush_yd, rush_td, rec, rec_yd, rec_td, etc.
  [key: string]: number
}

export interface SleeperPlayer {
  player_id: string
  first_name: string
  last_name: string
  full_name: string | null
  position: string      // QB, RB, WR, TE, K, DEF, etc.
  team: string | null
  status: string | null
  age: number | null
  years_exp: number | null
  search_rank: number | null
  fantasy_positions: string[] | null
  [key: string]: unknown
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function fetchSleeper<T>(path: string): Promise<T> {
  const url = `${BASE_URL}${path}`
  const res = await fetch(url, {
    next: { revalidate: 300 },  // Next.js cache: 5 min default
  })
  if (!res.ok) {
    throw new Error(`Sleeper API error ${res.status} for ${url}`)
  }
  return res.json() as Promise<T>
}

// ─── League ──────────────────────────────────────────────────────────────────

export async function getLeague(leagueId: string): Promise<SleeperLeague> {
  return fetchSleeper<SleeperLeague>(`/league/${leagueId}`)
}

export async function getRosters(leagueId: string): Promise<SleeperRoster[]> {
  return fetchSleeper<SleeperRoster[]>(`/league/${leagueId}/rosters`)
}

export async function getLeagueUsers(leagueId: string): Promise<SleeperUser[]> {
  return fetchSleeper<SleeperUser[]>(`/league/${leagueId}/users`)
}

export async function getMatchups(leagueId: string, week: number): Promise<SleeperMatchup[]> {
  return fetchSleeper<SleeperMatchup[]>(`/league/${leagueId}/matchups/${week}`)
}

export async function getTransactions(leagueId: string, week: number): Promise<SleeperTransaction[]> {
  return fetchSleeper<SleeperTransaction[]>(`/league/${leagueId}/transactions/${week}`)
}

export async function getTradedPicks(leagueId: string): Promise<SleeperTradedPick[]> {
  return fetchSleeper<SleeperTradedPick[]>(`/league/${leagueId}/traded_picks`)
}

export async function getLeagueDrafts(leagueId: string): Promise<SleeperDraft[]> {
  return fetchSleeper<SleeperDraft[]>(`/league/${leagueId}/drafts`)
}

export async function getWinnersBracket(leagueId: string): Promise<unknown[]> {
  return fetchSleeper<unknown[]>(`/league/${leagueId}/winners_bracket`)
}

export async function getLosersBracket(leagueId: string): Promise<unknown[]> {
  return fetchSleeper<unknown[]>(`/league/${leagueId}/losers_bracket`)
}

// ─── Draft ────────────────────────────────────────────────────────────────────

export async function getDraftPicks(draftId: string): Promise<SleeperDraftPick[]> {
  return fetchSleeper<SleeperDraftPick[]>(`/draft/${draftId}/picks`)
}

export async function getDraftTradedPicks(draftId: string): Promise<SleeperTradedPick[]> {
  return fetchSleeper<SleeperTradedPick[]>(`/draft/${draftId}/traded_picks`)
}

// ─── Players / Stats ─────────────────────────────────────────────────────────

/** Fetch all NFL players (~5MB). Cache aggressively — call at most once/day. */
export async function getAllPlayers(): Promise<Record<string, SleeperPlayer>> {
  return fetchSleeper<Record<string, SleeperPlayer>>('/players/nfl')
}

/** Weekly stats for all players. Confirmed endpoint: /stats/nfl/regular/{season}/{week} */
export async function getPlayerStats(season: string, week: number): Promise<Record<string, SleeperPlayerStats>> {
  return fetchSleeper<Record<string, SleeperPlayerStats>>(`/stats/nfl/regular/${season}/${week}`)
}

export async function getNFLState(): Promise<SleeperNFLState> {
  return fetchSleeper<SleeperNFLState>('/state/nfl')
}

// ─── League history chain ─────────────────────────────────────────────────────

/**
 * Walk the previous_league_id chain from a given league ID.
 * Returns all league IDs in chronological order (oldest first).
 */
export async function getLeagueHistory(currentLeagueId: string): Promise<string[]> {
  const ids: string[] = []
  let leagueId: string | null = currentLeagueId

  // Safety: max 20 seasons to avoid infinite loops
  let guard = 0
  while (leagueId && guard < 20) {
    ids.unshift(leagueId)  // prepend so result is oldest-first
    const league = await getLeague(leagueId)
    leagueId = league.previous_league_id || null
    guard++
  }

  return ids
}
