// app/rivalries/page.tsx
import { getRivalriesData } from '@/lib/stats/rivalries-data'

export const metadata = { title: 'Rivalries' }

export const dynamic = 'force-dynamic'
export const revalidate = 3600

export default async function RivalriesPage() {
  let data
  try {
    data = await getRivalriesData()
  } catch (err) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <p className="text-gray-400">⚠️ {String(err)}</p>
      </div>
    )
  }

  const { managers, managerOrder, earliest_season, latest_season } = data

  function getRecord(rowUsername: string, colUsername: string) {
    const mgr = managers.find(m => m.username === rowUsername)
    return mgr?.vs.get(colUsername) ?? null
  }

  return (
    <main className="min-h-screen bg-gray-950 text-white px-4 py-8">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-4xl font-black mb-1 tracking-tight">⚔️ Rivalries</h1>
        <p className="text-gray-400 text-sm mb-2">
          All-time head-to-head records — {earliest_season === latest_season ? earliest_season : `${earliest_season}–${latest_season}`} season{earliest_season !== latest_season ? 's' : ''}.
        </p>
        <p className="text-gray-600 text-xs mb-8">
          ⚠️ Sleeper data available from {earliest_season} onward. Pre-Sleeper seasons (Yahoo) are not recoverable via API.
        </p>

        {/* H2H Grid */}
        <div className="overflow-x-auto rounded-xl border border-gray-800">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-900">
                <th className="px-3 py-3 text-left text-gray-400 font-semibold">Manager</th>
                {managers.map(col => (
                  <th key={col.username} className="px-2 py-3 text-center text-gray-400 font-semibold min-w-[80px]">
                    <div className="flex flex-col items-center gap-1">
                      {col.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={col.avatar_url} alt="" className="w-6 h-6 rounded-full bg-gray-700" />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-[10px] font-bold text-white">
                          {col.real_name[0]}
                        </div>
                      )}
                      <span className="truncate max-w-[70px]">{col.real_name}</span>
                    </div>
                  </th>
                ))}
                <th className="px-3 py-3 text-center text-gray-400 font-semibold">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {managers.map(row => {
                const totalWins = managerOrder.reduce((s, col) => col === row.username ? s : s + (getRecord(row.username, col)?.wins ?? 0), 0)
                const totalLosses = managerOrder.reduce((s, col) => col === row.username ? s : s + (getRecord(row.username, col)?.losses ?? 0), 0)
                return (
                  <tr key={row.username} className="hover:bg-gray-900 transition-colors">
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        {row.avatar_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={row.avatar_url} alt="" className="w-7 h-7 rounded-full bg-gray-700 shrink-0" />
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white shrink-0">
                            {row.real_name[0]}
                          </div>
                        )}
                        <div>
                          <p className="font-semibold text-white truncate max-w-[100px]">{row.display_name}</p>
                          <p className="text-gray-500 text-[10px]">{row.real_name}</p>
                        </div>
                      </div>
                    </td>
                    {managerOrder.map(colUsername => {
                      if (colUsername === row.username) {
                        return <td key={colUsername} className="px-2 py-3 text-center text-gray-700 font-bold">—</td>
                      }
                      const rec = getRecord(row.username, colUsername)
                      if (!rec) return <td key={colUsername} className="px-2 py-3 text-center text-gray-700">—</td>
                      const isWinning = rec.wins > rec.losses
                      const isLosing = rec.losses > rec.wins
                      return (
                        <td key={colUsername} className={`px-2 py-3 text-center font-mono font-bold ${isWinning ? 'text-green-400' : isLosing ? 'text-red-400' : 'text-gray-400'}`}>
                          {rec.wins}–{rec.losses}{rec.ties > 0 ? `–${rec.ties}` : ''}
                        </td>
                      )
                    })}
                    <td className={`px-3 py-3 text-center font-mono font-bold ${totalWins > totalLosses ? 'text-green-400' : totalLosses > totalWins ? 'text-red-400' : 'text-gray-400'}`}>
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
