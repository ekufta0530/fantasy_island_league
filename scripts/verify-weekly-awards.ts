import { computeWeeklyAwards, computeAllWeeklyAwards } from '../lib/stats/weekly-awards'
import type { SleeperMatchup } from '../lib/sleeper'

// Week 1: scores 120,100,110,90,130,80
// Roster 5 (130) wins, Roster 6 (80) loses to Roster 5
// Roster 1 (120) wins matchup_id 1, Roster 2 (100) loses
// Roster 3 (110) wins matchup_id 2, Roster 4 (90) loses
const week1: SleeperMatchup[] = [
  { roster_id: 1, matchup_id: 1, points: 120, players_points: {}, starters: [], players: [], custom_points: null, starters_points: [] },
  { roster_id: 2, matchup_id: 1, points: 100, players_points: {}, starters: [], players: [], custom_points: null, starters_points: [] },
  { roster_id: 3, matchup_id: 2, points: 110, players_points: {}, starters: [], players: [], custom_points: null, starters_points: [] },
  { roster_id: 4, matchup_id: 2, points: 90,  players_points: {}, starters: [], players: [], custom_points: null, starters_points: [] },
  { roster_id: 5, matchup_id: 3, points: 130, players_points: {}, starters: [], players: [], custom_points: null, starters_points: [] },
  { roster_id: 6, matchup_id: 3, points: 80,  players_points: {}, starters: [], players: [], custom_points: null, starters_points: [] },
]

let passed = true
const fail = (msg: string) => { console.error('FAIL:', msg); passed = false }

const awards = computeWeeklyAwards(1, week1)
if (!awards) { fail('awards is null'); process.exit(1) }

// Highest scorer: roster 5 (130pts)
if (awards.highest_scorer.roster_id !== 5) fail(`highest scorer should be roster 5, got ${awards.highest_scorer.roster_id}`)
if (awards.highest_scorer.points !== 130) fail(`highest scorer points should be 130, got ${awards.highest_scorer.points}`)

// Lowest scorer: roster 6 (80pts)
if (awards.lowest_scorer.roster_id !== 6) fail(`lowest scorer should be roster 6, got ${awards.lowest_scorer.roster_id}`)

// Biggest blowout: roster 5 beat roster 6 by 50 pts
if (awards.biggest_blowout.winner_roster_id !== 5) fail(`blowout winner should be roster 5`)
if (awards.biggest_blowout.margin !== 50) fail(`blowout margin should be 50, got ${awards.biggest_blowout.margin}`)

// Closest game: roster 3 beat roster 4 by 20 pts (margin 20 < 30)
// Actually: r1 beat r2 by 20, r3 beat r4 by 20, r5 beat r6 by 50
// So closest is 20 (tie between matchup 1 and 2)
if (awards.closest_game.margin > 20) fail(`closest game margin should be ≤20, got ${awards.closest_game.margin}`)

// Should've Lost: lowest-scoring winner
// Winners: roster 1 (120), roster 3 (110), roster 5 (130)
// Lowest winning score: roster 3 (110) — should've lost
if (awards.shouldve_lost?.roster_id !== 3) fail(`shouldve_lost should be roster 3 (lowest winner), got ${awards.shouldve_lost?.roster_id}`)

// Should've Won: highest-scoring loser
// Losers: roster 2 (100), roster 4 (90), roster 6 (80)
// Highest losing score: roster 2 (100) — should've won (didn't, but scored highest among losers)
if (awards.shouldve_won?.roster_id !== 2) fail(`shouldve_won should be roster 2 (highest loser), got ${awards.shouldve_won?.roster_id}`)

// Bench tax leader should be null (not filled yet)
if (awards.bench_tax_leader !== null) fail('bench_tax_leader should be null')

// Test computeAllWeeklyAwards returns most-recent week first
const allWeeks = [
  { week: 1, matchups: week1 },
  { week: 2, matchups: week1 },  // reuse data, just checking order
]
const allAwards = computeAllWeeklyAwards(allWeeks)
if (allAwards[0].week !== 2) fail(`allAwards should be sorted most-recent first, got week ${allAwards[0].week}`)

if (passed) {
  console.log('PASS: weekly awards computed correctly')
  console.log('Week 1 awards:')
  console.log('  Highest scorer:', awards.highest_scorer)
  console.log('  Lowest scorer:', awards.lowest_scorer)
  console.log('  Biggest blowout:', `R${awards.biggest_blowout.winner_roster_id} def R${awards.biggest_blowout.loser_roster_id} by ${awards.biggest_blowout.margin}`)
  console.log('  Closest game:', `margin ${awards.closest_game.margin}`)
  console.log("  Should've won:", awards.shouldve_won)
  console.log("  Should've lost:", awards.shouldve_lost)
} else {
  process.exit(1)
}
