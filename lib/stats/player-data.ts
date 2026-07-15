// lib/stats/player-data.ts
import { cache } from 'react'
import { getAllPlayers } from '../sleeper'
import { supabaseAdmin } from '../db/supabase'

export interface PlayerData {
  name: string
  position: string
}

/**
 * All NFL players keyed by player_id — name + position.
 * Supabase cache first (fast), falls back to the live Sleeper API.
 * Deduped per-request: bench tax, draft grade, trades, waiver ROI, and the
 * recap generator all need this and previously each fetched it separately.
 */
export const getPlayerDataMap = cache(async (): Promise<Map<string, PlayerData>> => {
  try {
    const { data } = await supabaseAdmin
      .from('nfl_players_cache')
      .select('player_id, data')
      .limit(10000)
    if (data && data.length > 0) {
      const map = new Map<string, PlayerData>()
      for (const row of data) {
        const d = row.data as { first_name?: string; last_name?: string; full_name?: string; position?: string }
        const name = d.full_name ?? (`${d.first_name ?? ''} ${d.last_name ?? ''}`.trim() || row.player_id)
        map.set(row.player_id, { name, position: d.position ?? 'UNK' })
      }
      return map
    }
  } catch { /* fall through */ }

  const players = await getAllPlayers()
  return new Map(Object.entries(players).map(([id, p]) => [
    id,
    { name: p.full_name ?? `${p.first_name} ${p.last_name}`.trim(), position: p.position ?? 'UNK' }
  ]))
})

export async function getPlayerNamesMap(): Promise<Map<string, string>> {
  const data = await getPlayerDataMap()
  return new Map([...data.entries()].map(([id, d]) => [id, d.name]))
}

export async function getPlayerPositionsMap(): Promise<Map<string, string>> {
  const data = await getPlayerDataMap()
  return new Map([...data.entries()].map(([id, d]) => [id, d.position]))
}

/**
 * A player's fantasy points per week, from cached `raw_matchups`
 * (`season`, `week <= maxWeek`). Deduped per-request per (season, maxWeek).
 */
export const getPlayerWeekPointsMap = cache(async (season: string, maxWeek: number): Promise<Map<string, Map<number, number>>> => {
  const result = new Map<string, Map<number, number>>()
  try {
    const { data } = await supabaseAdmin
      .from('raw_matchups')
      .select('week, data')
      .eq('season', season)
      .lte('week', maxWeek)
    if (data) {
      for (const row of data) {
        const week = row.week as number
        const d = row.data as { players_points?: Record<string, number> }
        for (const [pid, pts] of Object.entries(d.players_points ?? {})) {
          if (!result.has(pid)) result.set(pid, new Map())
          result.get(pid)!.set(week, pts)
        }
      }
    }
  } catch { /* empty on DB failure — callers treat missing data as 0 */ }
  return result
})

/** A player's total fantasy points across the season (season, week <= maxWeek). */
export async function getPlayerSeasonPointsMap(season: string, maxWeek: number): Promise<Map<string, number>> {
  const weekly = await getPlayerWeekPointsMap(season, maxWeek)
  const totals = new Map<string, number>()
  for (const [pid, weekMap] of weekly) {
    let sum = 0
    for (const pts of weekMap.values()) sum += pts
    totals.set(pid, sum)
  }
  return totals
}
