// lib/stats/waiver-roi-data.ts
import { getLeague, getLeagueUsers, getRosters, getNFLState, getTransactions } from '../sleeper'
import { computeWaiverRoi, WaiverRoiResult } from './waiver-roi'
import { getManagerByUsername } from '../managers'
import { CURRENT_LEAGUE_ID } from '../constants'
import { supabaseAdmin } from '../db/supabase'

export interface WaiverRoiPageData {
  result: WaiverRoiResult
  rosterNames: Map<number, { display_name: string; real_name: string; avatar_url: string | null }>
  isFAAB: boolean
}

async function buildPlayerWeekPointsMap(season: string, maxWeek: number): Promise<Map<string, Map<number, number>>> {
  const result = new Map<string, Map<number, number>>()
  try {
    const { data } = await supabaseAdmin
      .from('raw_matchups')
      .select('week, data')
      .eq('season', season)
      .lte('week', maxWeek)
    if (data) {
      for (const row of data) {
        const week = row.week as number
        const d = row.data as { players_points?: Record<string, number> }
        for (const [pid, pts] of Object.entries(d.players_points ?? {})) {
          if (!result.has(pid)) result.set(pid, new Map())
          result.get(pid)!.set(week, pts)
        }
      }
    }
  } catch { /* return empty if DB unavailable */ }
  return result
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

export async function getWaiverRoiData(leagueId: string = CURRENT_LEAGUE_ID): Promise<WaiverRoiPageData> {
  const [nflState, league, users, rosters] = await Promise.all([
    getNFLState(), getLeague(leagueId), getLeagueUsers(leagueId), getRosters(leagueId)
  ])
  const season = league.season
  const totalWeeks = league.settings.playoff_week_start ? league.settings.playoff_week_start - 1 : 17
  // For the live current season, don't walk past real-world "now". For a
  // past/completed season, nflState.week is irrelevant — walk the whole thing.
  const currentWeek = leagueId === CURRENT_LEAGUE_ID ? nflState.week : totalWeeks
  const isFAAB = (league.settings.waiver_type ?? 0) === 2

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

  const allTxns: Array<{
    transaction_id: string
    week: number
    type: string
    adds: Record<string, number> | null
    drops: Record<string, number> | null
    waiver_budget: Array<{ sender: number; receiver: number; amount: number }> | null
  }> = []
  for (let w = 1; w <= currentWeek; w++) {
    try {
      const txns = await getTransactions(leagueId, w)
      allTxns.push(...txns.map(t => ({
        transaction_id: t.transaction_id,
        week: w,
        type: t.type,
        adds: t.adds,
        drops: t.drops,
        waiver_budget: t.waiver_budget ?? null,
      })))
    } catch { break }
  }

  const [playerWeekPoints, playerNames] = await Promise.all([
    buildPlayerWeekPointsMap(season, currentWeek),
    getPlayerNamesMap(),
  ])

  const result = computeWaiverRoi(allTxns, playerWeekPoints, currentWeek, totalWeeks, isFAAB, playerNames)
  return { result, rosterNames, isFAAB }
}
