import { NextResponse } from 'next/server'
import { getLeagueHistory, getLeague } from '@/lib/sleeper'
import { CURRENT_LEAGUE_ID } from '@/lib/constants'

export const runtime = 'nodejs'

export async function GET() {
  try {
    const leagueIds = await getLeagueHistory(CURRENT_LEAGUE_ID)
    const seasons = await Promise.all(
      leagueIds.map(async (id) => {
        const league = await getLeague(id)
        return {
          league_id: id,
          season: league.season,
          name: league.name,
          status: league.status,
        }
      })
    )
    return NextResponse.json({ ok: true, seasons, count: seasons.length })
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}
