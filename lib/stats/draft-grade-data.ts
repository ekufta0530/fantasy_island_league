// lib/stats/draft-grade-data.ts
import { getLeagueDrafts, getDraftPicks } from '../sleeper'
import { getSeasonSnapshot, RosterInfo } from './season-snapshot'
import { getPlayerDataMap, getPlayerSeasonPointsMap } from './player-data'
import { computeDraftGrades, DraftPickInput, DraftGradeResult } from './draft-grade'
import { CURRENT_LEAGUE_ID } from '../constants'

export interface DraftGradePageData {
  result: DraftGradeResult
  rosterNames: Map<number, RosterInfo>
  totalPicks: number
  season: string
}

export async function getDraftGradeData(leagueId: string = CURRENT_LEAGUE_ID): Promise<DraftGradePageData> {
  const snapshot = await getSeasonSnapshot(leagueId)
  const season = snapshot.league.season
  const maxWeek = snapshot.totalWeeks

  // Get draft picks
  const drafts = await getLeagueDrafts(leagueId)
  if (drafts.length === 0) throw new Error('No draft found for this league')
  const draft = drafts[0]  // use the first (main) draft
  const rawPicks = await getDraftPicks(draft.draft_id)
  if (rawPicks.length === 0) throw new Error('Draft picks not available yet')

  const [playerData, seasonPoints] = await Promise.all([
    getPlayerDataMap(),
    getPlayerSeasonPointsMap(season, maxWeek),
  ])

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

  return { result, rosterNames: snapshot.rosterInfo, totalPicks: picks.length, season }
}
