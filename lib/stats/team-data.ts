// lib/stats/team-data.ts
import { getSeasonSnapshot } from './season-snapshot'
import { getManagerByUsername } from '../managers'
import { CURRENT_LEAGUE_ID } from '../constants'
import { supabaseAdmin } from '../db/supabase'

export interface H2HRecord {
  opponent_username: string
  opponent_display_name: string
  wins: number
  losses: number
  ties: number
  points_for: number
  points_against: number
}

export interface TeamPageData {
  username: string
  display_name: string
  real_name: string
  nfl_team: string
  persona_notes: string
  avatar_url: string | null
  roster_id: number | null
  // Season stats
  wins: number
  losses: number
  ties: number
  points_for: number
  points_against: number
  power_rank: number | null
  luck_index: number | null
  // Category stats (null if data unavailable)
  bench_tax_total: number | null
  bench_tax_rank: number | null   // 1 = highest (worst)
  draft_grade: string | null       // letter grade
  draft_grade_score: number | null
  draft_grade_rank: number | null  // 1 = best
  trade_delta: number | null
  trade_king: boolean
  waiver_points: number | null
  waiver_wizard: boolean
  // Current roster player names
  current_roster: string[]  // display names
  // H2H vs every other manager (this season)
  h2h: H2HRecord[]
}

async function getPlayerNamesMap(): Promise<Map<string, string>> {
  try {
    const { data } = await supabaseAdmin
      .from('nfl_players_cache')
      .select('player_id, data')
      .limit(10000)
    if (data && data.length > 0) {
      return new Map(data.map((row: { player_id: string; data: Record<string, unknown> }) => {
        const d = row.data as { first_name?: string; last_name?: string; full_name?: string }
        const name = d.full_name ?? (`${d.first_name ?? ''} ${d.last_name ?? ''}`.trim() || row.player_id)
        return [row.player_id, name]
      }))
    }
  } catch { /* fall through */ }
  return new Map()
}

export async function getTeamData(username: string): Promise<TeamPageData | null> {
  const manager = getManagerByUsername(username)
  if (!manager) return null

  const snapshot = await getSeasonSnapshot(CURRENT_LEAGUE_ID)

  // Find this user's Sleeper user + roster. Sleeper's league-users endpoint
  // no longer returns `username` (always null) — fall back to display_name,
  // which reliably matches the usernames configured in lib/managers.ts.
  const sleeperUser = snapshot.users.find(u =>
    u.username?.toLowerCase() === username.toLowerCase() ||
    u.display_name?.toLowerCase() === username.toLowerCase()
  )
  const thisRoster = snapshot.rosters.find(r => r.owner_id === sleeperUser?.user_id)
  const roster_id = thisRoster?.roster_id ?? null

  const teamName = sleeperUser?.metadata?.team_name || manager.teamName || null
  const display_name = teamName ?? username
  const avatar_url = sleeperUser?.avatar ? `https://sleepercdn.com/avatars/thumbs/${sleeperUser.avatar}` : null

  // W/L/T and PF/PA from matchup history
  let wins = 0, losses = 0, ties = 0, points_for = 0, points_against = 0
  const h2hMap = new Map<number, H2HRecord>()  // opponent_roster_id → record

  for (const { matchups } of snapshot.weeklyMatchups) {
    const mine = matchups.find(m => m.roster_id === roster_id)
    if (!mine) continue
    const opp = matchups.find(m => m.matchup_id === mine.matchup_id && m.roster_id !== roster_id)
    if (!opp) continue

    points_for += mine.points
    points_against += opp.points

    let w = 0, l = 0, t = 0
    if (mine.points > opp.points) { wins++; w = 1 }
    else if (opp.points > mine.points) { losses++; l = 1 }
    else { ties++; t = 1 }

    const oppInfo = snapshot.rosterInfo.get(opp.roster_id)
    const existing = h2hMap.get(opp.roster_id) ?? {
      opponent_username: oppInfo?.username ?? `roster_${opp.roster_id}`,
      opponent_display_name: oppInfo?.display_name ?? `Team ${opp.roster_id}`,
      wins: 0, losses: 0, ties: 0, points_for: 0, points_against: 0,
    }
    existing.wins += w
    existing.losses += l
    existing.ties += t
    existing.points_for += mine.points
    existing.points_against += opp.points
    h2hMap.set(opp.roster_id, existing)
  }

  const h2h = [...h2hMap.values()].sort((a, b) => a.opponent_display_name.localeCompare(b.opponent_display_name))

  // Current roster player names
  const playerNames = await getPlayerNamesMap()
  const current_roster = (thisRoster?.players ?? [])
    .map(pid => playerNames.get(pid) ?? pid)
    .sort()

  return {
    username,
    display_name,
    real_name: manager.realName,
    nfl_team: manager.nflTeam,
    persona_notes: manager.personaNotes,
    avatar_url,
    roster_id,
    wins,
    losses,
    ties,
    points_for,
    points_against,
    power_rank: null,    // enriched below by caller if standings data available
    luck_index: null,
    bench_tax_total: null,
    bench_tax_rank: null,
    draft_grade: null,
    draft_grade_score: null,
    draft_grade_rank: null,
    trade_delta: null,
    trade_king: false,
    waiver_points: null,
    waiver_wizard: false,
    current_roster,
    h2h,
  }
}

/** Enrich a TeamPageData with cross-engine stats by merging in parallel data */
export function enrichTeamData(
  base: TeamPageData,
  opts: {
    standings?: Array<{ roster_id: number; power_rank: number; luck_index: number }> | null
    benchTaxLeaderboard?: Array<{ roster_id: number; total_bench_tax: number }> | null
    draftGradeRosters?: Array<{ roster_id: number; letter_grade: string; grade_score: number; rank: number }> | null
    tradeGradeRosters?: Array<{ roster_id: number; cumulative_delta: number }> | null
    tradeKingRosterId?: number | null
    waiverRosters?: Array<{ roster_id: number; total_points_gained: number }> | null
    waiverWizardRosterId?: number | null
  }
): TeamPageData {
  const rid = base.roster_id
  if (rid === null) return base

  const standing = opts.standings?.find(s => s.roster_id === rid)
  const benchEntry = opts.benchTaxLeaderboard?.find(b => b.roster_id === rid)
  const benchRank = opts.benchTaxLeaderboard ? (opts.benchTaxLeaderboard.findIndex(b => b.roster_id === rid) + 1) || null : null
  const draftEntry = opts.draftGradeRosters?.find(d => d.roster_id === rid)
  const tradeEntry = opts.tradeGradeRosters?.find(t => t.roster_id === rid)
  const waiverEntry = opts.waiverRosters?.find(w => w.roster_id === rid)

  return {
    ...base,
    power_rank: standing?.power_rank ?? null,
    luck_index: standing?.luck_index ?? null,
    bench_tax_total: benchEntry?.total_bench_tax ?? null,
    bench_tax_rank: benchRank,
    draft_grade: draftEntry?.letter_grade ?? null,
    draft_grade_score: draftEntry?.grade_score ?? null,
    draft_grade_rank: draftEntry?.rank ?? null,
    trade_delta: tradeEntry?.cumulative_delta ?? null,
    trade_king: opts.tradeKingRosterId === rid,
    waiver_points: waiverEntry?.total_points_gained ?? null,
    waiver_wizard: opts.waiverWizardRosterId === rid,
  }
}
