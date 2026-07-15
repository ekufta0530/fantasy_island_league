# Fantasy Island — League Roast HQ

A stats site for a 6-person Sleeper fantasy football friend league that surfaces the stuff ESPN/Yahoo never show you: who choked by benching their best player, who's been drafting like a genius (or a clown), who fleeced a buddy in a trade, and a weekly AI-generated recap that roasts the week with attitude.

Built with Next.js (App Router), Supabase (Postgres), and the Anthropic API.

---

## Environment Variables

Copy `.env.local.example` to `.env.local` and fill in your values:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
ANTHROPIC_API_KEY=your-anthropic-key
CRON_SECRET=your-secret-token   # used to authenticate /api/refresh and /api/refresh-players
```

---

## Running Locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Database Schema

Apply `lib/db/schema.sql` against your Supabase project:

1. Open the Supabase dashboard → SQL Editor
2. Paste the contents of `lib/db/schema.sql`
3. Run

Or via the Supabase CLI:

```bash
supabase db push
```

---

## Scheduled Refreshes

Data is kept fresh via Vercel Cron Jobs (`vercel.json`) with a GitHub Actions fallback (`.github/workflows/refresh.yml`).

| Schedule | Endpoint | Purpose |
|---|---|---|
| `0 8 * * *` — daily 8:00 UTC | `/api/refresh-players` | Rebuild NFL players cache (gated by `isNFLPlayersCacheFresh`) |
| `0 14 * * 2` — Tuesday 14:00 UTC | `/api/refresh` | Full weekly refresh after MNF final stats + waivers |
| `0 */6 * * *` — every 6 hours | `/api/refresh` | Transaction poll to keep the Trades page current |

> **Note:** Vercel Hobby tier limits crons to once per day. The 6-hour transaction poll relies on the GitHub Actions fallback for sub-daily frequency.

### GitHub Actions Secrets Required

| Secret | Value |
|---|---|
| `CRON_SECRET` | Same token as `CRON_SECRET` in your Vercel env vars |
| `SITE_URL` | Your deployed URL, e.g. `https://fantasy-island.vercel.app` |

Both secrets are set in **GitHub → Settings → Secrets and variables → Actions**.

---

## Tech Stack

- **Framework:** Next.js 15 (App Router)
- **Database:** Supabase (Postgres)
- **AI Recap:** Anthropic Claude
- **Data Source:** Sleeper API (no auth required for public league data)
- **Deployment:** Vercel
