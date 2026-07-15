// app/api/generate-recap/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { CRON_SECRET, CURRENT_LEAGUE_ID } from '@/lib/constants'
import { getNFLState } from '@/lib/sleeper'
import { getSeasonSnapshot } from '@/lib/stats/season-snapshot'
import { getPlayerNamesMap, getPlayerEligiblePositionsMap, getPlayerWeekPointsMap } from '@/lib/stats/player-data'
import { computeWeeklyAwards } from '@/lib/stats/weekly-awards'
import { computePowerRankings } from '@/lib/stats/power'
import { computeSeasonBenchTax } from '@/lib/stats/bench-tax'
import { buildSwapLabel } from '@/lib/stats/bench-tax-data'
import { computeTradeGrades } from '@/lib/stats/trade-grade'
import { computeWaiverRoi } from '@/lib/stats/waiver-roi'
import { assembleWeekBrief } from '@/lib/recap/week-brief'
import { generateAndStoreRecap, recapExists } from '@/lib/recap/generate'

export const runtime = 'nodejs'
export const maxDuration = 120

export async function GET(req: NextRequest) {
  const secret = CRON_SECRET
  if (secret) {
    const auth = req.headers.get('authorization') ?? ''
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  try {
    const nflState = await getNFLState()
    // Generate recap for the previous completed week
    const recapWeek = nflState.week > 1 ? nflState.week - 1 : 1
    const season = nflState.season

    // Check immutability before doing any work
    if (await recapExists(CURRENT_LEAGUE_ID, season, recapWeek)) {
      return NextResponse.json({ ok: true, message: `Recap for Week ${recapWeek} already exists`, stored: false })
    }

    const snapshot = await getSeasonSnapshot(CURRENT_LEAGUE_ID)
    const rosterIdToName = new Map(
      [...snapshot.rosterInfo.entries()].map(([id, info]) => [id, info.display_name])
    )

    const thisWeekMatchups = snapshot.weeklyMatchups.find(w => w.week === recapWeek)?.matchups ?? []
    const weeksThruRecap = snapshot.weeklyMatchups.filter(w => w.week <= recapWeek)

    const powerRankings = computePowerRankings(weeksThruRecap)
    const prevPowerRankings = recapWeek > 1
      ? computePowerRankings(weeksThruRecap.filter(w => w.week < recapWeek))
      : null

    const awards = computeWeeklyAwards(recapWeek, thisWeekMatchups)

    const [playerNames, playerPositions, playerWeekPoints] = await Promise.all([
      getPlayerNamesMap(),
      getPlayerEligiblePositionsMap(),
      getPlayerWeekPointsMap(season, snapshot.totalWeeks),
    ])

    // Bench tax leader for this specific week
    const rosterPositions = snapshot.league.roster_positions ?? ['QB','RB','RB','WR','WR','TE','FLEX','BN','BN','BN','BN','BN']
    const benchTaxThisWeek = computeSeasonBenchTax(
      [{
        week: recapWeek,
        rosters: thisWeekMatchups.map(m => ({
          roster_id: m.roster_id,
          starters: m.starters,
          players: m.players,
          players_points: m.players_points,
        })),
      }],
      playerPositions,
      rosterPositions
    )
    const worstBenchTax = benchTaxThisWeek.length > 0
      ? benchTaxThisWeek.reduce((worst, s) => s.worst_week.bench_tax > worst.worst_week.bench_tax ? s : worst)
      : null
    const benchTaxLeader = worstBenchTax && worstBenchTax.worst_week.bench_tax > 0
      ? {
          roster_id: worstBenchTax.roster_id,
          bench_tax: worstBenchTax.worst_week.bench_tax,
          swap_label: buildSwapLabel(worstBenchTax.worst_week.missed_starts, playerNames),
        }
      : null

    // Trades this week — real robbery_score via the same grading engine the
    // Trades page uses, instead of a hardcoded 0.
    const tradeTxns = (snapshot.weeklyTransactions.find(w => w.week === recapWeek)?.transactions ?? [])
      .filter(t => t.type === 'trade' && t.status === 'complete')
      .map(t => ({ transaction_id: t.transaction_id, week: recapWeek, adds: t.adds, drops: t.drops, roster_ids: t.roster_ids }))
    const tradeResult = computeTradeGrades(tradeTxns, playerWeekPoints, snapshot.totalWeeks, snapshot.totalWeeks, season)
    const trades = tradeResult.graded_trades.map(gt => ({
      week: gt.week,
      robbery_score: gt.robbery_score,
      participants: gt.participants.map(p => ({
        roster_id: p.roster_id,
        ros_points_received: p.ros_points_received,
        trade_value_delta: p.trade_value_delta,
        players_received: p.players_received.map(pid => playerNames.get(pid) ?? pid),
      })),
    }))

    // Top waiver pickup this week
    const waiverTxns = (snapshot.weeklyTransactions.find(w => w.week === recapWeek)?.transactions ?? [])
      .filter(t => t.type === 'waiver' || t.type === 'free_agent')
      .map(t => ({ transaction_id: t.transaction_id, week: recapWeek, type: t.type, adds: t.adds, drops: t.drops, waiver_budget: t.waiver_budget ?? null }))
    const isFAAB = (snapshot.league.settings.waiver_type ?? 0) === 2
    const waiverResult = computeWaiverRoi(waiverTxns, playerWeekPoints, snapshot.totalWeeks, snapshot.totalWeeks, isFAAB, playerNames)
    const bestAdd = [...waiverResult.adds].sort((a, b) => b.points_gained - a.points_gained)[0] ?? null
    const topWaiver = bestAdd
      ? { roster_id: bestAdd.roster_id, player_name: bestAdd.player_name, points_gained: bestAdd.points_gained }
      : null

    // Build matchup display for brief
    const byMatchupId = new Map<number, typeof thisWeekMatchups>()
    for (const m of thisWeekMatchups) {
      if (!byMatchupId.has(m.matchup_id)) byMatchupId.set(m.matchup_id, [])
      byMatchupId.get(m.matchup_id)!.push(m)
    }
    const matchupDisplays = [...byMatchupId.values()]
      .filter(pair => pair.length === 2)
      .map(([a, b]) => ({
        matchup_id: a.matchup_id,
        home: { display_name: rosterIdToName.get(a.roster_id) ?? `Team ${a.roster_id}`, points: a.points },
        away: { display_name: rosterIdToName.get(b.roster_id) ?? `Team ${b.roster_id}`, points: b.points },
      }))

    // Standings from power rankings
    const standingsInput = powerRankings.map(pr => {
      const display_name = rosterIdToName.get(pr.roster_id) ?? `Team ${pr.roster_id}`
      return { display_name, wins: pr.wins, losses: pr.losses, power_rank: pr.power_rank, points_for: pr.points_for }
    })

    const prevStandingsInput = prevPowerRankings?.map(pr => ({
      display_name: rosterIdToName.get(pr.roster_id) ?? `Team ${pr.roster_id}`,
      power_rank: pr.power_rank,
    })) ?? null

    const brief = assembleWeekBrief({
      season,
      week: recapWeek,
      matchups: matchupDisplays,
      standings: standingsInput,
      prevStandings: prevStandingsInput,
      awards: awards ? {
        highest_scorer: awards.highest_scorer,
        lowest_scorer: awards.lowest_scorer,
        biggest_blowout: awards.biggest_blowout ? { winner_roster_id: awards.biggest_blowout.winner_roster_id, loser_roster_id: awards.biggest_blowout.loser_roster_id, margin: awards.biggest_blowout.margin } : null,
        closest_game: awards.closest_game ? { winner_roster_id: awards.closest_game.winner_roster_id, loser_roster_id: awards.closest_game.loser_roster_id, margin: awards.closest_game.margin } : null,
        shouldve_won: awards.shouldve_won,
        shouldve_lost: awards.shouldve_lost,
      } : null,
      rosterIdToName,
      benchTaxLeader,
      trades,
      topWaiver,
    })

    const result = await generateAndStoreRecap(CURRENT_LEAGUE_ID, brief)
    return NextResponse.json({ ok: true, week: recapWeek, stored: result.stored, chars: result.recap_text.length })
  } catch (err) {
    console.error('[generate-recap]', err)
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}
