# Deployment

## Prerequisites
- Vercel account (free tier works)
- Supabase project (free tier) — run `lib/db/schema.sql` against it
- Anthropic API key (for recap generation)

## Environment Variables

Set these in Vercel project settings → Environment Variables:

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (for server-side writes) |
| `ANTHROPIC_API_KEY` | Anthropic API key for recap generation |
| `CRON_SECRET` | Random secret string to protect /api/refresh endpoints |

## Initial Data Seed

After deploying, trigger the first data refresh manually:
```
curl -H "Authorization: Bearer YOUR_CRON_SECRET" https://your-app.vercel.app/api/refresh
```

## Cron Jobs

`vercel.json` configures 3 cron jobs (Hobby tier allows at most 1 run/day per cron, so anything more frequent must run via GitHub Actions instead):
- Daily 08:00 UTC: `/api/refresh-players` (NFL player cache)
- Tuesday 14:00 UTC: `/api/refresh` (full weekly data)
- Tuesday 16:00 UTC: `/api/generate-recap` (AI recap)

The transaction poll needs to run every 6h, which exceeds the Hobby limit — it runs exclusively via the GitHub Actions fallback in `.github/workflows/refresh.yml` (also duplicates the two jobs above as a backup). Upgrade to Pro if you'd rather run all crons through Vercel.

## GitHub Actions Secrets

Required for the every-6h transaction poll (and used as a fallback for the other two jobs), set these repo secrets:
- `CRON_SECRET` — same value as Vercel env var
- `SITE_URL` — your deployed Vercel URL (e.g. `https://fantasy-island.vercel.app`)
