import { NextRequest, NextResponse } from 'next/server'
import { CRON_SECRET, CURRENT_LEAGUE_ID } from '@/lib/constants'
import {
  getNFLState,
  getLeagueHistory,
  getLeague,
  getMatchups,
  getTransactions,
  getLeagueDrafts,
  getDraftPicks,
  getAllPlayers,
} from '@/lib/sleeper'
import {
  upsertMatchups,
  upsertTransactions,
  upsertDraftPicks,
  upsertNFLPlayers,
  isNFLPlayersCacheFresh,
} from '@/lib/db/cache'

export const runtime = 'nodejs'
export const maxDuration = 300 // 5 min — long running cron

export async function GET(req: NextRequest) {
  // Auth check — skip if CRON_SECRET is empty (local dev)
  const secret = CRON_SECRET
  if (secret) {
    const auth = req.headers.get('authorization') ?? ''
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  try {
    const nflState = await getNFLState()
    const { season, week: currentWeek } = nflState

    // Refresh /players/nfl once/day
    if (!(await isNFLPlayersCacheFresh())) {
      console.log('[refresh] Fetching /players/nfl...')
      const players = await getAllPlayers()
      await upsertNFLPlayers(players)
      console.log('[refresh] /players/nfl cached.')
    }

    // Walk full league history chain
    const leagueIds = await getLeagueHistory(CURRENT_LEAGUE_ID)
    console.log(`[refresh] Processing ${leagueIds.length} league seasons`)

    for (const leagueId of leagueIds) {
      const league = await getLeague(leagueId)
      const leagueSeason = league.season
      const isCurrentSeason = leagueId === CURRENT_LEAGUE_ID

      // For historical seasons, pull all 18 regular season weeks; for current, pull up to currentWeek
      const maxWeek = isCurrentSeason ? currentWeek : 18

      for (let w = 1; w <= maxWeek; w++) {
        try {
          const [matchups, transactions] = await Promise.all([
            getMatchups(leagueId, w),
            getTransactions(leagueId, w),
          ])
          if (matchups.length > 0) {
            await upsertMatchups(leagueId, leagueSeason, w, matchups)
          }
          if (transactions.length > 0) {
            await upsertTransactions(leagueId, leagueSeason, w, transactions)
          }
        } catch (e) {
          // Some weeks may not exist yet — log and continue
          console.warn(`[refresh] Skipping ${leagueId} week ${w}: ${e}`)
        }
      }

      // Fetch draft picks for this league
      try {
        const drafts = await getLeagueDrafts(leagueId)
        for (const draft of drafts) {
          const picks = await getDraftPicks(draft.draft_id)
          if (picks.length > 0) {
            await upsertDraftPicks(draft.draft_id, leagueId, leagueSeason, picks)
          }
        }
      } catch (e) {
        console.warn(`[refresh] Draft fetch failed for ${leagueId}: ${e}`)
      }
    }

    return NextResponse.json({
      ok: true,
      season,
      week: currentWeek,
      leaguesProcessed: leagueIds.length,
    })
  } catch (err) {
    console.error('[refresh] Error:', err)
    return NextResponse.json(
      { ok: false, error: String(err) },
      { status: 500 }
    )
  }
}
