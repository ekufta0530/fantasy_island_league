// lib/season.ts
import { getLeague } from './sleeper'
import { CURRENT_LEAGUE_ID } from './constants'

export type SeasonMode = 'current' | 'previous'

export interface SeasonOption {
  mode: SeasonMode
  leagueId: string
  year: string
}

/**
 * Returns the available season toggle options: always "current", plus
 * "previous" if Sleeper's league chain has one (previous_league_id).
 * On any fetch failure, degrades to just the current season so the toggle
 * silently disappears rather than breaking the page.
 */
export async function getSeasonOptions(): Promise<SeasonOption[]> {
  try {
    const current = await getLeague(CURRENT_LEAGUE_ID)
    const options: SeasonOption[] = [{ mode: 'current', leagueId: CURRENT_LEAGUE_ID, year: current.season }]
    if (current.previous_league_id) {
      const previous = await getLeague(current.previous_league_id)
      options.push({ mode: 'previous', leagueId: current.previous_league_id, year: previous.season })
    }
    return options
  } catch {
    return [{ mode: 'current', leagueId: CURRENT_LEAGUE_ID, year: '' }]
  }
}

/** Resolve a `?season=` query value to the league_id + year it maps to. */
export async function resolveSeason(seasonParam: string | undefined): Promise<{ leagueId: string; year: string; mode: SeasonMode }> {
  const options = await getSeasonOptions()
  const match = options.find(o => o.mode === seasonParam) ?? options[0]
  return match
}
