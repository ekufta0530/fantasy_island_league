// app/bench-tax/page.tsx
import { getBenchTaxData } from '@/lib/stats/bench-tax-data'
import { PageHeader } from '@/components/PageHeader'
import { EmptyState } from '@/components/EmptyState'
import { Avatar } from '@/components/Avatar'
import { Badge } from '@/components/Badge'
import { Callout } from '@/components/Card'

export const metadata = { title: 'Bench Tax' }

export const dynamic = 'force-dynamic'
export const revalidate = 300

export default async function BenchTaxPage() {
  let data
  try {
    data = await getBenchTaxData()
  } catch (err) {
    return (
      <main className="min-h-screen px-4 py-10">
        <div className="max-w-4xl mx-auto">
          <EmptyState icon="🌊" title="Couldn't load bench tax" subtitle={String(err)} />
        </div>
      </main>
    )
  }

  const { leaderboard, best_setter, season_worst } = data

  return (
    <main className="min-h-screen px-4 py-10">
      <div className="max-w-4xl mx-auto">
        <PageHeader
          eyebrow="Sins of the bench"
          title="Bench Tax"
          subtitle="Points left on the bench by starting the wrong players. Higher = worse decisions."
        />

        {/* Season worst callout */}
        {season_worst.bench_tax > 0 && (
          <Callout
            tone="rose"
            eyebrow="Worst Lineup Decision of the Season"
            title={`${season_worst.display_name} — Week ${season_worst.week}`}
            subtitle={season_worst.swap_label}
            stat={`+${season_worst.bench_tax.toFixed(2)} pts left on bench`}
            className="mb-8"
          />
        )}

        {/* Leaderboard table */}
        <div className="rounded-2xl border border-hairline bg-surface overflow-hidden mb-8">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-hairline text-muted uppercase text-xs tracking-wider">
                <th className="px-4 py-3 text-left">Manager</th>
                <th className="px-4 py-3 text-right">Total Tax</th>
                <th className="px-4 py-3 text-right">Avg/Week</th>
                <th className="px-4 py-3 text-right">Worst Week</th>
                <th className="px-4 py-3 text-left hidden lg:table-cell">Worst Swap</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline">
              {leaderboard.map((row, i) => (
                <tr key={row.roster_id} className={`hover:bg-surface-2 transition-colors ${i === 0 ? 'bg-rose-950/20' : ''} ${row.roster_id === best_setter.roster_id ? 'bg-lime-950/10' : ''}`}>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <Avatar src={row.avatar_url} name={row.real_name} />
                      <div>
                        <p className="font-semibold text-ink">{row.display_name}</p>
                        <p className="text-faint text-xs">{row.real_name}</p>
                      </div>
                      {i === 0 && <Badge tone="rose">Captain Bench</Badge>}
                      {row.roster_id === best_setter.roster_id && i !== 0 && <Badge tone="lime">Best Setter</Badge>}
                    </div>
                  </td>
                  <td className={`px-4 py-4 text-right font-mono font-bold ${i === 0 ? 'text-rose-300' : 'text-muted'}`}>
                    {row.total_bench_tax.toFixed(2)}
                  </td>
                  <td className="px-4 py-4 text-right font-mono text-muted">
                    {row.avg_bench_tax.toFixed(2)}
                  </td>
                  <td className="px-4 py-4 text-right">
                    <span className="font-mono text-coral-400">{row.worst_week_bench_tax.toFixed(2)}</span>
                    <span className="text-faint text-xs ml-1">Wk{row.worst_week}</span>
                  </td>
                  <td className="px-4 py-4 text-muted text-xs hidden lg:table-cell max-w-xs truncate">
                    {row.worst_swap_label}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {leaderboard.length === 0 && (
          <p className="text-muted text-center py-12">No bench tax data yet — check back once games have been played.</p>
        )}
      </div>
    </main>
  )
}
