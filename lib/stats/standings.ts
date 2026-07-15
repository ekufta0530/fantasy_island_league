import { getSeasonSnapshot } from './season-snapshot'
import { computePowerRankings } from './power'
import { computeLuckIndex } from './luck'
import { CURRENT_LEAGUE_ID } from '../constants'

export interface StandingsRow {
  roster_id: number
  username: string
  display_name: string   // team name or username (Liz fallback handled)
  real_name: string
  avatar_url: string | null
  wins: number
  losses: number
  ties: number
  points_for: number
  points_against: number
  power_rank: number
  power_score: number
  luck_index: number
  all_play_wins: number
  all_play_losses: number
}

export async function getStandingsData(leagueId: string = CURRENT_LEAGUE_ID): Promise<StandingsRow[]> {
  const snapshot = await getSeasonSnapshot(leagueId)

  const powerRankings = computePowerRankings(snapshot.weeklyMatchups)
  const luckIndex = computeLuckIndex(snapshot.weeklyMatchups)
  const luckByRoster = new Map(luckIndex.map(l => [l.roster_id, l]))

  return powerRankings.map(pr => {
    const info = snapshot.rosterInfo.get(pr.roster_id)
    const username = info?.username ?? `roster_${pr.roster_id}`
    const luck = luckByRoster.get(pr.roster_id)

    return {
      roster_id: pr.roster_id,
      username,
      display_name: info?.display_name ?? username,
      real_name: info?.real_name ?? username,
      avatar_url: info?.avatar_url ?? null,
      wins: pr.wins,
      losses: pr.losses,
      ties: pr.ties,
      points_for: pr.points_for,
      points_against: pr.points_against,
      power_rank: pr.power_rank,
      power_score: pr.power_score,
      luck_index: luck?.luck_index ?? 0,
      all_play_wins: luck?.all_play_wins ?? 0,
      all_play_losses: luck?.all_play_losses ?? 0,
    }
  })
}
