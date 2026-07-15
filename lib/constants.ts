export const CURRENT_LEAGUE_ID = '1229514714120204288'
export const SLEEPER_BASE_URL = 'https://api.sleeper.app/v1'

// Cron secret to protect /api/refresh from public abuse
export const CRON_SECRET = process.env.CRON_SECRET ?? ''
