// lib/stats/rivalries-data.ts
import { getLeagueHistory } from '../sleeper'
import { getSeasonSnapshot } from './season-snapshot'
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
  // Walk full league history chain, then fetch every season's snapshot in
  // parallel — each season is independent, no reason to do this one at a time.
  const leagueIds = await getLeagueHistory(CURRENT_LEAGUE_ID)
  const snapshots = await Promise.all(leagueIds.map(id => getSeasonSnapshot(id)))

  let earliest_season = snapshots[0]?.league.season ?? '2025'
  let latest_season = earliest_season

  // Accumulate: username → username → RivalryRecord
  const records = new Map<string, Map<string, RivalryRecord>>()
  // username → display info (use latest season's data)
  const displayInfo = new Map<string, { display_name: string; real_name: string; avatar_url: string | null }>()

  for (const snapshot of snapshots) {
    const season = snapshot.league.season
    if (season < earliest_season) earliest_season = season
    if (season > latest_season) latest_season = season

    for (const info of snapshot.rosterInfo.values()) {
      // Seed display info (overwrite with latest season data — snapshots are
      // processed oldest-first since getLeagueHistory returns them that way)
      displayInfo.set(info.username, {
        display_name: info.display_name,
        real_name: info.real_name,
        avatar_url: info.avatar_url,
      })
    }

    for (const { matchups } of snapshot.weeklyMatchups) {
      const byMatchupId = new Map<number, typeof matchups>()
      for (const m of matchups) {
        if (!byMatchupId.has(m.matchup_id)) byMatchupId.set(m.matchup_id, [])
        byMatchupId.get(m.matchup_id)!.push(m)
      }

      for (const [, pair] of byMatchupId) {
        if (pair.length !== 2) continue
        const [a, b] = pair
        const uA = snapshot.rosterInfo.get(a.roster_id)?.username
        const uB = snapshot.rosterInfo.get(b.roster_id)?.username
        if (!uA || !uB) continue

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
