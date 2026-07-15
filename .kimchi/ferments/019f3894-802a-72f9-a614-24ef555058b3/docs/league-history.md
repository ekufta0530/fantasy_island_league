# Fantasy Island — League History Chain

Discovered by walking `previous_league_id` from `CURRENT_LEAGUE_ID` (`1229514714120204288`) backward via live Sleeper API calls on 2026-07-06.

## Chain Walk Method

Starting from the current league, repeatedly fetch `GET https://api.sleeper.app/v1/league/{id}` and follow `previous_league_id` until the field is `null`.

## Seasons Found

| Season | League ID            | Name             | Status   | previous_league_id   |
|--------|----------------------|------------------|----------|----------------------|
| 2024   | 1125843202461839360  | Fantasy Island   | complete | *(none — oldest)*    |
| 2025   | 1229514714120204288  | Fantasy Island   | complete | 1125843202461839360  |

**Total seasons available:** 2

## Notes

- **Oldest season on Sleeper:** 2024 (league ID `1125843202461839360`). `previous_league_id` is `null`, meaning no data exists before this season in the Sleeper system. Earlier seasons (if the league pre-dates Sleeper) are not accessible.
- **Rivalries page boundary:** All head-to-head history available for the Rivalries page begins with the 2024 season. Any UI copy referencing "all-time" records should note this is Sleeper-era data only (2024–present).
- **Current season:** 2025 (`1229514714120204288`) is `status: complete`, meaning full matchup history is available for both seasons.

## Chain Discovery Commands Used

```bash
# 2025 (current)
curl -s 'https://api.sleeper.app/v1/league/1229514714120204288' \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('league_id'), d.get('season'), d.get('name'), d.get('previous_league_id'))"
# → 1229514714120204288  2025  Fantasy Island   1125843202461839360

# 2024 (oldest — previous_league_id is None)
curl -s 'https://api.sleeper.app/v1/league/1125843202461839360' \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('league_id'), d.get('season'), d.get('name'), d.get('previous_league_id'))"
# → 1125843202461839360  2024  Fantasy Island   None
```

## API Endpoint

`GET /api/debug/history` — returns the full chain as JSON:

```json
{
  "ok": true,
  "count": 2,
  "seasons": [
    { "league_id": "1125843202461839360", "season": "2024", "name": "Fantasy Island", "status": "complete" },
    { "league_id": "1229514714120204288", "season": "2025", "name": "Fantasy Island", "status": "complete" }
  ]
}
```
