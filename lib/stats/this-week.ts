// lib/stats/this-week.ts
import { getNFLState, getLeague, getMatchups, getLeagueUsers, getRosters, getTransactions } from '../sleeper'
import { computeWeeklyAwards, WeeklyAwards } from './weekly-awards'
import { getManagerByUsername } from '../managers'
import { CURRENT_LEAGUE_ID } from '../constants'

export interface MatchupDisplay {
  matchup_id: number
  home: { roster_id: number; display_name: string; real_name: string; avatar_url: string | null; points: number }
  away: { roster_id: number; display_name: string; real_name: string; avatar_url: string | null; points: number }
  is_complete: boolean
}

export interface ThisWeekData {
  week: number
  season: string
  matchups: MatchupDisplay[]
  awards: WeeklyAwards | null
  /** Notable transactions this week (trades + significant waivers) */
  transactions: {
    type: string
    roster_ids: number[]
    display_names: string[]
    summary: string  // human-readable one-liner
  }[]
}

export async function getThisWeekData(): Promise<ThisWeekData> {
  const [nflState, league, users, rosters] = await Promise.all([
    getNFLState(),
    getLeague(CURRENT_LEAGUE_ID),
    getLeagueUsers(CURRENT_LEAGUE_ID),
    getRosters(CURRENT_LEAGUE_ID),
  ])

  // league is fetched to confirm league context; suppress unused warning
  void league

  const week = nflState.week
  const season = nflState.season

  // Build roster_id → display info map
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

  // Fetch this week's matchups
  let rawMatchups: Awaited<ReturnType<typeof getMatchups>> = []
  try {
    rawMatchups = await getMatchups(CURRENT_LEAGUE_ID, week)
  } catch {
    // pre-season or no data yet
  }

  // Pair matchups
  const byMatchupId = new Map<number, typeof rawMatchups>()
  for (const m of rawMatchups) {
    if (!byMatchupId.has(m.matchup_id)) byMatchupId.set(m.matchup_id, [])
    byMatchupId.get(m.matchup_id)!.push(m)
  }

  const matchups: MatchupDisplay[] = []
  for (const [matchup_id, pair] of byMatchupId) {
    if (pair.length !== 2) continue
    const [a, b] = pair
    const aInfo = rosterMap.get(a.roster_id) ?? { display_name: `Team ${a.roster_id}`, real_name: `Team ${a.roster_id}`, avatar_url: null }
    const bInfo = rosterMap.get(b.roster_id) ?? { display_name: `Team ${b.roster_id}`, real_name: `Team ${b.roster_id}`, avatar_url: null }
    matchups.push({
      matchup_id,
      home: { roster_id: a.roster_id, ...aInfo, points: a.points },
      away: { roster_id: b.roster_id, ...bInfo, points: b.points },
      is_complete: a.points > 0 || b.points > 0,
    })
  }

  // Awards (only if games have points)
  const awards = rawMatchups.some(m => m.points > 0)
    ? computeWeeklyAwards(week, rawMatchups)
    : null

  // Transactions for this week
  let rawTxns: Awaited<ReturnType<typeof getTransactions>> = []
  try {
    rawTxns = await getTransactions(CURRENT_LEAGUE_ID, week)
  } catch {
    // no transactions yet
  }

  const transactions = rawTxns
    .filter(t => t.type === 'trade' || t.type === 'waiver' || t.type === 'free_agent')
    .slice(0, 10)  // cap at 10 notable txns
    .map(t => {
      const names = (t.roster_ids || []).map((id: number) => {
        const info = rosterMap.get(id)
        return info?.display_name ?? `Team ${id}`
      })
      const summary = t.type === 'trade'
        ? `🔄 Trade between ${names.join(' & ')}`
        : `📋 ${names[0] ?? 'Someone'} made a waiver/FA move`
      return { type: t.type, roster_ids: t.roster_ids ?? [], display_names: names, summary }
    })

  return { week, season, matchups, awards, transactions }
}
