// lib/stats/draft-grade-data.ts
import { getLeague, getLeagueDrafts, getDraftPicks, getLeagueUsers, getRosters, getAllPlayers } from '../sleeper'
import { computeDraftGrades, DraftPickInput, DraftGradeResult } from './draft-grade'
import { getManagerByUsername } from '../managers'
import { CURRENT_LEAGUE_ID } from '../constants'
import { supabaseAdmin } from '../db/supabase'

export interface DraftGradePageData {
  result: DraftGradeResult
  rosterNames: Map<number, { display_name: string; real_name: string; avatar_url: string | null }>
  totalPicks: number
  season: string
}

async function getPlayerDataMap(): Promise<Map<string, { name: string; position: string }>> {
  // Try Supabase cache first
  try {
    const { data } = await supabaseAdmin
      .from('nfl_players_cache')
      .select('player_id, data')
      .limit(10000)
    if (data && data.length > 0) {
      const map = new Map<string, { name: string; position: string }>()
      for (const row of data) {
        const d = row.data as { first_name?: string; last_name?: string; full_name?: string; position?: string }
        const name = d.full_name ?? (`${d.first_name ?? ''} ${d.last_name ?? ''}`.trim() || row.player_id)
        map.set(row.player_id, { name, position: d.position ?? 'UNK' })
      }
      return map
    }
  } catch { /* fall through */ }

  // Fall back to live API
  const players = await getAllPlayers()
  return new Map(Object.entries(players).map(([id, p]) => [
    id,
    { name: p.full_name ?? `${p.first_name} ${p.last_name}`.trim(), position: p.position ?? 'UNK' }
  ]))
}

async function getSeasonPointsMap(season: string, maxWeek: number): Promise<Map<string, number>> {
  // Sum points across all weeks from raw_matchups in Supabase
  // players_points is a JSONB field on each matchup row: { player_id: points }
  const points = new Map<string, number>()
  try {
    const { data } = await supabaseAdmin
      .from('raw_matchups')
      .select('data')
      .eq('season', season)
      .lte('week', maxWeek)
    if (data) {
      for (const row of data) {
        const d = row.data as { players_points?: Record<string, number> }
        for (const [pid, pts] of Object.entries(d.players_points ?? {})) {
          points.set(pid, (points.get(pid) ?? 0) + pts)
        }
      }
    }
  } catch { /* no DB data yet — return empty map, all players get 0 pts */ }
  return points
}

export async function getDraftGradeData(leagueId: string = CURRENT_LEAGUE_ID): Promise<DraftGradePageData> {
  const [league, users, rosters] = await Promise.all([
    getLeague(leagueId),
    getLeagueUsers(leagueId),
    getRosters(leagueId),
  ])

  const season = league.season
  const maxWeek = league.settings.playoff_week_start ? league.settings.playoff_week_start - 1 : 17

  // Build rosterNames map
  const rosterNames = new Map<number, { display_name: string; real_name: string; avatar_url: string | null }>()
  for (const roster of rosters) {
    if (!roster.owner_id) continue
    const user = users.find(u => u.user_id === roster.owner_id)
    if (!user) continue
    const manager = getManagerByUsername(user.username)
    const teamName = user.metadata?.team_name || manager?.teamName || null
    rosterNames.set(roster.roster_id, {
      display_name: teamName ?? user.display_name,
      real_name: manager?.realName ?? user.display_name,
      avatar_url: user.avatar ? `https://sleepercdn.com/avatars/thumbs/${user.avatar}` : null,
    })
  }

  // Get draft picks
  const drafts = await getLeagueDrafts(leagueId)
  if (drafts.length === 0) throw new Error('No draft found for this league')
  const draft = drafts[0]  // use the first (main) draft
  const rawPicks = await getDraftPicks(draft.draft_id)
  if (rawPicks.length === 0) throw new Error('Draft picks not available yet')

  const playerData = await getPlayerDataMap()
  const seasonPoints = await getSeasonPointsMap(season, maxWeek)

  const picks: DraftPickInput[] = rawPicks.map(p => {
    const pd = playerData.get(p.player_id)
    return {
      pick_no: p.pick_no,
      player_id: p.player_id,
      roster_id: p.roster_id,
      player_name: pd?.name ?? (`${p.metadata?.first_name ?? ''} ${p.metadata?.last_name ?? ''}`.trim() || p.player_id),
      position: pd?.position ?? p.metadata?.position ?? 'UNK',
    }
  })

  const result = computeDraftGrades(picks, seasonPoints)

  return { result, rosterNames, totalPicks: picks.length, season }
}
