/**
 * lib/managers.ts
 *
 * Single source of truth for all 6 manager personas.
 * Edit this file each season to update nicknames, team names, and persona notes.
 * This config is injected into the AI recap prompt (§6) and used on team pages.
 */

export interface ManagerConfig {
  /** Sleeper username — used to match against /league/{id}/users */
  username: string
  /** Real first name */
  realName: string
  /**
   * Team name for this season. Set to null if the manager has no custom team
   * name in Sleeper — the UI will fall back to rendering by username/display_name.
   */
  teamName: string | null
  /** NFL team they root for — used in AI recap for player-affiliation jokes */
  nflTeam: string
  /** Persona notes for the AI recap system prompt — keep loosely phrased so they
   *  don't become stale mid-season. Update each year as jokes evolve. */
  personaNotes: string
  /** Optional: short nickname used inline in recap prose */
  nickname?: string
}

export const MANAGERS: ManagerConfig[] = [
  {
    username: 'TheIrishRover',
    realName: 'Victor',
    teamName: '6 Million $ Man',
    nflTeam: 'Broncos',
    personaNotes:
      'Broncos fan who moved to Ireland a few years back. Whiskey guy. Time zone makes his waiver pickups unpredictable — occasionally inspired, occasionally disastrous.',
    nickname: 'Victor',
  },
  {
    username: 'kirkendc',
    realName: 'Chris',
    teamName: 'Rookie Time',
    nflTeam: 'Broncos',
    personaNotes:
      'Broncos fan, runs his own catering business, oldest manager in the league. "Wisdom of the elder" jokes are fair game. Drafts like he\'s been doing this since before the rest of us were born — because he has.',
    nickname: 'Chris',
  },
  {
    username: 'lozintheredzone',
    realName: 'Liz',
    // Liz has no custom team name in Sleeper — render by display_name/username
    teamName: null,
    nflTeam: 'Unknown',
    personaNotes:
      "Mike's girlfriend. Running joke: her lineup decisions suspiciously mirror Mike's advice, yet somehow she manages to surprise everyone when it counts. The league remains unsure whether to admire or fear this.",
    nickname: 'Liz',
  },
  {
    username: 'MHodnett',
    realName: 'Mike',
    teamName: 'Bijan al Gaib',
    nflTeam: 'Broncos',
    personaNotes:
      'Broncos fan, former commissioner pre-2024, whiskey and gambling guy. Has opinions about everyone\'s roster. Liz\'s lineup choices may or may not be his fault.',
    nickname: 'Mike',
  },
  {
    username: 'keinholz',
    realName: 'Kurt',
    teamName: 'Love thy Naber',
    nflTeam: 'Giants',
    personaNotes:
      'Giants fan. Wins a lot — the rest of the league actively roots against him and metagames to block his moves. Confirm each season whether the winning streak is still deserved before leaning too hard on this; do not assume he\'s dominating if the data says otherwise.',
    nickname: 'Kurt',
  },
  {
    username: 'kufta',
    realName: 'Eric',
    teamName: 'Picks Of Destiny',
    nflTeam: 'Lions',
    personaNotes:
      'Lions fan. Won the league last season for the first time ever after roughly 8-9 years of near-misses. Site owner. Now has a target on his back and absolutely no excuse for a bad season.',
    nickname: 'Eric',
  },
]

/**
 * Look up a manager by their Sleeper username. Returns undefined if not found.
 * Sleeper returns `username: null` for co-owner accounts that never set one —
 * treat that as "no match" rather than throwing.
 */
export function getManagerByUsername(username: string | null | undefined): ManagerConfig | undefined {
  if (!username) return undefined
  return MANAGERS.find(
    (m) => m.username.toLowerCase() === username.toLowerCase()
  )
}

/**
 * Returns the display name for a manager — team name if set, otherwise username.
 * Use this everywhere in the UI so Liz's null team name is handled consistently.
 */
export function getDisplayName(manager: ManagerConfig): string {
  return manager.teamName ?? manager.username
}
