// lib/stats/season-snapshot.ts
import { cache } from 'react'
import {
  getLeague,
  getLeagueUsers,
  getRosters,
  getMatchups,
  getTransactions,
  type SleeperLeague,
  type SleeperRoster,
  type SleeperUser,
  type SleeperMatchup,
  type SleeperTransaction,
} from '../sleeper'
import { getManagerByUsername } from '../managers'

export interface RosterInfo {
  roster_id: number
  /** Real Sleeper username, or a stable `uid_<user_id>` fallback for co-owner accounts with none */
  username: string
  display_name: string
  real_name: string
  avatar_url: string | null
}

export interface SeasonSnapshot {
  league: SleeperLeague
  users: SleeperUser[]
  rosters: SleeperRoster[]
  rosterInfo: Map<number, RosterInfo>
  /** Regular season length (playoff_week_start - 1) */
  totalWeeks: number
  /** Only weeks that actually have matchup data, in ascending order */
  weeklyMatchups: Array<{ week: number; matchups: SleeperMatchup[] }>
  /** Only weeks that actually have transaction data, in ascending order */
  weeklyTransactions: Array<{ week: number; transactions: SleeperTransaction[] }>
}

/**
 * One shared fetch of everything needed to compute any season stat.
 * Deduped per-request via React's `cache()` — every stats module that needs
 * this league's data (standings, bench tax, draft grade, trades, waiver ROI)
 * shares this single fetch instead of each independently re-walking the
 * whole season, which is what made pages like Hall of Fame trigger 60+
 * redundant sequential Sleeper API calls.
 *
 * Walks every regular-season week in parallel rather than guessing "how far
 * has this season progressed" from real-time NFL state — that heuristic
 * breaks the moment a season ends and CURRENT_LEAGUE_ID hasn't been bumped
 * to the new one yet. Sleeper returns `[]` for weeks that haven't happened,
 * so there's nothing to guess: just ask for all of them.
 */
export const getSeasonSnapshot = cache(async (leagueId: string): Promise<SeasonSnapshot> => {
  const [league, users, rosters] = await Promise.all([
    getLeague(leagueId),
    getLeagueUsers(leagueId),
    getRosters(leagueId),
  ])

  const totalWeeks = league.settings.playoff_week_start ? league.settings.playoff_week_start - 1 : 17
  const weekNumbers = Array.from({ length: Math.max(totalWeeks, 0) }, (_, i) => i + 1)

  const [matchupsByWeek, transactionsByWeek] = await Promise.all([
    Promise.all(weekNumbers.map(w => getMatchups(leagueId, w).catch(() => []))),
    Promise.all(weekNumbers.map(w => getTransactions(leagueId, w).catch(() => []))),
  ])

  const weeklyMatchups = weekNumbers
    .map((week, i) => ({ week, matchups: matchupsByWeek[i] }))
    .filter(w => w.matchups.length > 0)

  const weeklyTransactions = weekNumbers
    .map((week, i) => ({ week, transactions: transactionsByWeek[i] }))
    .filter(w => w.transactions.length > 0)

  const rosterInfo = new Map<number, RosterInfo>()
  for (const roster of rosters) {
    if (!roster.owner_id) continue
    const user = users.find(u => u.user_id === roster.owner_id)
    if (!user) continue
    // Sleeper's league-users endpoint no longer returns `username` at all
    // (always null) — `display_name` reliably holds what used to be there,
    // and happens to match every configured MANAGERS username in practice.
    // Try username first in case a future API brings it back.
    const identity = user.username || user.display_name || `uid_${user.user_id}`
    const manager = getManagerByUsername(user.username) ?? getManagerByUsername(user.display_name)
    const teamName = user.metadata?.team_name || manager?.teamName || null
    rosterInfo.set(roster.roster_id, {
      roster_id: roster.roster_id,
      username: identity,
      display_name: teamName ?? user.display_name,
      real_name: manager?.realName ?? user.display_name,
      avatar_url: user.avatar ? `https://sleepercdn.com/avatars/thumbs/${user.avatar}` : null,
    })
  }

  return { league, users, rosters, rosterInfo, totalWeeks, weeklyMatchups, weeklyTransactions }
})
