import { computeOptimalLineup, computeSeasonBenchTax } from '../lib/stats/bench-tax'

let passed = true
const fail = (msg: string) => { console.error('FAIL:', msg); passed = false }

// --- Test 1: single-roster optimal lineup ---
const rosterPositions = ['QB', 'RB', 'WR', 'FLEX', 'BN', 'BN']
const starters = ['QB1', 'RB1', 'WR1', 'RB2']  // RB2 in FLEX (wrong choice)
const allPlayers = [
  { player_id: 'QB1',  position: 'QB', points: 20 },
  { player_id: 'RB1',  position: 'RB', points: 18 },
  { player_id: 'WR1',  position: 'WR', points: 15 },
  { player_id: 'WR2',  position: 'WR', points: 22 },  // benched! should be in FLEX
  { player_id: 'RB2',  position: 'RB', points: 5  },
  { player_id: 'BN',   position: 'RB', points: 3  },
]

const result = computeOptimalLineup(rosterPositions, starters, allPlayers)

// Optimal: QB1(20) + RB1(18) + WR1(15) + WR2(22 in FLEX) = 75
if (result.optimal_points !== 75) fail(`optimal should be 75, got ${result.optimal_points}`)
// Actual: QB1(20) + RB1(18) + WR1(15) + RB2(5) = 58
if (result.actual_points !== 58) fail(`actual should be 58, got ${result.actual_points}`)
// bench_tax = 17
if (result.bench_tax !== 17) fail(`bench_tax should be 17, got ${result.bench_tax}`)
// Should have a missed start: WR2 benched for RB2 in FLEX
if (result.missed_starts.length === 0) fail('should have at least 1 missed start')
else {
  const top = result.missed_starts[0]
  if (top.benched_player_id !== 'WR2') fail(`top missed start should be WR2, got ${top.benched_player_id}`)
  if (top.delta !== 17) fail(`missed start delta should be 17, got ${top.delta}`)
}

// --- Test 2: no bench tax (perfect lineup) ---
const perfectStarters = ['QB1', 'RB1', 'WR1', 'WR2']  // optimal picks
const perfect = computeOptimalLineup(rosterPositions, perfectStarters, allPlayers)
if (perfect.bench_tax !== 0) fail(`perfect lineup should have 0 bench_tax, got ${perfect.bench_tax}`)
if (perfect.missed_starts.length !== 0) fail(`perfect lineup should have 0 missed starts, got ${perfect.missed_starts.length}`)

// --- Test 3: computeSeasonBenchTax aggregation ---
const playerPositions = new Map([
  ['QB1', 'QB'], ['RB1', 'RB'], ['WR1', 'WR'], ['WR2', 'WR'], ['RB2', 'RB'], ['BN', 'RB']
])
const weeklyData = [{
  week: 1,
  rosters: [{
    roster_id: 1,
    starters,
    players: allPlayers.map(p => p.player_id),
    players_points: Object.fromEntries(allPlayers.map(p => [p.player_id, p.points]))
  }]
}]
const season = computeSeasonBenchTax(weeklyData, playerPositions, rosterPositions)
if (season.length !== 1) fail(`season should have 1 roster, got ${season.length}`)
if (season[0].total_bench_tax !== 17) fail(`season total_bench_tax should be 17, got ${season[0].total_bench_tax}`)
if (season[0].worst_week.week !== 1) fail(`worst week should be week 1`)

if (passed) {
  console.log('PASS: bench tax engine correct')
  console.log('  optimal_points:', result.optimal_points)
  console.log('  actual_points:', result.actual_points)
  console.log('  bench_tax:', result.bench_tax)
  console.log('  top missed start:', result.missed_starts[0])
} else {
  process.exit(1)
}
