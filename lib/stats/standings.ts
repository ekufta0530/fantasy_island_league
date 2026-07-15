import { getLeague, getMatchups, getLeagueUsers, getRosters, getNFLState } from '../sleeper'
import { computePowerRankings, WeekMatchups } from './power'
import { computeLuckIndex } from './luck'
import { getManagerByUsername } from '../managers'
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

export async function getStandingsData(): Promise<StandingsRow[]> {
  const [nflState, league, rosters, users] = await Promise.all([
    getNFLState(),
    getLeague(CURRENT_LEAGUE_ID),
    getRosters(CURRENT_LEAGUE_ID),
    getLeagueUsers(CURRENT_LEAGUE_ID),
  ])

  const currentWeek = Math.min(nflState.week, league.settings.playoff_week_start - 1)

  // Fetch all completed weeks' matchups
  const weeklyMatchups: WeekMatchups[] = []
  for (let w = 1; w <= currentWeek; w++) {
    try {
      const matchups = await getMatchups(CURRENT_LEAGUE_ID, w)
      if (matchups.length > 0) {
        weeklyMatchups.push({ week: w, matchups })
      }
    } catch {
      // week not available yet — stop
      break
    }
  }

  const powerRankings = computePowerRankings(weeklyMatchups)
  const luckIndex = computeLuckIndex(weeklyMatchups)

  // Build roster_id → username map
  const rosterToUser = new Map<number, {
    username: string | null
    display_name: string
    avatar: string | null
    team_name: string | null
  }>()
  for (const roster of rosters) {
    if (!roster.owner_id) continue
    const user = users.find(u => u.user_id === roster.owner_id)
    if (user) {
      rosterToUser.set(roster.roster_id, {
        username: user.username,
        display_name: user.display_name,
        avatar: user.avatar ? `https://sleepercdn.com/avatars/thumbs/${user.avatar}` : null,
        team_name: user.metadata?.team_name ?? null,
      })
    }
  }

  // Merge power rankings with luck index
  const luckByRoster = new Map(luckIndex.map(l => [l.roster_id, l]))

  return powerRankings.map(pr => {
    const userInfo = rosterToUser.get(pr.roster_id)
    const username = userInfo?.username ?? `roster_${pr.roster_id}`
    const manager = getManagerByUsername(username)

    // Display name priority: Sleeper team name → manager config team name → username
    const teamName = userInfo?.team_name || manager?.teamName || null
    const displayName = teamName ?? username  // handles null team name

    const luck = luckByRoster.get(pr.roster_id)

    return {
      roster_id: pr.roster_id,
      username,
      display_name: displayName,
      real_name: manager?.realName ?? username,
      avatar_url: userInfo?.avatar ?? null,
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
