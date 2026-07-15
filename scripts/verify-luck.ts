import { computeLuckIndex } from '../lib/stats/luck'
import type { WeekMatchups } from '../lib/stats/power'

const synthetic: WeekMatchups[] = [
  {
    week: 1,
    matchups: [
      { roster_id: 1, matchup_id: 1, points: 120, players_points: {}, starters: [], players: [], custom_points: null, starters_points: [] },
      { roster_id: 2, matchup_id: 1, points: 100, players_points: {}, starters: [], players: [], custom_points: null, starters_points: [] },
      { roster_id: 3, matchup_id: 2, points: 110, players_points: {}, starters: [], players: [], custom_points: null, starters_points: [] },
      { roster_id: 4, matchup_id: 2, points: 90,  players_points: {}, starters: [], players: [], custom_points: null, starters_points: [] },
      { roster_id: 5, matchup_id: 3, points: 130, players_points: {}, starters: [], players: [], custom_points: null, starters_points: [] },
      { roster_id: 6, matchup_id: 3, points: 80,  players_points: {}, starters: [], players: [], custom_points: null, starters_points: [] },
    ],
  },
  {
    week: 2,
    matchups: [
      { roster_id: 1, matchup_id: 1, points: 115, players_points: {}, starters: [], players: [], custom_points: null, starters_points: [] },
      { roster_id: 3, matchup_id: 1, points: 95,  players_points: {}, starters: [], players: [], custom_points: null, starters_points: [] },
      { roster_id: 2, matchup_id: 2, points: 105, players_points: {}, starters: [], players: [], custom_points: null, starters_points: [] },
      { roster_id: 5, matchup_id: 2, points: 140, players_points: {}, starters: [], players: [], custom_points: null, starters_points: [] },
      { roster_id: 4, matchup_id: 3, points: 88,  players_points: {}, starters: [], players: [], custom_points: null, starters_points: [] },
      { roster_id: 6, matchup_id: 3, points: 75,  players_points: {}, starters: [], players: [], custom_points: null, starters_points: [] },
    ],
  },
  {
    week: 3,
    matchups: [
      { roster_id: 1, matchup_id: 1, points: 125, players_points: {}, starters: [], players: [], custom_points: null, starters_points: [] },
      { roster_id: 5, matchup_id: 1, points: 118, players_points: {}, starters: [], players: [], custom_points: null, starters_points: [] },
      { roster_id: 2, matchup_id: 2, points: 99,  players_points: {}, starters: [], players: [], custom_points: null, starters_points: [] },
      { roster_id: 4, matchup_id: 2, points: 102, players_points: {}, starters: [], players: [], custom_points: null, starters_points: [] },
      { roster_id: 3, matchup_id: 3, points: 108, players_points: {}, starters: [], players: [], custom_points: null, starters_points: [] },
      { roster_id: 6, matchup_id: 3, points: 85,  players_points: {}, starters: [], players: [], custom_points: null, starters_points: [] },
    ],
  },
  {
    week: 4,
    matchups: [
      { roster_id: 1, matchup_id: 1, points: 130, players_points: {}, starters: [], players: [], custom_points: null, starters_points: [] },
      { roster_id: 6, matchup_id: 1, points: 70,  players_points: {}, starters: [], players: [], custom_points: null, starters_points: [] },
      { roster_id: 5, matchup_id: 2, points: 122, players_points: {}, starters: [], players: [], custom_points: null, starters_points: [] },
      { roster_id: 2, matchup_id: 2, points: 111, players_points: {}, starters: [], players: [], custom_points: null, starters_points: [] },
      { roster_id: 3, matchup_id: 3, points: 97,  players_points: {}, starters: [], players: [], custom_points: null, starters_points: [] },
      { roster_id: 4, matchup_id: 3, points: 94,  players_points: {}, starters: [], players: [], custom_points: null, starters_points: [] },
    ],
  },
]

const results = computeLuckIndex(synthetic)

let passed = true
const fail = (msg: string) => { console.error('FAIL:', msg); passed = false }

// Should have 6 entries
if (results.length !== 6) fail(`expected 6 entries, got ${results.length}`)

// All-play wins + losses + ties per team per week = 5 opponents × 4 weeks = 20 total
for (const r of results) {
  const apTotal = r.all_play_wins + r.all_play_losses + r.all_play_ties
  if (apTotal !== 20) fail(`roster ${r.roster_id}: expected 20 all-play games, got ${apTotal}`)
}

// Luck index sum across all teams should be ~0 (wins redistributed, not created)
const luckSum = results.reduce((s, r) => s + r.luck_index, 0)
if (Math.abs(luckSum) > 0.01) fail(`luck index sum should be ~0, got ${luckSum.toFixed(4)}`)

// Roster 2 went 0-4 actual despite solid scoring — should have positive luck_index (unlucky schedule)
const r2 = results.find(r => r.roster_id === 2)
if (!r2) fail('roster 2 not found')
else if (r2.luck_index >= 0) fail(`roster 2 should have negative luck_index (kept losing to high scorers), got ${r2.luck_index.toFixed(3)}`)

if (passed) {
  console.log('PASS: luck index computed correctly')
  console.table(results.map(r => ({
    roster: r.roster_id,
    actual_W: r.actual_wins,
    ap_W: r.all_play_wins,
    ap_L: r.all_play_losses,
    ap_win_pct: r.all_play_win_pct.toFixed(3),
    luck: r.luck_index.toFixed(3),
  })))
} else {
  process.exit(1)
}
