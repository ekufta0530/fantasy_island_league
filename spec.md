# League Roast HQ — Fantasy Football League Site Spec

**League:** Sleeper League ID `1229514714120204288` (current season, 6 teams, friends league, comedic tone)
**Previous season League ID:** `1125843202461839360` (accessible via `previous_league_id` chain — likely continues further back; league is believed to be ~8-9 years old, with earlier seasons on Yahoo and not recoverable via Sleeper API. Pull the `previous_league_id` chain back as far as it goes for historical Hall of Fame data, but don't expect it to reach all the way to year 1.)
**Purpose of this doc:** Hand this to a coding agent (Claude Code, Cursor, etc.) as the full spec. It defines scope, data sources, exact stat formulas, pages, and an MVP-first build order.

## 0. The Six Managers

Seed this as static config (not derived from the API) since it's the source of truth for personas, nicknames, and running jokes used in the AI recap (§6) and team pages (§7.4). Match by Sleeper `username`/`display_name` from `/league/{league_id}/users`.

| Sleeper username | Team name | Real name | Persona notes for AI recap flavor |
|---|---|---|---|
| `TheIrishRover` | 6 Million $ Man | Victor | Broncos fan. Moved to Ireland a few years back. Whiskey guy. |
| `kirkendc` | Rookie Time | Chris | Broncos fan. Runs his own catering business. Oldest of the group — "wisdom of the elder" jokes fair game. |
| `lozintheredzone` | (no team name — display as "lozintheredzone" / Liz) | Liz | Mike's girlfriend. Running joke: her lineup decisions suspiciously mirror Mike's advice. |
| `MHodnett` | Bijan al Gaib | Mike | Broncos fan. Former commissioner of the league pre-2024. Whiskey + gambling guy. |
| `keinholz` | Love thy Naber | Kurt | Giants fan. Wins a lot — running joke is the rest of the league metagames against him / roots for his losses. (Confirm each season whether this is still deserved before leaning on it too hard.) |
| `kufta` | Picks Of Destiny | Eric (site owner) | Lions fan. Won the league last season for the first time ever, after ~8-9 years of not winning. |

Notes for the build:
- Only Liz has no custom team name in Sleeper — render her by display name/username rather than a blank team name field; don't leave a UI hole.
- All personas above are seed flavor text for the AI recap prompt (§6) and optional team-page bios — keep them editable in one config file/table, not hardcoded into logic, since nicknames and jokes will drift season to season.
- Broncos/Giants/Lions fandom is good fodder for recap jokes when those real NFL teams' players show up on a manager's fantasy roster or opponents' rosters (e.g., a Broncos player torching Kurt's team).

---

## 1. Vision

A stats site for a 6-person friend league that surfaces the stuff Sleeper/ESPN/Yahoo never show you: who choked by benching their best player, who's been drafting like a genius (or a clown), who fleeced a buddy in a trade, and a weekly AI-generated "recap with attitude" that roasts/celebrates the week. Tone is a **roast, not a report** — think a group chat that does math.

Read-only. No auth needed for MVP (Sleeper league data is public via league ID). No fantasy-money, no gambling angle.

## 2. Prior Art / Inspiration (researched)

- **fantasy-football-wrapped** (kt474, ~30k users) — Vue app pulling Sleeper data: power rankings, playoff odds, weekly reports, draft analysis, season recaps, AI-generated league news. Validates the general shape of this project; we differentiate on the "friend-group roast" stat categories (worst sit/start, trade fleece score) that generic tools don't foreground.
- **fantasy-football-metrics-weekly-report** — CLI tool generating PDF/Slack/GroupMe/Discord weekly reports across platforms including Sleeper. Good reference for report *content* (coaching efficiency = our sit/start score, power rankings, luck index) even though it's not Sleeper-native.
- **ESPN power-ranking generators** (power_ranker, espn-ff-power-rankings) — good reference for "dominance score" style power rankings blending roster strength + record + recent performance + margin of victory, and for auto-publishing to a static site / email.
- **fantasy-football-metrics-weekly-report** and others push output to Slack/Discord/GroupMe — worth stealing for our "post weekly recap to group chat" feature.

Common gaps in these tools that this spec explicitly fills: (1) a **sit/start "bench tax" leaderboard**, (2) a **trade grade / fleece index**, (3) a **draft ROI grade using actual full-season output vs draft capital spent**, (4) a **personality-driven weekly AI recap**, all built for a small friend group with inside jokes rather than generic "league of 12 strangers" framing.

## 3. Data Source: Sleeper API

Base URL: `https://api.sleeper.app/v1/`. No API key. Rate limit ~1000 req/min — cache aggressively anyway, don't hit this live per pageview.

Key endpoints we need:

| Purpose | Endpoint |
|---|---|
| League metadata (settings, scoring, roster positions) | `GET /league/{league_id}` |
| Rosters (owner->roster mapping, player IDs on roster) | `GET /league/{league_id}/rosters` |
| Users in league (display names, avatars, team names) | `GET /league/{league_id}/users` |
| Matchups for a week (starters, points, bench) | `GET /league/{league_id}/matchups/{week}` |
| Transactions (waivers, free agency, trades) per week | `GET /league/{league_id}/transactions/{round}` |
| Traded picks | `GET /league/{league_id}/traded_picks` |
| Playoff bracket | `GET /league/{league_id}/winners_bracket`, `/losers_bracket` |
| Draft ID(s) for league | `GET /league/{league_id}/drafts` |
| Draft picks | `GET /draft/{draft_id}/picks` |
| Draft traded picks | `GET /draft/{draft_id}/traded_picks` |
| All NFL players (huge, ~5MB) | `GET /players/nfl` — **fetch at most once/day**, cache to disk/DB |
| Weekly stats for all players (actual points scored, any scoring format) | `GET /stats/nfl/regular/{season}/{week}` (via `players/nfl/stats` pattern — confirm exact path at build time, see §3.1) |
| NFL state (current week/season) | `GET /state/nfl` |
| League history (previous seasons, if this league rolled over via `previous_league_id`) | `GET /league/{previous_league_id}` recursively |

### 3.1 Important build-time verification
The stats/projections endpoint path has shifted across Sleeper API doc versions in the wild (`/stats/nfl/{season}/{week}` vs `/stats/nfl/regular/{season}/{week}` vs a `players/nfl/stats/regular/{season}/{week}` form). **First implementation task: hit the live docs at https://docs.sleeper.com/ and confirm the exact current path and response shape before building the optimal-lineup and player-scoring features**, since this is the one endpoint everything else in §5 depends on.

### 3.2 Data model notes
- Player objects keyed by `player_id` (string) everywhere — matchups, rosters, stats. Cross-reference against the `/players/nfl` dump for name/position/team.
- `roster_id` (per-league integer) is distinct from `user_id` (global Sleeper account) and `owner_id`. Rosters map `owner_id -> roster_id`; users map `user_id -> display_name/avatar/team_name (metadata)`. Build one `roster_id -> friend` lookup once and reuse everywhere.
- Matchup objects include `starters` (array of player_ids in starting slots, in slot order), `players` (full roster incl. bench that week), and `players_points` (map of player_id -> points that week). This is enough to compute optimal lineup without needing the separate stats endpoint for *most* things — but the stats endpoint is still needed for waiver-wire "who was on the wire and would've helped" comparisons.
- Transactions have `type` (`trade`, `waiver`, `free_agent`), `adds`/`drops` (player_id -> roster_id), and for trades, `draft_picks` and `waiver_budget` moved. This is the backbone of the trade grade feature.

## 4. Tech Stack Recommendation

Keep it simple — this is a friend-league toy, not a SaaS product.

- **Frontend + light backend:** Next.js (App Router), deployed on Vercel free tier. Static-ish site with API routes doing the Sleeper fetch/cache.
- **Data fetching:** Server-side fetch from Sleeper on a schedule (see §8), not client-side, so all 6 friends load a fast prebuilt page instead of hammering Sleeper live.
- **Storage:** Start with a single SQLite file (or Vercel KV / Postgres via Supabase free tier) storing: raw weekly snapshots, computed stat tables, and generated AI recaps. Avoids recomputing historical weeks every load.
- **Scheduling:** Vercel Cron (or a GitHub Action on a schedule) hitting an internal `/api/refresh` route weekly during the season (see §8) and once after Tuesday-morning waivers process.
- **AI summary generation:** Claude API (Sonnet-class model) called server-side, fed structured JSON of the week's stat outputs (not raw API dumps) so it writes from clean facts, not by inventing numbers. Store the output text so it's not regenerated (and doesn't drift) once written.
- **Styling:** Tailwind. Keep it fun — team avatars, emoji, a "Hall of Shame" trophy case aesthetic. This is a joke site for 6 people, lean into bold/playful design over corporate-dashboard vibes.

Alternative if the person wants zero backend: static site generated by a script run manually/weekly (GitHub Action) that commits computed JSON, deployed to GitHub Pages/Netlify. Simpler ops, less "always fresh," fine for a 6-person league. **Decision needed from user — see Open Questions.**

## 5. Core Stat Definitions (the fun stuff)

Each of these needs an exact formula so the coding agent doesn't have to guess. All are computed **per team (roster_id)** unless noted, and rolled up into season-long leaderboards plus weekly "this week's award" call-outs.

### 5.1 Sit/Start "Bench Tax" — worst lineup decisions
For every completed week and every roster:
1. Take that roster's full player pool for the week (`players` array in the matchup object — starters + bench).
2. Using each player's actual points scored that week (`players_points`) and the league's roster slot requirements (from league settings: e.g. 1 QB / 2 RB / 2 WR / 1 TE / 1 FLEX / etc.), compute the **optimal lineup**: the highest-scoring valid combination of that roster's players given slot eligibility (FLEX = RB/WR/TE, SUPERFLEX = +QB, etc.).
   - This is a small assignment/knapsack problem — solve greedily by sorting eligible players per slot by points descending and filling highest-value slots first (standard "maximize sum subject to position eligibility" — for 6-team, ~9-15 roster spots, brute-force/greedy is more than fast enough, no need for the Hungarian algorithm).
3. `bench_tax = optimal_lineup_points - actual_lineup_points` for that week.
4. **Leaderboards:**
   - *Worst single-week sit/start decision*: highest single-week `bench_tax`, with the specific "started X (y pts) over Z (w pts)" swap called out by name.
   - *Season "Captain Bench" award*: highest cumulative `bench_tax` across all weeks.
   - *Best lineup setter*: lowest cumulative `bench_tax` (someone who consistently starts their actual best players).
5. Also surface a fun derivative: **"points left in the tank"** — total points every manager left on their bench across the season, shown as a bar chart.

### 5.2 Draft Grade — who's drafting best
Uses draft pick data + full-season (or to-date) fantasy points per player.
1. Pull draft picks (`pick_no`, `player_id`, `roster_id`/owner) from the draft endpoint.
2. For every drafted player, sum their **actual fantasy points scored for the whole season** (regardless of which team currently owns them — this measures draft skill, not roster management; note that separately from trade grade in §5.3 so the two don't double-count credit/blame).
3. Compute **expected points by draft slot**: rank all drafted players by season points descending, and compare each player's actual finish rank to their draft pick number. `value_over_pick = (draft_pick_number - actual_finish_rank)`. Positive means the pick outperformed its slot (steal), negative means it underperformed (bust).
4. Per-roster **Draft Grade Score** = sum of `value_over_pick` across all of that manager's original picks. Normalize to a letter grade (A+ through F) via simple percentile buckets across the 6 managers, or just rank 1-6 — a 6-team scale doesn't need many buckets.
5. Leaderboards: **Best Drafter** (highest cumulative value_over_pick), **Draft Steal of the Year** (single biggest positive value_over_pick), **Draft Bust of the Year** (single most negative), and **Reach of the Year** (earliest pick, lowest finish — same metric, framed differently for flavor).
6. Late-round/undrafted gem callout: best undrafted free agent added, compared against the worst pick in that same draft round for a "you could've had this guy for free" joke.

### 5.3 Trade Grade — who makes the worst trades
Uses `transactions` where `type == "trade"`.
1. For each trade, identify the players/picks each side gave and received.
2. For **already-completed player trades**, compute rest-of-season fantasy points scored by each traded player *after* the trade date, for the side that received them. Sum per side.
3. `trade_value_delta_for_manager = points_received_side - points_given_up_side` (each manager evaluated from their own side of the same trade).
4. For traded **draft picks**, evaluate once that pick has actually been used (or once the following draft happens) by comparing what was drafted with it vs. a league-average pick-value baseline (simple proxy: value_over_pick from §5.2 for whichever player was taken with the traded pick).
5. Leaderboards: **Trade King** (highest cumulative trade_value_delta), **Fleeced** (most negative), and a **"Robbery of the Year"** single-trade callout showing both sides' names and final tally, worded for max friend-group roasting ("Mike got 4 points of value for giving away a top-12 WR").
6. Handle incomplete trades gracefully — a trade made in Week 10 of the current season only has a partial sample; label these "in progress" and don't let them dominate season-long leaderboards until the season's over (weight by games-since-trade, or just footnote it).

### 5.4 Waiver Wire Report Card
Uses `transactions` where `type` is `waiver` or `free_agent`, plus `waiver_budget` spent if the league uses FAAB (check league settings).
1. For each add, track points scored by that player for the acquiring roster from add-date to drop-date (or season end).
2. `waiver_roi = points_gained / faab_spent` (or just raw points_gained if the league uses priority waivers, not FAAB — check `league.settings.waiver_type`).
3. Leaderboards: **Waiver Wire Wizard** (best ROI or most total points added via waivers), **Money Down the Drain** (worst spend-to-production ratio, FAAB leagues only).

### 5.5 Weekly Awards (auto-generated every week)
A small fixed set of "this week's headlines," computed fresh each week and displayed on a "This Week" page + fed into the AI recap:
- Highest score, lowest score
- Biggest blowout (largest margin), closest nail-biter (smallest margin)
- This week's Bench Tax leader (see 5.1)
- "Should've Won" — team with the highest score across the league that still lost their matchup (bad luck), and its inverse "Should've Lost" (lowest score that still won)
- Any trade or notable waiver move that week, pulled into the recap narrative

### 5.6 Power Rankings
Blend of record, points-for, and recency, computed weekly. Suggested formula (tune weights once real data is available):
`power_score = 0.5 * win_pct + 0.3 * normalized_points_for + 0.2 * normalized_last_3_weeks_points_for`
Normalize points-for by dividing each team's value by the league max for that category, so all three terms are on a 0-1 scale before weighting. This is intentionally simple/transparent rather than a black box — the friend group should be able to see *why* someone is ranked where they are (good for arguments).

### 5.7 Luck Index
Compare actual win/loss record to record if the team had instead played every other team's actual score every week ("all-play" record). `luck = actual_wins - all_play_expected_wins`. Surfaces the "your schedule is why you're 6-1, not your team" argument, which is prime friend-league bait.

### 5.8 Head-to-Head / Rivalry Records
All-time (and this-season) W-L for every pairing of the 6 managers, plus combined points scored in games between them. Useful for a "Rivalries" page. Previous season league ID (`1125843202461839360`) is confirmed available — walk the `previous_league_id` chain from there as far back as it goes to build permanent bragging-rights history; note in the UI once you hit the edge of Sleeper-available history (pre-Sleeper/Yahoo years aren't recoverable via API).

## 6. AI Weekly Recap

**Goal:** a short, funny, personality-driven recap posted after each week's games finalize (Tuesday morning, once Sleeper stats settle).

**Design:**
1. After weekly stats compute (§8 schedule), assemble a compact JSON "week brief" containing only computed facts: scores, matchup results, this week's bench tax leader + the specific swap, any trades/waiver moves that week, standings deltas, and 1-2 season-long leaderboard changes. Do **not** hand the model raw API dumps — keep the prompt small, structured, and fact-checked by your own code so it can't hallucinate stats.
2. System/prompt instructions: write in the voice of a slightly unhinged league commissioner who loves roasting friends but keeps it good-natured; reference the specific stat categories from §5 by name; 150-300 words; must mention every manager at least once across the season (not necessarily every week) so nobody feels ignored; no invented stats — only use what's in the JSON brief.
3. Store the generated text (with the week/season as key) so it's never silently regenerated/changed after posting — treat it like a published article.
4. Give each of the 6 friends a stored "nickname" and persona field (seeded from §0 above) that gets included in the prompt context so the recap can call back to running bits ("per usual, Mike's whiskey-fueled waiver pickup didn't pan out" or "Kurt won again, the league weeps").
5. **Stretch:** auto-post the recap to the league's group chat (Discord/GroupMe/Slack — check what Sleeper league or the friend group actually uses) via a webhook once generated.

## 7. Site Map / Pages

1. **Home / This Week** — current week's scores, weekly awards (§5.5), AI recap for the latest completed week.
2. **Standings** — record, points for/against, power ranking (§5.6), luck index (§5.7).
3. **Hall of Shame / Fame** — season-long leaderboards: Bench Tax leaderboard, Draft Grades, Trade Grades, Waiver Report Card. This is the marquee page — make it visually fun (trophy/skull icons, per-manager award counts).
4. **Team pages** (one per manager) — their roster, their personal stats across every category above, their nickname/persona, head-to-head record vs. each other manager.
5. **Draft Recap** — the season's draft board annotated with steal/bust grades (§5.2).
6. **Trades** — full trade history with computed grades and the "Robbery of the Year" callout.
7. **Rivalries** — head-to-head grid (§5.8), all-time if history is available.
8. **Archive** — past AI weekly recaps, browsable by week.

## 8. Refresh / Compute Schedule

- **Daily (off-season and in-season):** refresh `/players/nfl` cache (per Sleeper's own guidance, at most once/day).
- **In-season, Tue morning (after MNF final stats + waivers process):** pull latest week's matchups/stats, compute all §5 stats for the newly-completed week, generate & store that week's AI recap.
- **In-season, on-demand:** trade/waiver transaction pull can run more frequently (e.g. every few hours) so the Trades page feels current, since transactions aren't tied to game-day timing.
- **Off-season:** weekly compute jobs pause; site serves the prior season's final Hall of Shame plus draft prep content for the next draft once Sleeper opens it.

## 9. Nice-to-Have / Stretch Ideas (post-MVP)

- Manager "personality" pages with auto-generated season-long roast bios built from their stat profile (high bench tax + bad trades = different bio than low bench tax + great drafting).
- Slack/Discord bot that responds to `/roast @manager` with an on-demand pull of that manager's worst stat.
- Championship belt / punishment tracker for last place (customizable text field for whatever the league's loser punishment is).
- Simple playoff odds simulator (Monte Carlo over remaining schedule using each team's season points-for distribution).
- "Group therapy" mode: a page showing whose fault the bench tax/trade losses actually were, in receipts form, for use in arguments.

## 10. Open Questions for You (resolve before/at the start of the build)

1. **Hosting/backend preference:** always-on Next.js + DB (fresher, more moving parts) vs. static site rebuilt weekly via GitHub Action (simpler, "good enough" for 6 people)? Recommendation above assumes the former but the latter is genuinely fine here.
2. **Where does the AI recap get posted**, if anywhere besides the site itself — Discord/GroupMe/iMessage/Slack? Determines whether a webhook integration is in scope for MVP.
3. **League scoring format specifics** (PPR/half-PPR/superflex/etc.) — needed to get optimal-lineup math and slot eligibility exactly right; pull from `league.settings`/`league.roster_positions` at build time rather than assuming.
4. ~~Does this league have prior seasons on Sleeper?~~ **Resolved:** yes — previous season league ID `1125843202461839360` confirmed, chain further back via `previous_league_id` where it exists. Pre-Sleeper (Yahoo) history is out of scope unless the user wants to manually backfill a few marquee facts (all-time champs list, etc.) as static config.
5. ~~Manager nicknames/personas~~ **Resolved:** seeded in §0 above. Keep editable in config since jokes evolve season to season.
6. **Domain/access** — private link shared with the 5 friends, or fine being public on the open internet (since Sleeper data itself is public anyway)?

## 11. Suggested Build Order (MVP first)

1. Sleeper client + caching layer (league, rosters, users, matchups, players, transactions, draft). Verify the stats endpoint path (§3.1) first thing.
2. Standings + Power Rankings + Luck Index (all computable from matchups alone — no stats endpoint dependency, fastest path to something on-screen).
3. Bench Tax / optimal lineup engine (§5.1) — the signature feature, do this next.
4. Draft Grade (§5.2) and Trade Grade (§5.3) — these two share the "player season points" lookup, build that lookup once and reuse.
5. Weekly Awards page (§5.5) — mostly a repackaging of data already computed above.
6. AI recap generation (§6) — wire up last since it depends on all the structured stat outputs existing first.
7. Waiver Report Card, Rivalries, Team pages, Draft Recap page, Archive — polish pass.
