-- nfl_players_cache: the big /players/nfl dump, refreshed daily
CREATE TABLE IF NOT EXISTS nfl_players_cache (
  player_id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- raw_matchups: one row per (league_id, week, roster_id)
CREATE TABLE IF NOT EXISTS raw_matchups (
  id BIGSERIAL PRIMARY KEY,
  league_id TEXT NOT NULL,
  season TEXT NOT NULL,
  week INTEGER NOT NULL,
  roster_id INTEGER NOT NULL,
  data JSONB NOT NULL,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(league_id, season, week, roster_id)
);

-- raw_transactions: one row per transaction
CREATE TABLE IF NOT EXISTS raw_transactions (
  transaction_id TEXT PRIMARY KEY,
  league_id TEXT NOT NULL,
  season TEXT NOT NULL,
  week INTEGER NOT NULL,
  type TEXT NOT NULL,
  data JSONB NOT NULL,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- raw_drafts: one row per draft pick
CREATE TABLE IF NOT EXISTS raw_drafts (
  id BIGSERIAL PRIMARY KEY,
  draft_id TEXT NOT NULL,
  league_id TEXT NOT NULL,
  season TEXT NOT NULL,
  pick_no INTEGER NOT NULL,
  roster_id INTEGER NOT NULL,
  player_id TEXT NOT NULL,
  data JSONB NOT NULL,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(draft_id, pick_no)
);

-- ai_recaps: immutable stored recaps, never overwritten
CREATE TABLE IF NOT EXISTS ai_recaps (
  id BIGSERIAL PRIMARY KEY,
  league_id TEXT NOT NULL,
  season TEXT NOT NULL,
  week INTEGER NOT NULL,
  recap_text TEXT NOT NULL,
  week_brief JSONB NOT NULL,  -- the structured JSON fed to the model
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(league_id, season, week)  -- enforce immutability at DB level
);
