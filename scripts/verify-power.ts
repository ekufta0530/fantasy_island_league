import { computePowerRankings, WeekMatchups } from '../lib/stats/power'

// Synthetic 6-team, 4-week season
// Teams: roster_ids 1-6, paired matchup_ids 1,2,3 per week
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

const results = computePowerRankings(synthetic)

// Basic assertions
let passed = true
const fail = (msg: string) => { console.error('FAIL:', msg); passed = false }

// Should have 6 entries
if (results.length !== 6) fail(`expected 6 entries, got ${results.length}`)

// Ranks should be 1–6 with no gaps
const ranks = results.map(r => r.power_rank).sort((a, b) => a - b)
if (JSON.stringify(ranks) !== JSON.stringify([1,2,3,4,5,6])) fail(`ranks not 1-6: ${ranks}`)

// Roster 1 scored the most and won all 4 — should be rank 1
const r1 = results.find(r => r.roster_id === 1)
if (!r1) fail('roster 1 not found')
else {
  if (r1.wins !== 4) fail(`roster 1 should have 4 wins, got ${r1.wins}`)
  if (r1.power_rank !== 1) fail(`roster 1 should be rank 1, got ${r1.power_rank}`)
}

// Roster 6 lost all 4 — should be rank 6
const r6 = results.find(r => r.roster_id === 6)
if (!r6) fail('roster 6 not found')
else {
  if (r6.losses !== 4) fail(`roster 6 should have 4 losses, got ${r6.losses}`)
  if (r6.power_rank !== 6) fail(`roster 6 should be rank 6, got ${r6.power_rank}`)
}

// All power_scores should be between 0 and 1
for (const r of results) {
  if (r.power_score < 0 || r.power_score > 1) fail(`power_score out of range for roster ${r.roster_id}: ${r.power_score}`)
}

if (passed) {
  console.log('PASS: power rankings computed correctly')
  console.table(results.map(r => ({
    roster: r.roster_id, rank: r.power_rank,
    W: r.wins, L: r.losses,
    PF: r.points_for.toFixed(1),
    last3: r.last3_points_for.toFixed(1),
    score: r.power_score.toFixed(4),
  })))
} else {
  process.exit(1)
}
