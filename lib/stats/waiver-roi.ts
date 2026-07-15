// lib/stats/waiver-roi.ts

export interface WaiverAdd {
  transaction_id: string
  week: number              // week the add was processed
  roster_id: number
  player_id: string
  player_name: string
  faab_spent: number        // 0 if priority league
  drop_week: number | null  // week the player was dropped (null = still on roster / season end)
  points_gained: number     // sum of player's points from add_week+1 through drop_week or season_end
  roi: number               // points_gained / faab_spent if FAAB, else points_gained
}

export interface RosterWaiverSummary {
  roster_id: number
  total_points_gained: number
  total_faab_spent: number
  add_count: number
  roi: number               // total_points_gained / total_faab_spent (FAAB) or total_points_gained
  best_add: WaiverAdd | null
  worst_add: WaiverAdd | null  // only meaningful in FAAB leagues (highest spend, lowest return)
}

export interface WaiverRoiResult {
  is_faab: boolean
  adds: WaiverAdd[]
  roster_summaries: RosterWaiverSummary[]  // sorted by roi desc
  waiver_wizard: RosterWaiverSummary
  money_drain: RosterWaiverSummary | null  // only in FAAB leagues
}

/**
 * Compute waiver ROI for all adds this season.
 *
 * @param transactions    - all waiver + free_agent transactions
 * @param playerWeekPoints - map of player_id → map of week → points
 * @param currentWeek     - latest completed week
 * @param seasonEndWeek   - last regular season week (default 17)
 * @param isFAAB          - true if league uses FAAB bidding
 * @param playerNames     - map of player_id → display name
 */
export function computeWaiverRoi(
  transactions: Array<{
    transaction_id: string
    week: number
    type: string
    adds: Record<string, number> | null    // player_id → roster_id
    drops: Record<string, number> | null
    waiver_budget: Array<{ sender: number; receiver: number; amount: number }> | null
  }>,
  playerWeekPoints: Map<string, Map<number, number>>,
  currentWeek: number,
  seasonEndWeek: number = 17,
  isFAAB: boolean = false,
  playerNames: Map<string, string> = new Map()
): WaiverRoiResult {
  // Build drop index: player_id + roster_id → earliest drop week
  // A player was "dropped" when they appear in a transaction's drops by that roster
  const dropWeeks = new Map<string, number>()  // key = `${player_id}:${roster_id}`
  for (const txn of transactions) {
    if (!txn.drops) continue
    for (const [player_id, roster_id] of Object.entries(txn.drops)) {
      const key = `${player_id}:${roster_id}`
      const existing = dropWeeks.get(key)
      if (!existing || txn.week < existing) {
        dropWeeks.set(key, txn.week)
      }
    }
  }

  // Helper: sum player points from fromWeek to toWeek inclusive
  function playerPoints(player_id: string, from: number, to: number): number {
    const wm = playerWeekPoints.get(player_id)
    if (!wm) return 0
    let total = 0
    for (let w = from; w <= to; w++) total += wm.get(w) ?? 0
    return total
  }

  const adds: WaiverAdd[] = []

  for (const txn of transactions) {
    if (txn.type !== 'waiver' && txn.type !== 'free_agent') continue
    if (!txn.adds) continue

    // FAAB bid: find the amount paid by each receiver
    const faabByRoster = new Map<number, number>()
    for (const entry of (txn.waiver_budget ?? [])) {
      faabByRoster.set(entry.receiver, (faabByRoster.get(entry.receiver) ?? 0) + entry.amount)
    }

    for (const [player_id, roster_id] of Object.entries(txn.adds)) {
      const addWeek = txn.week
      const dropKey = `${player_id}:${roster_id}`
      const dropWeek = dropWeeks.get(dropKey) ?? null
      const rosEndWeek = Math.min(dropWeek ?? seasonEndWeek, seasonEndWeek)
      const fromWeek = addWeek + 1

      const points = fromWeek > rosEndWeek ? 0 : playerPoints(player_id, fromWeek, rosEndWeek)
      const faab = isFAAB ? (faabByRoster.get(roster_id) ?? 0) : 0
      const roi = isFAAB ? (faab > 0 ? points / faab : points) : points

      adds.push({
        transaction_id: txn.transaction_id,
        week: addWeek,
        roster_id,
        player_id,
        player_name: playerNames.get(player_id) ?? player_id,
        faab_spent: faab,
        drop_week: dropWeek,
        points_gained: points,
        roi,
      })
    }
  }

  // Aggregate per roster
  const byRoster = new Map<number, WaiverAdd[]>()
  for (const add of adds) {
    if (!byRoster.has(add.roster_id)) byRoster.set(add.roster_id, [])
    byRoster.get(add.roster_id)!.push(add)
  }

  const roster_summaries: RosterWaiverSummary[] = [...byRoster.entries()].map(([roster_id, rAdds]) => {
    const totalPts = rAdds.reduce((s, a) => s + a.points_gained, 0)
    const totalFaab = rAdds.reduce((s, a) => s + a.faab_spent, 0)
    const roiScore = isFAAB ? (totalFaab > 0 ? totalPts / totalFaab : totalPts) : totalPts
    const sortedByPts = [...rAdds].sort((a, b) => b.points_gained - a.points_gained)
    const sortedByWaste = isFAAB
      ? [...rAdds].filter(a => a.faab_spent > 0).sort((a, b) => a.roi - b.roi)
      : []
    return {
      roster_id,
      total_points_gained: totalPts,
      total_faab_spent: totalFaab,
      add_count: rAdds.length,
      roi: roiScore,
      best_add: sortedByPts[0] ?? null,
      worst_add: sortedByWaste[0] ?? null,
    }
  }).sort((a, b) => b.roi - a.roi)

  return {
    is_faab: isFAAB,
    adds,
    roster_summaries,
    waiver_wizard: roster_summaries[0],
    money_drain: isFAAB ? roster_summaries[roster_summaries.length - 1] ?? null : null,
  }
}
