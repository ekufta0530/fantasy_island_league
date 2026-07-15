import { assembleWeekBrief, WeekBrief } from '../lib/recap/week-brief'

let passed = true
const fail = (msg: string) => { console.error('FAIL:', msg); passed = false }

const rosterIdToName = new Map([
  [1, 'Picks Of Destiny'],
  [2, 'Bijan al Gaib'],
  [3, 'Love thy Naber'],
])

const brief = assembleWeekBrief({
  season: '2025',
  week: 5,
  matchups: [
    { matchup_id: 1, home: { display_name: 'Picks Of Destiny', points: 132.5 }, away: { display_name: 'Bijan al Gaib', points: 98.3 } },
    { matchup_id: 2, home: { display_name: 'Love thy Naber',   points: 145.0 }, away: { display_name: 'Rookie Time',   points: 145.0 } },
  ],
  standings: [
    { display_name: 'Picks Of Destiny', wins: 4, losses: 1, power_rank: 1, points_for: 650 },
    { display_name: 'Love thy Naber',   wins: 3, losses: 2, power_rank: 2, points_for: 620 },
    { display_name: 'Bijan al Gaib',    wins: 2, losses: 3, power_rank: 3, points_for: 510 },
  ],
  prevStandings: [
    { display_name: 'Picks Of Destiny', power_rank: 2 },
    { display_name: 'Love thy Naber',   power_rank: 1 },
    { display_name: 'Bijan al Gaib',    power_rank: 3 },
  ],
  awards: {
    highest_scorer: { roster_id: 3, points: 145.0 },
    lowest_scorer:  { roster_id: 2, points: 98.3 },
    biggest_blowout: { winner_roster_id: 1, loser_roster_id: 2, margin: 34.2 },
    closest_game:    { winner_roster_id: 3, loser_roster_id: 3, margin: 0 },
    shouldve_won: null,
    shouldve_lost: null,
  },
  rosterIdToName,
  benchTaxLeader: { roster_id: 2, bench_tax: 22.5, swap_label: 'Started Joe Flacco (4.2pts) over Justin Jefferson (26.7pts)' },
  trades: [{
    week: 5,
    robbery_score: 80,
    participants: [
      { roster_id: 1, ros_points_received: 120, trade_value_delta: 80, players_received: ['CeeDee Lamb'] },
      { roster_id: 2, ros_points_received: 40,  trade_value_delta: -80, players_received: ['Brandin Cooks', 'Noah Brown'] },
    ],
  }],
  topWaiver: { roster_id: 3, player_name: 'Puka Nacua', points_gained: 45.2 },
})

// Basic structure assertions
if (brief.week !== 5) fail(`week should be 5, got ${brief.week}`)
if (brief.season !== '2025') fail(`season should be 2025`)
if (brief.matchup_results.length !== 2) fail(`should have 2 matchup results`)

// Highest scorer should resolve to name
if (brief.awards.highest_scorer?.manager !== 'Love thy Naber') fail(`highest scorer should be Love thy Naber, got ${brief.awards.highest_scorer?.manager}`)

// Standings sorted by power rank
if (brief.standings[0].manager !== 'Picks Of Destiny') fail(`standings[0] should be Picks Of Destiny`)

// Standings movement: Picks moved up 1 (2→1), Love moved down 1 (1→2)
const picksMove = brief.standings_movement.find(m => m.manager === 'Picks Of Destiny')
const loveMove  = brief.standings_movement.find(m => m.manager === 'Love thy Naber')
if (!picksMove || picksMove.power_rank_change !== 1) fail(`Picks should have +1 power rank change, got ${picksMove?.power_rank_change}`)
if (!loveMove  || loveMove.power_rank_change  !== -1) fail(`Love should have -1 power rank change, got ${loveMove?.power_rank_change}`)

// Bench tax
if (brief.bench_tax?.manager !== 'Bijan al Gaib') fail(`bench_tax manager should be Bijan al Gaib`)
if (brief.bench_tax?.bench_tax !== 22.5) fail(`bench_tax should be 22.5`)

// Trades
if (brief.trades.length !== 1) fail(`should have 1 trade`)
if (brief.trades[0].robbery_score !== 80) fail(`robbery_score should be 80`)
if (brief.trades[0].sides[0].manager !== 'Picks Of Destiny') fail(`trade winner should be Picks Of Destiny`)

// Top waiver
if (brief.top_waiver?.player_name !== 'Puka Nacua') fail(`top_waiver should be Puka Nacua`)

// Verify JSON serialisable (no Map/Set in output)
const json = JSON.stringify(brief)
if (!json.includes('Picks Of Destiny')) fail('JSON should contain manager names')

if (passed) {
  console.log('PASS: week brief assembles correctly')
  console.log('  Matchup results:', brief.matchup_results.length)
  console.log('  Standings:', brief.standings.map(s => s.manager))
  console.log('  Movement:', brief.standings_movement)
  console.log('  Bench tax leader:', brief.bench_tax?.manager, brief.bench_tax?.bench_tax)
  console.log('  Trades this week:', brief.trades.length)
  console.log('  Top waiver:', brief.top_waiver?.player_name)
} else {
  process.exit(1)
}
