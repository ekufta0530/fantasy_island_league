// lib/stats/hall-of-fame-data.ts
import { getBenchTaxData, BenchTaxData } from './bench-tax-data'
import { getDraftGradeData, DraftGradePageData } from './draft-grade-data'
import { getTradePageData, TradePageData } from './trade-grade-data'
import { getWaiverRoiData, WaiverRoiPageData } from './waiver-roi-data'
import { getStandingsData, StandingsRow } from './standings'

export interface HallOfFameData {
  benchTax: BenchTaxData | null
  draftGrade: DraftGradePageData | null
  tradeGrade: TradePageData | null
  waiverRoi: WaiverRoiPageData | null
  standings: StandingsRow[] | null
}

export async function getHallOfFameData(): Promise<HallOfFameData> {
  const [benchTax, draftGrade, tradeGrade, waiverRoi, standings] = await Promise.allSettled([
    getBenchTaxData(),
    getDraftGradeData(),
    getTradePageData(),
    getWaiverRoiData(),
    getStandingsData(),
  ])

  return {
    benchTax:   benchTax.status   === 'fulfilled' ? benchTax.value   : null,
    draftGrade: draftGrade.status === 'fulfilled' ? draftGrade.value : null,
    tradeGrade: tradeGrade.status === 'fulfilled' ? tradeGrade.value : null,
    waiverRoi:  waiverRoi.status  === 'fulfilled' ? waiverRoi.value  : null,
    standings:  standings.status  === 'fulfilled' ? standings.value  : null,
  }
}
