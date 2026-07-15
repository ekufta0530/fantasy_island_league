// lib/stats/waiver-roi-data.ts
import { getSeasonSnapshot, RosterInfo } from './season-snapshot'
import { getPlayerNamesMap, getPlayerWeekPointsMap } from './player-data'
import { computeWaiverRoi, WaiverRoiResult } from './waiver-roi'
import { CURRENT_LEAGUE_ID } from '../constants'

export interface WaiverRoiPageData {
  result: WaiverRoiResult
  rosterNames: Map<number, RosterInfo>
  isFAAB: boolean
}

export async function getWaiverRoiData(leagueId: string = CURRENT_LEAGUE_ID): Promise<WaiverRoiPageData> {
  const snapshot = await getSeasonSnapshot(leagueId)
  const season = snapshot.league.season
  const totalWeeks = snapshot.totalWeeks
  const isFAAB = (snapshot.league.settings.waiver_type ?? 0) === 2

  const allTxns = snapshot.weeklyTransactions.flatMap(({ week, transactions }) =>
    transactions.map(t => ({
      transaction_id: t.transaction_id,
      week,
      type: t.type,
      adds: t.adds,
      drops: t.drops,
      waiver_budget: t.waiver_budget ?? null,
    }))
  )

  const [playerWeekPoints, playerNames] = await Promise.all([
    getPlayerWeekPointsMap(season, totalWeeks),
    getPlayerNamesMap(),
  ])

  const result = computeWaiverRoi(allTxns, playerWeekPoints, totalWeeks, totalWeeks, isFAAB, playerNames)
  return { result, rosterNames: snapshot.rosterInfo, isFAAB }
}
