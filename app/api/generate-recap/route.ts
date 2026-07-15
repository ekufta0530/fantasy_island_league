// app/api/generate-recap/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { CRON_SECRET, CURRENT_LEAGUE_ID } from '@/lib/constants'
import { getNFLState, getLeague, getMatchups, getLeagueUsers, getRosters, getTransactions } from '@/lib/sleeper'
import { getManagerByUsername } from '@/lib/managers'
import { computeWeeklyAwards } from '@/lib/stats/weekly-awards'
import { computePowerRankings } from '@/lib/stats/power'
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

    const [league, users, rosters] = await Promise.all([
      getLeague(CURRENT_LEAGUE_ID),
      getLeagueUsers(CURRENT_LEAGUE_ID),
      getRosters(CURRENT_LEAGUE_ID),
    ])

    // Build rosterIdToName
    const rosterIdToName = new Map<number, string>()
    for (const roster of rosters) {
      if (!roster.owner_id) continue
      const user = users.find(u => u.user_id === roster.owner_id)
      if (!user) continue
      const manager = getManagerByUsername(user.username)
      const teamName = user.metadata?.team_name || manager?.teamName || null
      rosterIdToName.set(roster.roster_id, teamName ?? user.username)
    }

    // Fetch this week's and last week's matchups
    const [thisWeekMatchups, lastWeekMatchups] = await Promise.all([
      getMatchups(CURRENT_LEAGUE_ID, recapWeek),
      recapWeek > 1 ? getMatchups(CURRENT_LEAGUE_ID, recapWeek - 1) : Promise.resolve([]),
    ])

    // Fetch all weeks for standings/power rankings
    const allWeeks = []
    for (let w = 1; w <= recapWeek; w++) {
      try {
        const m = await getMatchups(CURRENT_LEAGUE_ID, w)
        if (m.length) allWeeks.push({ week: w, matchups: m })
      } catch { break }
    }

    const powerRankings = computePowerRankings(allWeeks)
    const prevPowerRankings = recapWeek > 1
      ? computePowerRankings(allWeeks.filter(w => w.week < recapWeek))
      : null

    // This week's transactions
    const transactions = await getTransactions(CURRENT_LEAGUE_ID, recapWeek).catch(() => [])
    const trades = transactions
      .filter(t => t.type === 'trade' && t.status === 'complete')
      .map(t => ({
        week: recapWeek,
        robbery_score: 0,
        participants: Object.entries(t.adds ?? {}).reduce((acc, [pid, rid]) => {
          let p = acc.find(a => a.roster_id === rid)
          if (!p) { p = { roster_id: rid, ros_points_received: 0, trade_value_delta: 0, players_received: [] }; acc.push(p) }
          p.players_received.push(pid)
          return acc
        }, [] as Array<{ roster_id: number; ros_points_received: number; trade_value_delta: number; players_received: string[] }>),
      }))

    const awards = computeWeeklyAwards(recapWeek, thisWeekMatchups)

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
      benchTaxLeader: null,  // bench tax not wired to recap generation yet
      trades,
      topWaiver: null,
    })

    const result = await generateAndStoreRecap(CURRENT_LEAGUE_ID, brief)
    return NextResponse.json({ ok: true, week: recapWeek, stored: result.stored, chars: result.recap_text.length })
  } catch (err) {
    console.error('[generate-recap]', err)
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}
