import { supabaseAdmin } from './supabase'
import type { SleeperMatchup, SleeperTransaction, SleeperDraftPick, SleeperPlayer } from '../sleeper'

export async function upsertMatchups(
  leagueId: string,
  season: string,
  week: number,
  matchups: SleeperMatchup[]
): Promise<void> {
  const rows = matchups.map((m) => ({
    league_id: leagueId,
    season,
    week,
    roster_id: m.roster_id,
    data: m as unknown as Record<string, unknown>,
  }))
  const { error } = await supabaseAdmin
    .from('raw_matchups')
    .upsert(rows, { onConflict: 'league_id,season,week,roster_id' })
  if (error) throw new Error(`upsertMatchups: ${error.message}`)
}

export async function upsertTransactions(
  leagueId: string,
  season: string,
  week: number,
  transactions: SleeperTransaction[]
): Promise<void> {
  const rows = transactions.map((t) => ({
    transaction_id: t.transaction_id,
    league_id: leagueId,
    season,
    week,
    type: t.type,
    data: t as unknown as Record<string, unknown>,
  }))
  const { error } = await supabaseAdmin
    .from('raw_transactions')
    .upsert(rows, { onConflict: 'transaction_id' })
  if (error) throw new Error(`upsertTransactions: ${error.message}`)
}

export async function upsertDraftPicks(
  draftId: string,
  leagueId: string,
  season: string,
  picks: SleeperDraftPick[]
): Promise<void> {
  const rows = picks.map((p) => ({
    draft_id: draftId,
    league_id: leagueId,
    season,
    pick_no: p.pick_no,
    roster_id: p.roster_id,
    player_id: p.player_id,
    data: p as unknown as Record<string, unknown>,
  }))
  const { error } = await supabaseAdmin
    .from('raw_drafts')
    .upsert(rows, { onConflict: 'draft_id,pick_no' })
  if (error) throw new Error(`upsertDraftPicks: ${error.message}`)
}

export async function upsertNFLPlayers(
  players: Record<string, SleeperPlayer>
): Promise<void> {
  // Batch upsert in chunks of 500 to avoid payload limits
  const entries = Object.entries(players)
  const CHUNK = 500
  for (let i = 0; i < entries.length; i += CHUNK) {
    const chunk = entries.slice(i, i + CHUNK)
    const rows = chunk.map(([player_id, data]) => ({
      player_id,
      data: data as unknown as Record<string, unknown>,
      fetched_at: new Date().toISOString(),
    }))
    const { error } = await supabaseAdmin
      .from('nfl_players_cache')
      .upsert(rows, { onConflict: 'player_id' })
    if (error) throw new Error(`upsertNFLPlayers chunk ${i}: ${error.message}`)
  }
}

export async function isNFLPlayersCacheFresh(): Promise<boolean> {
  // Returns true if the cache was populated in the last 23 hours
  const { data } = await supabaseAdmin
    .from('nfl_players_cache')
    .select('fetched_at')
    .order('fetched_at', { ascending: false })
    .limit(1)
    .single()
  if (!data) return false
  const age = Date.now() - new Date(data.fetched_at).getTime()
  return age < 23 * 60 * 60 * 1000
}
