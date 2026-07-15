// lib/stats/trade-grade-data.ts
import { getSeasonSnapshot, RosterInfo } from './season-snapshot'
import { getPlayerNamesMap, getPlayerWeekPointsMap } from './player-data'
import { computeTradeGrades, TradeGradeResult } from './trade-grade'
import { CURRENT_LEAGUE_ID } from '../constants'

export interface TradePageData {
  result: TradeGradeResult
  rosterNames: Map<number, RosterInfo>
  playerNames: Map<string, string>
  currentWeek: number
  season: string
}

export async function getTradePageData(leagueId: string = CURRENT_LEAGUE_ID): Promise<TradePageData> {
  const snapshot = await getSeasonSnapshot(leagueId)
  const season = snapshot.league.season
  const totalWeeks = snapshot.totalWeeks

  // Every trade transaction across the season — no more guessing "how far
  // along is this season" from real-time NFL state. Sleeper has already
  // told us exactly which weeks have data via the shared snapshot.
  const trades = snapshot.weeklyTransactions.flatMap(({ week, transactions }) =>
    transactions
      .filter(t => t.type === 'trade' && t.status === 'complete')
      .map(t => ({
        transaction_id: t.transaction_id,
        week,
        adds: t.adds,
        drops: t.drops,
        roster_ids: t.roster_ids,
      }))
  )

  const [playerRosPoints, playerNames] = await Promise.all([
    getPlayerWeekPointsMap(season, totalWeeks),
    getPlayerNamesMap(),
  ])

  const result = computeTradeGrades(trades, playerRosPoints, totalWeeks, totalWeeks, season)

  return { result, rosterNames: snapshot.rosterInfo, playerNames, currentWeek: totalWeeks, season }
}
