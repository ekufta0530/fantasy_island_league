// lib/stats/player-data.ts
import { cache } from 'react'
import { getAllPlayers } from '../sleeper'
import { supabaseAdmin } from '../db/supabase'

export interface PlayerData {
  name: string
  /** Primary position, for display (e.g. draft board "RB") */
  position: string
  /** All fantasy-eligible positions (Sleeper's fantasy_positions) — use this for lineup-slot eligibility, not `position` alone, since some players are eligible at more than one slot type. */
  positions: string[]
}

const PAGE_SIZE = 1000

/**
 * All NFL players keyed by player_id — name + position(s).
 * Supabase cache first (fast), falls back to the live Sleeper API.
 * Deduped per-request: bench tax, draft grade, trades, waiver ROI, and the
 * recap generator all need this and previously each fetched it separately.
 *
 * Paginates via `.range()` rather than trusting `.limit()` — Supabase's
 * PostgREST layer silently caps results at 1000 rows by default regardless
 * of the requested limit, and this table has 12,000+ rows. Without paging,
 * ~92% of players resolved to an unknown position, which was quietly
 * zeroing out every lineup-optimization calculation that depends on it.
 */
export const getPlayerDataMap = cache(async (): Promise<Map<string, PlayerData>> => {
  try {
    const map = new Map<string, PlayerData>()
    for (let from = 0; ; from += PAGE_SIZE) {
      const { data, error } = await supabaseAdmin
        .from('nfl_players_cache')
        .select('player_id, data')
        .range(from, from + PAGE_SIZE - 1)
      if (error) throw error
      if (!data || data.length === 0) break
      for (const row of data) {
        const d = row.data as { first_name?: string; last_name?: string; full_name?: string; position?: string; fantasy_positions?: string[] }
        const name = d.full_name ?? (`${d.first_name ?? ''} ${d.last_name ?? ''}`.trim() || row.player_id)
        map.set(row.player_id, {
          name,
          position: d.position ?? 'UNK',
          positions: d.fantasy_positions ?? (d.position ? [d.position] : []),
        })
      }
      if (data.length < PAGE_SIZE) break
    }
    if (map.size > 0) return map
  } catch { /* fall through */ }

  const players = await getAllPlayers()
  return new Map(Object.entries(players).map(([id, p]) => [
    id,
    {
      name: p.full_name ?? `${p.first_name} ${p.last_name}`.trim(),
      position: p.position ?? 'UNK',
      positions: p.fantasy_positions ?? (p.position ? [p.position] : []),
    }
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

/** Map of player_id -> all fantasy-eligible positions, for lineup-slot matching. */
export async function getPlayerEligiblePositionsMap(): Promise<Map<string, string[]>> {
  const data = await getPlayerDataMap()
  return new Map([...data.entries()].map(([id, d]) => [id, d.positions]))
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
