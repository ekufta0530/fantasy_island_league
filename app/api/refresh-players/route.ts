import { NextRequest, NextResponse } from 'next/server'
import { CRON_SECRET } from '@/lib/constants'
import { getAllPlayers } from '@/lib/sleeper'
import { upsertNFLPlayers } from '@/lib/db/cache'

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
    const players = await getAllPlayers()
    await upsertNFLPlayers(players)
    return NextResponse.json({ ok: true, count: Object.keys(players).length })
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}
