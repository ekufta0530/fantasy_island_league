// app/bench-tax/page.tsx
import { getBenchTaxData } from '@/lib/stats/bench-tax-data'

export const metadata = { title: 'Bench Tax' }

export const dynamic = 'force-dynamic'
export const revalidate = 300

export default async function BenchTaxPage() {
  let data
  try {
    data = await getBenchTaxData()
  } catch (err) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <p className="text-gray-400">⚠️ {String(err)}</p>
      </div>
    )
  }

  const { leaderboard, best_setter, season_worst } = data

  return (
    <main className="min-h-screen bg-gray-950 text-white px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-black mb-1 tracking-tight">🪑 Bench Tax</h1>
        <p className="text-gray-400 text-sm mb-8">
          Points left on the bench by starting the wrong players. Higher = worse decisions.
        </p>

        {/* Season worst callout */}
        {season_worst.bench_tax > 0 && (
          <div className="bg-red-950 border border-red-800 rounded-xl p-5 mb-8">
            <p className="text-red-400 text-xs uppercase tracking-wider mb-1">💀 Worst Lineup Decision of the Season</p>
            <p className="text-white font-bold text-lg">{season_worst.display_name} — Week {season_worst.week}</p>
            <p className="text-red-300 mt-1">{season_worst.swap_label}</p>
            <p className="text-red-400 font-mono font-bold mt-1">+{season_worst.bench_tax.toFixed(2)} pts left on bench</p>
          </div>
        )}

        {/* Leaderboard table */}
        <div className="rounded-xl border border-gray-800 overflow-hidden mb-8">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-900 text-gray-400 uppercase text-xs tracking-wider">
                <th className="px-4 py-3 text-left">Manager</th>
                <th className="px-4 py-3 text-right">Total Tax</th>
                <th className="px-4 py-3 text-right">Avg/Week</th>
                <th className="px-4 py-3 text-right">Worst Week</th>
                <th className="px-4 py-3 text-left hidden lg:table-cell">Worst Swap</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {leaderboard.map((row, i) => (
                <tr key={row.roster_id} className={`hover:bg-gray-900 transition-colors ${i === 0 ? 'bg-red-950/30' : ''} ${row.roster_id === best_setter.roster_id ? 'bg-green-950/20' : ''}`}>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      {row.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={row.avatar_url} alt="" className="w-8 h-8 rounded-full bg-gray-700" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center font-bold text-xs text-white">
                          {row.real_name[0]}
                        </div>
                      )}
                      <div>
                        <p className="font-semibold text-white">{row.display_name}</p>
                        <p className="text-gray-500 text-xs">{row.real_name}</p>
                      </div>
                      {i === 0 && <span className="ml-2 text-xs bg-red-900 text-red-300 px-2 py-0.5 rounded-full">Captain Bench 🪑</span>}
                      {row.roster_id === best_setter.roster_id && i !== 0 && <span className="ml-2 text-xs bg-green-900 text-green-300 px-2 py-0.5 rounded-full">Best Setter ✅</span>}
                    </div>
                  </td>
                  <td className={`px-4 py-4 text-right font-mono font-bold ${i === 0 ? 'text-red-400' : 'text-gray-300'}`}>
                    {row.total_bench_tax.toFixed(2)}
                  </td>
                  <td className="px-4 py-4 text-right font-mono text-gray-400">
                    {row.avg_bench_tax.toFixed(2)}
                  </td>
                  <td className="px-4 py-4 text-right">
                    <span className="font-mono text-orange-400">{row.worst_week_bench_tax.toFixed(2)}</span>
                    <span className="text-gray-500 text-xs ml-1">Wk{row.worst_week}</span>
                  </td>
                  <td className="px-4 py-4 text-gray-400 text-xs hidden lg:table-cell max-w-xs truncate">
                    {row.worst_swap_label}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {leaderboard.length === 0 && (
          <p className="text-gray-500 text-center py-12">No bench tax data yet — check back once games have been played.</p>
        )}
      </div>
    </main>
  )
}
