// lib/stats/rivalries-data.ts
import { getLeagueHistory, getLeague, getMatchups, getLeagueUsers, getRosters } from '../sleeper'
import { getManagerByUsername } from '../managers'
import { CURRENT_LEAGUE_ID } from '../constants'

export interface RivalryRecord {
  wins: number
  losses: number
  ties: number
  points_for: number
  points_against: number
}

export interface ManagerRivalries {
  username: string
  display_name: string
  real_name: string
  avatar_url: string | null
  /** Map of opponent_username → all-time record */
  vs: Map<string, RivalryRecord>
}

export interface RivalriesData {
  managers: ManagerRivalries[]
  /** All unique manager usernames in consistent order (for grid rendering) */
  managerOrder: string[]
  /** Earliest season available on Sleeper (for boundary note) */
  earliest_season: string
  latest_season: string
}

export async function getRivalriesData(): Promise<RivalriesData> {
  // Walk full league history chain
  const leagueIds = await getLeagueHistory(CURRENT_LEAGUE_ID)

  let earliest_season = '2025'
  let latest_season = '2025'

  // Accumulate: username → username → RivalryRecord
  const records = new Map<string, Map<string, RivalryRecord>>()
  // username → display info (use latest season's data)
  const displayInfo = new Map<string, { display_name: string; real_name: string; avatar_url: string | null }>()

  for (const leagueId of leagueIds) {
    const [league, users, rosters] = await Promise.all([
      getLeague(leagueId),
      getLeagueUsers(leagueId),
      getRosters(leagueId),
    ])

    const season = league.season
    if (season < earliest_season) earliest_season = season
    if (season > latest_season) latest_season = season

    // Build roster_id → username + display for this league
    const rosterToUsername = new Map<number, string>()
    const rosterToDisplay = new Map<number, string>()
    const rosterToAvatar = new Map<number, string | null>()

    for (const roster of rosters) {
      if (!roster.owner_id) continue
      const user = users.find(u => u.user_id === roster.owner_id)
      if (!user) continue
      const mgr = getManagerByUsername(user.username)
      const teamName = user.metadata?.team_name || mgr?.teamName || null
      rosterToUsername.set(roster.roster_id, user.username)
      rosterToDisplay.set(roster.roster_id, teamName ?? user.username)
      rosterToAvatar.set(roster.roster_id, user.avatar ? `https://sleepercdn.com/avatars/thumbs/${user.avatar}` : null)

      // Seed display info (overwrite with latest season data)
      displayInfo.set(user.username, {
        display_name: teamName ?? user.username,
        real_name: mgr?.realName ?? user.username,
        avatar_url: user.avatar ? `https://sleepercdn.com/avatars/thumbs/${user.avatar}` : null,
      })
    }

    // Fetch all regular season weeks
    const maxWeek = league.settings.playoff_week_start ? league.settings.playoff_week_start - 1 : 17
    for (let w = 1; w <= maxWeek; w++) {
      let matchups
      try {
        matchups = await getMatchups(leagueId, w)
        if (!matchups.length) break
      } catch { break }

      // Group by matchup_id
      const byMatchupId = new Map<number, typeof matchups>()
      for (const m of matchups) {
        if (!byMatchupId.has(m.matchup_id)) byMatchupId.set(m.matchup_id, [])
        byMatchupId.get(m.matchup_id)!.push(m)
      }

      for (const [, pair] of byMatchupId) {
        if (pair.length !== 2) continue
        const [a, b] = pair
        const uA = rosterToUsername.get(a.roster_id)
        const uB = rosterToUsername.get(b.roster_id)
        if (!uA || !uB) continue

        // Ensure both have records maps
        if (!records.has(uA)) records.set(uA, new Map())
        if (!records.has(uB)) records.set(uB, new Map())

        const recA = records.get(uA)!.get(uB) ?? { wins: 0, losses: 0, ties: 0, points_for: 0, points_against: 0 }
        const recB = records.get(uB)!.get(uA) ?? { wins: 0, losses: 0, ties: 0, points_for: 0, points_against: 0 }

        recA.points_for += a.points
        recA.points_against += b.points
        recB.points_for += b.points
        recB.points_against += a.points

        if (a.points > b.points) { recA.wins++; recB.losses++ }
        else if (b.points > a.points) { recB.wins++; recA.losses++ }
        else { recA.ties++; recB.ties++ }

        records.get(uA)!.set(uB, recA)
        records.get(uB)!.set(uA, recB)
      }
    }
  }

  // Build output
  const managerOrder = [...records.keys()].sort()
  const managers: ManagerRivalries[] = managerOrder.map(username => ({
    username,
    ...( displayInfo.get(username) ?? { display_name: username, real_name: username, avatar_url: null }),
    vs: records.get(username) ?? new Map(),
  }))

  return { managers, managerOrder, earliest_season, latest_season }
}
