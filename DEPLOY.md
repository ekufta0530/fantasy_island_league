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

`vercel.json` configures 4 cron jobs:
- Daily 08:00 UTC: `/api/refresh-players` (NFL player cache)
- Tuesday 14:00 UTC: `/api/refresh` (full weekly data)
- Every 6h: `/api/refresh` (transaction poll)
- Tuesday 16:00 UTC: `/api/generate-recap` (AI recap)

Note: Vercel hobby tier supports only 1 cron/day. Upgrade to Pro or use the GitHub Actions fallback in `.github/workflows/refresh.yml`.

## GitHub Actions Secrets

If using the GitHub Actions fallback, set these repo secrets:
- `CRON_SECRET` — same value as Vercel env var
- `SITE_URL` — your deployed Vercel URL (e.g. `https://fantasy-island.vercel.app`)
