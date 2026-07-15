import { computeWaiverRoi } from '../lib/stats/waiver-roi'

let passed = true
const fail = (msg: string) => { console.error('FAIL:', msg); passed = false }

// 2 rosters. R1 picks up pA (week 2, 30pts ROS) and pB (week 5, 5pts ROS, dropped week 8).
// R2 picks up pC (week 3, 20pts ROS).
// Non-FAAB league (priority waivers) → ROI = raw points_gained.

type Txn = Parameters<typeof computeWaiverRoi>[0][number]
const transactions: Txn[] = [
  { transaction_id: 'w1', week: 2, type: 'waiver', adds: { 'pA': 1 }, drops: null, waiver_budget: null },
  { transaction_id: 'w2', week: 5, type: 'waiver', adds: { 'pB': 1 }, drops: null, waiver_budget: null },
  // R1 drops pB in week 8
  { transaction_id: 'w3', week: 8, type: 'free_agent', adds: { 'pX': 1 }, drops: { 'pB': 1 }, waiver_budget: null },
  { transaction_id: 'w4', week: 3, type: 'waiver', adds: { 'pC': 2 }, drops: null, waiver_budget: null },
]

// pA: weeks 3-17 → 30 pts (say 2pts/week × 15 weeks)
// pB: weeks 6-8 → 5 pts (dropped week 8 → rosEnd = 8-1=7? No: drop_week=8, rosEndWeek=min(8,17,17)=8... wait.
// Actually: fromWeek = addWeek+1 = 6, rosEndWeek = min(dropWeek=8, currentWeek=10, seasonEndWeek=17) = 8
// so pB: weeks 6-8 = 3 weeks × ~1.67pts = 5pts
// pC: weeks 4-10 → 20 pts
// pX: no points data — 0pts

const playerWeekPoints = new Map([
  ['pA', new Map([[3,2],[4,2],[5,2],[6,2],[7,2],[8,2],[9,2],[10,2],[11,2],[12,2],[13,2],[14,2],[15,2],[16,2],[17,2]])],
  ['pB', new Map([[6,2],[7,2],[8,1]])],  // 5 pts total (weeks 6-8, drop is at week 8 boundary)
  ['pC', new Map([[4,3],[5,3],[6,3],[7,3],[8,3],[9,3],[10,2]])],  // 20 pts
])

const result = computeWaiverRoi(transactions, playerWeekPoints, 10, 17, false)

// R1: pA(30) + pB(5) + pX(0) = 35pts; R2: pC(20)
// Non-FAAB so ROI = raw points
const r1 = result.roster_summaries.find(r => r.roster_id === 1)
const r2 = result.roster_summaries.find(r => r.roster_id === 2)
if (!r1) fail('R1 not found in summaries')
if (!r2) fail('R2 not found in summaries')
if (r1 && Math.abs(r1.total_points_gained - 35) > 0.1) fail(`R1 total_points_gained should be ~35, got ${r1.total_points_gained}`)
if (r2 && Math.abs(r2.total_points_gained - 20) > 0.1) fail(`R2 total_points_gained should be ~20, got ${r2.total_points_gained}`)

// Waiver wizard = R1 (35 > 20)
if (result.waiver_wizard.roster_id !== 1) fail(`waiver_wizard should be R1, got ${result.waiver_wizard.roster_id}`)

// money_drain = null for non-FAAB
if (result.money_drain !== null) fail('money_drain should be null for non-FAAB league')

// Best add for R1 = pA (30pts)
if (r1?.best_add?.player_id !== 'pA') fail(`R1 best add should be pA, got ${r1?.best_add?.player_id}`)

// pB drop week should be 8 → points only weeks 6-8
const pbAdd = result.adds.find(a => a.player_id === 'pB')
if (pbAdd && pbAdd.drop_week !== 8) fail(`pB drop_week should be 8, got ${pbAdd?.drop_week}`)
if (pbAdd && pbAdd.points_gained < 4) fail(`pB points_gained should be ~5, got ${pbAdd?.points_gained}`)

// FAAB test
const faabTxns = [
  { transaction_id: 'f1', week: 3, type: 'waiver', adds: { 'pA': 1 }, drops: null,
    waiver_budget: [{ sender: 1, receiver: 1, amount: 20 }] },
]
const faabPts = new Map([['pA', new Map([[4,5],[5,5],[6,5]])]])  // 15pts ROS
const faabResult = computeWaiverRoi(faabTxns, faabPts, 6, 17, true)
const faabR1 = faabResult.roster_summaries[0]
// ROI = 15pts / $20 = 0.75 pts per dollar
if (!faabR1) fail('FAAB R1 not found')
if (faabR1 && Math.abs(faabR1.roi - 0.75) > 0.01) fail(`FAAB ROI should be 0.75, got ${faabR1?.roi}`)
if (faabResult.money_drain === null) fail('FAAB money_drain should not be null')

if (passed) {
  console.log('PASS: waiver ROI engine correct')
  console.log('  R1 total pts:', r1?.total_points_gained)
  console.log('  R2 total pts:', r2?.total_points_gained)
  console.log('  Waiver Wizard: R' + result.waiver_wizard.roster_id)
  console.log('  pB drop_week:', pbAdd?.drop_week, '| pts:', pbAdd?.points_gained)
  console.log('  FAAB ROI:', faabR1?.roi)
} else {
  process.exit(1)
}
