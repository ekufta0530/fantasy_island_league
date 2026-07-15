// app/rivalries/page.tsx
import { getRivalriesData } from '@/lib/stats/rivalries-data'
import { PageHeader } from '@/components/PageHeader'
import { EmptyState } from '@/components/EmptyState'
import { Avatar } from '@/components/Avatar'

export const metadata = { title: 'Rivalries' }

export const dynamic = 'force-dynamic'
export const revalidate = 3600

export default async function RivalriesPage() {
  let data
  try {
    data = await getRivalriesData()
  } catch (err) {
    return (
      <main className="min-h-screen px-4 py-10">
        <div className="max-w-5xl mx-auto">
          <EmptyState icon="🌊" title="Couldn't load rivalries" subtitle={String(err)} />
        </div>
      </main>
    )
  }

  const { managers, managerOrder, earliest_season, latest_season } = data

  function getRecord(rowUsername: string, colUsername: string) {
    const mgr = managers.find(m => m.username === rowUsername)
    return mgr?.vs.get(colUsername) ?? null
  }

  return (
    <main className="min-h-screen px-4 py-10">
      <div className="max-w-5xl mx-auto">
        <PageHeader
          eyebrow={earliest_season === latest_season ? earliest_season : `${earliest_season}–${latest_season}`}
          title="Rivalries"
          subtitle={`All-time head-to-head records. Sleeper data available from ${earliest_season} onward — pre-Sleeper seasons (Yahoo) aren't recoverable via API.`}
        />

        {/* H2H Grid */}
        <div className="overflow-x-auto rounded-2xl border border-hairline bg-surface">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-hairline">
                <th className="px-3 py-3 text-left text-muted font-semibold">Manager</th>
                {managers.map(col => (
                  <th key={col.username} className="px-2 py-3 text-center text-muted font-semibold min-w-20">
                    <div className="flex flex-col items-center gap-1">
                      <Avatar src={col.avatar_url} name={col.real_name} size="sm" />
                      <span className="truncate max-w-17.5">{col.real_name}</span>
                    </div>
                  </th>
                ))}
                <th className="px-3 py-3 text-center text-muted font-semibold">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline">
              {managers.map(row => {
                const totalWins = managerOrder.reduce((s, col) => col === row.username ? s : s + (getRecord(row.username, col)?.wins ?? 0), 0)
                const totalLosses = managerOrder.reduce((s, col) => col === row.username ? s : s + (getRecord(row.username, col)?.losses ?? 0), 0)
                return (
                  <tr key={row.username} className="hover:bg-surface-2 transition-colors">
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <Avatar src={row.avatar_url} name={row.real_name} size="sm" className="shrink-0" />
                        <div>
                          <p className="font-semibold text-ink truncate max-w-25">{row.display_name}</p>
                          <p className="text-faint text-[10px]">{row.real_name}</p>
                        </div>
                      </div>
                    </td>
                    {managerOrder.map(colUsername => {
                      if (colUsername === row.username) {
                        return <td key={colUsername} className="px-2 py-3 text-center text-faint font-bold">—</td>
                      }
                      const rec = getRecord(row.username, colUsername)
                      if (!rec) return <td key={colUsername} className="px-2 py-3 text-center text-faint">—</td>
                      const isWinning = rec.wins > rec.losses
                      const isLosing = rec.losses > rec.wins
                      return (
                        <td key={colUsername} className={`px-2 py-3 text-center font-mono font-bold ${isWinning ? 'text-lime-300' : isLosing ? 'text-rose-300' : 'text-muted'}`}>
                          {rec.wins}–{rec.losses}{rec.ties > 0 ? `–${rec.ties}` : ''}
                        </td>
                      )
                    })}
                    <td className={`px-3 py-3 text-center font-mono font-bold ${totalWins > totalLosses ? 'text-lime-300' : totalLosses > totalWins ? 'text-rose-300' : 'text-muted'}`}>
                      {totalWins}–{totalLosses}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  )
}
