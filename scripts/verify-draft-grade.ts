import { computeDraftGrades, DraftPickInput } from '../lib/stats/draft-grade'

// 12 players drafted, 2 rosters × 6 picks each (snake draft)
// Roster 1: picks 1,4,5,8,9,12
// Roster 2: picks 2,3,6,7,10,11
const picks: DraftPickInput[] = [
  { pick_no: 1,  player_id: 'p1',  roster_id: 1, player_name: 'Alpha RB',  position: 'RB' },
  { pick_no: 2,  player_id: 'p2',  roster_id: 2, player_name: 'Beta WR',   position: 'WR' },
  { pick_no: 3,  player_id: 'p3',  roster_id: 2, player_name: 'Gamma QB',  position: 'QB' },
  { pick_no: 4,  player_id: 'p4',  roster_id: 1, player_name: 'Delta TE',  position: 'TE' },
  { pick_no: 5,  player_id: 'p5',  roster_id: 1, player_name: 'Epsilon WR',position: 'WR' },
  { pick_no: 6,  player_id: 'p6',  roster_id: 2, player_name: 'Zeta RB',   position: 'RB' },
  { pick_no: 7,  player_id: 'p7',  roster_id: 2, player_name: 'Eta WR',    position: 'WR' },
  { pick_no: 8,  player_id: 'p8',  roster_id: 1, player_name: 'Theta RB',  position: 'RB' },
  { pick_no: 9,  player_id: 'p9',  roster_id: 1, player_name: 'Iota QB',   position: 'QB' },
  { pick_no: 10, player_id: 'p10', roster_id: 2, player_name: 'Kappa WR',  position: 'WR' },
  { pick_no: 11, player_id: 'p11', roster_id: 2, player_name: 'Lambda TE', position: 'TE' },
  { pick_no: 12, player_id: 'p12', roster_id: 1, player_name: 'Mu RB',     position: 'RB' },
]

// Season points: roster 1 picks all outperform, roster 2 picks all underperform
// Actual finish rank order (by season_points desc): p12, p9, p8, p5, p4, p1, p2, p3, p6, p7, p10, p11
const seasonPoints = new Map([
  ['p12', 320], // pick 12 → finish rank 1  → VOP = 12-1 = +11 (STEAL)
  ['p9',  300], // pick 9  → finish rank 2  → VOP = 9-2  = +7
  ['p8',  280], // pick 8  → finish rank 3  → VOP = 8-3  = +5
  ['p5',  260], // pick 5  → finish rank 4  → VOP = 5-4  = +1
  ['p4',  240], // pick 4  → finish rank 5  → VOP = 4-5  = -1
  ['p1',  200], // pick 1  → finish rank 6  → VOP = 1-6  = -5
  ['p2',  180], // pick 2  → finish rank 7  → VOP = 2-7  = -5
  ['p3',  160], // pick 3  → finish rank 8  → VOP = 3-8  = -5
  ['p6',  140], // pick 6  → finish rank 9  → VOP = 6-9  = -3
  ['p7',  120], // pick 7  → finish rank 10 → VOP = 7-10 = -3
  ['p10', 100], // pick 10 → finish rank 11 → VOP = 10-11= -1
  ['p11',  80], // pick 11 → finish rank 12 → VOP = 11-12= -1
])

let passed = true
const fail = (msg: string) => { console.error('FAIL:', msg); passed = false }

const result = computeDraftGrades(picks, seasonPoints)

// 2 rosters
if (result.rosters.length !== 2) fail(`expected 2 rosters, got ${result.rosters.length}`)

// Roster 1 grade score: +11 +7 +5 +1 -1 -5 = +18
// Roster 2 grade score: -5 -5 -3 -3 -1 -1 = -18
const r1 = result.rosters.find(r => r.roster_id === 1)
const r2 = result.rosters.find(r => r.roster_id === 2)
if (!r1) fail('roster 1 not found')
if (!r2) fail('roster 2 not found')
if (r1 && r1.grade_score !== 18) fail(`roster 1 grade_score should be 18, got ${r1.grade_score}`)
if (r2 && r2.grade_score !== -18) fail(`roster 2 grade_score should be -18, got ${r2.grade_score}`)
if (r1 && r1.rank !== 1) fail(`roster 1 should be rank 1, got ${r1.rank}`)
if (r2 && r2.rank !== 2) fail(`roster 2 should be rank 2, got ${r2.rank}`)

// Steal of year: p12 (VOP=+11)
if (result.steal_of_year.player_id !== 'p12') fail(`steal_of_year should be p12, got ${result.steal_of_year.player_id}`)
if (result.steal_of_year.value_over_pick !== 11) fail(`steal VOP should be 11, got ${result.steal_of_year.value_over_pick}`)

// Bust of year: most negative VOP. p1, p2, p3 all have VOP=-5 — any is valid
if (result.bust_of_year.value_over_pick !== -5) fail(`bust VOP should be -5, got ${result.bust_of_year.value_over_pick}`)

// Reach of year: top-half picks (1–6) with worst VOP. p1 (VOP=-5) or p2 (VOP=-5)
if (result.reach_of_year.value_over_pick > -3) fail(`reach VOP should be ≤-3 (a reach in the top half)`)

// Best drafter should be roster 1
if (result.best_drafter.roster_id !== 1) fail(`best_drafter should be roster 1`)

// Grades: roster 1 (rank 1 of 2) should get A+ or A; roster 2 (rank 2 of 2) should get F
if (r1 && !['A+','A'].includes(r1.letter_grade)) fail(`roster 1 should get A+ or A, got ${r1.letter_grade}`)
if (r2 && r2.letter_grade !== 'F') fail(`roster 2 should get F, got ${r2.letter_grade}`)

if (passed) {
  console.log('PASS: draft grade engine correct')
  console.log('  Roster 1 grade:', r1?.letter_grade, '(score:', r1?.grade_score, ')')
  console.log('  Roster 2 grade:', r2?.letter_grade, '(score:', r2?.grade_score, ')')
  console.log('  Steal of Year:', result.steal_of_year.player_name, `VOP=${result.steal_of_year.value_over_pick}`)
  console.log('  Bust of Year:', result.bust_of_year.player_name, `VOP=${result.bust_of_year.value_over_pick}`)
  console.log('  Reach of Year:', result.reach_of_year.player_name, `VOP=${result.reach_of_year.value_over_pick}`)
} else {
  process.exit(1)
}
