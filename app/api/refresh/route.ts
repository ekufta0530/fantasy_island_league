import { NextRequest, NextResponse } from 'next/server'
import { CRON_SECRET, CURRENT_LEAGUE_ID } from '@/lib/constants'
import { getNFLState, getLeagueHistory, getLeagueDrafts, getDraftPicks, getAllPlayers } from '@/lib/sleeper'
import { getSeasonSnapshot } from '@/lib/stats/season-snapshot'
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

    // Refresh /players/nfl once/day
    if (!(await isNFLPlayersCacheFresh())) {
      console.log('[refresh] Fetching /players/nfl...')
      const players = await getAllPlayers()
      await upsertNFLPlayers(players)
      console.log('[refresh] /players/nfl cached.')
    }

    // Walk full league history chain, fetch every season's snapshot in
    // parallel — each season is independent, and the snapshot already knows
    // exactly which weeks have real data (no need to guess from real-time
    // NFL state, which breaks once a season ends and CURRENT_LEAGUE_ID
    // hasn't been bumped to the new one yet).
    const leagueIds = await getLeagueHistory(CURRENT_LEAGUE_ID)
    console.log(`[refresh] Processing ${leagueIds.length} league seasons`)
    const snapshots = await Promise.all(leagueIds.map(id => getSeasonSnapshot(id)))

    for (const snapshot of snapshots) {
      const leagueId = snapshot.league.league_id
      const leagueSeason = snapshot.league.season

      await Promise.all([
        ...snapshot.weeklyMatchups.map(({ week, matchups }) =>
          upsertMatchups(leagueId, leagueSeason, week, matchups)
            .catch(e => console.warn(`[refresh] Failed to cache matchups ${leagueId} week ${week}: ${e}`))
        ),
        ...snapshot.weeklyTransactions.map(({ week, transactions }) =>
          upsertTransactions(leagueId, leagueSeason, week, transactions)
            .catch(e => console.warn(`[refresh] Failed to cache transactions ${leagueId} week ${week}: ${e}`))
        ),
      ])

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
      season: nflState.season,
      week: nflState.week,
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
