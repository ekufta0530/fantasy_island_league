// lib/recap/generate.ts
import Anthropic from '@anthropic-ai/sdk'
import { WeekBrief } from './week-brief'
import { MANAGERS } from '../managers'
import { supabaseAdmin } from '../db/supabase'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

/** Build the system prompt injecting all 6 manager personas */
function buildSystemPrompt(): string {
  const personaLines = MANAGERS.map(m => {
    const teamDisplay = m.teamName ?? m.username
    return `- ${m.realName} (username: ${m.username}, team: "${teamDisplay}", NFL fan: ${m.nflTeam}): ${m.personaNotes}`
  }).join('\n')

  return `You are the slightly unhinged commissioner of a 6-person fantasy football league called "Fantasy Island." Your job is to write the weekly recap after all games are final.

TONE: Roast — not a report. Think group chat that does math. Be funny, specific, and good-natured. Lean into running jokes about these managers:

${personaLines}

RULES:
1. Write exactly 150–300 words. No more, no less.
2. Only use facts from the JSON week brief you are given. Do NOT invent stats, scores, or player names.
3. Mention every manager at least once across the season (not required every week — focus on the most interesting stories).
4. Use the stat categories by name when relevant: bench tax, power rank, luck index, trade grade, waiver wire ROI.
5. Reference managers by their real name or nickname, not their Sleeper username.
6. No disclaimers, no "as your commissioner," no sign-off — just the roast.`
}

/** Build the user message from the week brief */
function buildUserPrompt(brief: WeekBrief): string {
  return `Here is the week brief for Week ${brief.week}, ${brief.season} season. Write the weekly recap roast.

WEEK BRIEF:
${JSON.stringify(brief, null, 2)}`
}

export interface RecapResult {
  recap_text: string
  season: string
  week: number
  stored: boolean
}

/**
 * Check if a recap already exists for this season+week (immutability guard).
 */
export async function recapExists(leagueId: string, season: string, week: number): Promise<boolean> {
  try {
    const { data } = await supabaseAdmin
      .from('ai_recaps')
      .select('id')
      .eq('league_id', leagueId)
      .eq('season', season)
      .eq('week', week)
      .single()
    return !!data
  } catch {
    return false
  }
}

/**
 * Generate and store the weekly AI recap.
 * If a recap already exists for this week, returns the stored text (never regenerates).
 *
 * @param leagueId - Sleeper league ID
 * @param brief    - the assembled WeekBrief (no raw API data)
 * @returns RecapResult with recap_text and whether it was freshly stored
 */
export async function generateAndStoreRecap(
  leagueId: string,
  brief: WeekBrief
): Promise<RecapResult> {
  // Immutability check — return existing if already generated
  try {
    const { data: existing } = await supabaseAdmin
      .from('ai_recaps')
      .select('recap_text')
      .eq('league_id', leagueId)
      .eq('season', brief.season)
      .eq('week', brief.week)
      .single()
    if (existing?.recap_text) {
      return { recap_text: existing.recap_text, season: brief.season, week: brief.week, stored: false }
    }
  } catch { /* no existing recap — proceed to generate */ }

  // Generate via Claude
  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 600,
    system: buildSystemPrompt(),
    messages: [{ role: 'user', content: buildUserPrompt(brief) }],
  })

  const recap_text = message.content
    .filter(block => block.type === 'text')
    .map(block => (block as { type: 'text'; text: string }).text)
    .join('')
    .trim()

  // Store immutably
  await supabaseAdmin.from('ai_recaps').insert({
    league_id: leagueId,
    season: brief.season,
    week: brief.week,
    recap_text,
    week_brief: brief as unknown as Record<string, unknown>,
  })

  return { recap_text, season: brief.season, week: brief.week, stored: true }
}

/**
 * Fetch a stored recap for a specific week. Returns null if not found.
 */
export async function getStoredRecap(
  leagueId: string,
  season: string,
  week: number
): Promise<{ recap_text: string; generated_at: string } | null> {
  try {
    const { data } = await supabaseAdmin
      .from('ai_recaps')
      .select('recap_text, generated_at')
      .eq('league_id', leagueId)
      .eq('season', season)
      .eq('week', week)
      .single()
    return data ?? null
  } catch {
    return null
  }
}

/**
 * Fetch all stored recaps for a league, most recent first.
 */
export async function getAllStoredRecaps(leagueId: string): Promise<Array<{ season: string; week: number; recap_text: string; generated_at: string }>> {
  try {
    const { data } = await supabaseAdmin
      .from('ai_recaps')
      .select('season, week, recap_text, generated_at')
      .eq('league_id', leagueId)
      .order('season', { ascending: false })
      .order('week', { ascending: false })
    return data ?? []
  } catch {
    return []
  }
}
