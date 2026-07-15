import { getStandingsData } from '@/lib/stats/standings'

export const metadata = { title: 'Standings' }

export const dynamic = 'force-dynamic'
export const revalidate = 300  // refresh every 5 min

function luckLabel(luck: number): string {
  if (luck > 1.5) return '🍀 Blessed'
  if (luck > 0.5) return '😌 Lucky'
  if (luck > -0.5) return '⚖️ Even'
  if (luck > -1.5) return '😤 Robbed'
  return '💀 Cursed'
}

function powerRankBadge(rank: number): string {
  if (rank === 1) return '👑'
  if (rank === 2) return '🥈'
  if (rank === 3) return '🥉'
  return `#${rank}`
}

export default async function StandingsPage() {
  let rows
  try {
    rows = await getStandingsData()
  } catch (err) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-2xl mb-2">⚠️ Couldn&apos;t load standings</p>
          <p className="text-gray-400 text-sm">{String(err)}</p>
        </div>
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-gray-950 text-white px-4 py-8">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-4xl font-black mb-1 tracking-tight">
          📊 Standings
        </h1>
        <p className="text-gray-400 mb-8 text-sm">
          Power rank = 50% record + 30% total PF + 20% last-3-week PF.
          Luck index = actual wins minus expected wins if you&apos;d played everyone every week.
        </p>

        {/* Desktop table */}
        <div className="hidden md:block overflow-x-auto rounded-xl border border-gray-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-900 text-gray-400 uppercase text-xs tracking-wider">
                <th className="px-4 py-3 text-left">Power</th>
                <th className="px-4 py-3 text-left">Manager</th>
                <th className="px-4 py-3 text-center">Record</th>
                <th className="px-4 py-3 text-right">PF</th>
                <th className="px-4 py-3 text-right">PA</th>
                <th className="px-4 py-3 text-right">Diff</th>
                <th className="px-4 py-3 text-center">All-Play</th>
                <th className="px-4 py-3 text-center">Luck</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {rows.map((row, i) => (
                <tr
                  key={row.roster_id}
                  className={`transition-colors hover:bg-gray-900 ${i === 0 ? 'bg-gray-900/50' : ''}`}
                >
                  <td className="px-4 py-4 text-center text-lg font-bold">
                    {powerRankBadge(row.power_rank)}
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      {row.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={row.avatar_url}
                          alt={row.display_name}
                          className="w-9 h-9 rounded-full object-cover bg-gray-700"
                        />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center font-bold text-white text-sm">
                          {row.real_name[0]}
                        </div>
                      )}
                      <div>
                        <p className="font-semibold text-white leading-tight">{row.display_name}</p>
                        <p className="text-gray-500 text-xs">{row.real_name}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-center font-mono font-semibold">
                    {row.wins}–{row.losses}{row.ties > 0 ? `–${row.ties}` : ''}
                  </td>
                  <td className="px-4 py-4 text-right font-mono text-green-400">
                    {row.points_for.toFixed(2)}
                  </td>
                  <td className="px-4 py-4 text-right font-mono text-red-400">
                    {row.points_against.toFixed(2)}
                  </td>
                  <td className={`px-4 py-4 text-right font-mono font-semibold ${row.points_for - row.points_against >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {row.points_for - row.points_against >= 0 ? '+' : ''}{(row.points_for - row.points_against).toFixed(2)}
                  </td>
                  <td className="px-4 py-4 text-center text-gray-300 font-mono text-xs">
                    {row.all_play_wins}W–{row.all_play_losses}L
                  </td>
                  <td className="px-4 py-4 text-center">
                    <span className="text-xs">
                      {luckLabel(row.luck_index)}
                    </span>
                    <p className="text-gray-500 font-mono text-xs mt-0.5">
                      {row.luck_index >= 0 ? '+' : ''}{row.luck_index.toFixed(2)}
                    </p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="md:hidden space-y-3">
          {rows.map(row => (
            <div key={row.roster_id} className="bg-gray-900 rounded-xl p-4 border border-gray-800">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  {row.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={row.avatar_url} alt={row.display_name} className="w-10 h-10 rounded-full bg-gray-700" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center font-bold text-white">
                      {row.real_name[0]}
                    </div>
                  )}
                  <div>
                    <p className="font-bold text-white">{row.display_name}</p>
                    <p className="text-gray-400 text-xs">{row.real_name}</p>
                  </div>
                </div>
                <span className="text-2xl">{powerRankBadge(row.power_rank)}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="bg-gray-800 rounded-lg p-2">
                  <p className="text-gray-400">Record</p>
                  <p className="font-bold font-mono">{row.wins}–{row.losses}</p>
                </div>
                <div className="bg-gray-800 rounded-lg p-2">
                  <p className="text-gray-400">PF</p>
                  <p className="font-bold text-green-400 font-mono">{row.points_for.toFixed(1)}</p>
                </div>
                <div className="bg-gray-800 rounded-lg p-2">
                  <p className="text-gray-400">Luck</p>
                  <p className="font-bold">{luckLabel(row.luck_index)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}
