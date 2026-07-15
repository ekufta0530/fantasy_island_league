import { computeTradeGrades } from '../lib/stats/trade-grade'

let passed = true
const fail = (msg: string) => { console.error('FAIL:', msg); passed = false }

// Week 3 trade: R1 receives pA+pB, R2 receives pC+pD
// adds: pA→R1, pB→R1, pC→R2, pD→R2
// drops: pA from R2, pB from R2, pC from R1, pD from R1
const trades = [{
  transaction_id: 'trade-1',
  week: 3,
  adds: { 'pA': 1, 'pB': 1, 'pC': 2, 'pD': 2 },
  drops: { 'pA': 2, 'pB': 2, 'pC': 1, 'pD': 1 },
  roster_ids: [1, 2],
}]

// ROS points for each player (weeks 4–10)
// pA: 10pts/week for 7 weeks = 70, but let's put it per-week:
const playerRosPoints = new Map([
  ['pA', new Map([[4,10],[5,10],[6,10],[7,10],[8,10],[9,10],[10,10]])],  // 70 pts
  ['pB', new Map([[4,5],[5,5],[6,5],[7,5],[8,5],[9,5],[10,5]])],         // 35 pts
  ['pC', new Map([[4,2],[5,2],[6,2],[7,1],[8,1],[9,1],[10,1]])],         // 10 pts
  ['pD', new Map([[4,1],[5,1],[6,1],[7,0],[8,0],[9,0],[10,0]])],         // 3 pts
])

const result = computeTradeGrades(trades, playerRosPoints, 10, 17, '2025')

// Should have 1 graded trade
if (result.graded_trades.length !== 1) fail(`expected 1 graded trade, got ${result.graded_trades.length}`)

const gt = result.graded_trades[0]

// R1 received pA(70) + pB(35) = 105, gave pC(10)+pD(3) = 13. delta = 105-13 = 92
// R2 received pC(10)+pD(3) = 13, gave pA(70)+pB(35) = 105. delta = 13-105 = -92
const r1p = gt.participants.find(p => p.roster_id === 1)
const r2p = gt.participants.find(p => p.roster_id === 2)
if (!r1p) fail('R1 participant not found')
if (!r2p) fail('R2 participant not found')
if (r1p && Math.abs(r1p.trade_value_delta - 92) > 0.01) fail(`R1 delta should be 92, got ${r1p.trade_value_delta}`)
if (r2p && Math.abs(r2p.trade_value_delta - (-92)) > 0.01) fail(`R2 delta should be -92, got ${r2p.trade_value_delta}`)

// Robbery score = 92 - (-92) = 184
if (Math.abs(gt.robbery_score - 184) > 0.01) fail(`robbery_score should be 184, got ${gt.robbery_score}`)

// Winner = R1, Loser = R2
if (gt.winner_roster_id !== 1) fail(`winner should be R1`)
if (gt.loser_roster_id !== 2) fail(`loser should be R2`)

// Not in-progress (week 3 << 17-3=14)
if (gt.is_in_progress) fail('trade at week 3 should not be in_progress')

// Roster grades
if (result.trade_king.roster_id !== 1) fail(`trade_king should be R1`)
if (result.fleeced.roster_id !== 2) fail(`fleeced should be R2`)

// Robbery of year = this trade
if (result.robbery_of_year?.transaction_id !== 'trade-1') fail('robbery_of_year should be trade-1')

// In-progress test: trade at week 15 should be in_progress (17-3=14, week 15 >= 14)
const lateTrades = [{ ...trades[0], transaction_id: 'trade-2', week: 15 }]
const lateResult = computeTradeGrades(lateTrades, playerRosPoints, 17, 17, '2025')
if (!lateResult.graded_trades[0].is_in_progress) fail('week 15 trade should be in_progress')

if (passed) {
  console.log('PASS: trade grade engine correct')
  console.log('  R1 delta:', r1p?.trade_value_delta)
  console.log('  R2 delta:', r2p?.trade_value_delta)
  console.log('  Robbery score:', gt.robbery_score)
  console.log('  Trade King: R' + result.trade_king.roster_id)
  console.log('  Fleeced: R' + result.fleeced.roster_id)
} else {
  process.exit(1)
}
