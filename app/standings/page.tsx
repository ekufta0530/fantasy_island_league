import { getStandingsData } from '@/lib/stats/standings'
import { PageHeader } from '@/components/PageHeader'
import { EmptyState } from '@/components/EmptyState'
import { Avatar } from '@/components/Avatar'
import { Badge } from '@/components/Badge'

export const metadata = { title: 'Standings' }

export const dynamic = 'force-dynamic'
export const revalidate = 300  // refresh every 5 min

function luckLabel(luck: number): string {
  if (luck > 1.5) return 'Blessed'
  if (luck > 0.5) return 'Lucky'
  if (luck > -0.5) return 'Even'
  if (luck > -1.5) return 'Robbed'
  return 'Cursed'
}

function luckTone(luck: number): 'lime' | 'teal' | 'neutral' | 'rose' {
  if (luck > 0.5) return 'lime'
  if (luck > -0.5) return 'neutral'
  return 'rose'
}

function powerRankBadge(rank: number): string {
  if (rank === 1) return '#1'
  if (rank === 2) return '#2'
  if (rank === 3) return '#3'
  return `#${rank}`
}

export default async function StandingsPage() {
  let rows
  try {
    rows = await getStandingsData()
  } catch (err) {
    return (
      <main className="min-h-screen px-4 py-10">
        <div className="max-w-5xl mx-auto">
          <EmptyState icon="🌊" title="Couldn't load standings" subtitle={String(err)} />
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen px-4 py-10">
      <div className="max-w-5xl mx-auto">
        <PageHeader
          eyebrow="The pecking order"
          title="Standings"
          subtitle="Power rank = 50% record + 30% total PF + 20% last-3-week PF. Luck index = actual wins minus expected wins if you'd played everyone every week."
        />

        {/* Desktop table */}
        <div className="hidden md:block overflow-x-auto rounded-2xl border border-hairline bg-surface">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-hairline text-muted uppercase text-xs tracking-wider">
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
            <tbody className="divide-y divide-hairline">
              {rows.map((row, i) => (
                <tr
                  key={row.roster_id}
                  className={`transition-colors hover:bg-surface-2 ${i === 0 ? 'bg-gold-950/20' : ''}`}
                >
                  <td className="px-4 py-4 text-center">
                    <span className={`font-display font-bold text-lg ${i === 0 ? 'text-gold-300' : i < 3 ? 'text-coral-300' : 'text-faint'}`}>
                      {powerRankBadge(row.power_rank)}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <Avatar src={row.avatar_url} name={row.real_name} />
                      <div>
                        <p className="font-semibold text-ink leading-tight">{row.display_name}</p>
                        <p className="text-faint text-xs">{row.real_name}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-center font-mono font-semibold text-ink">
                    {row.wins}–{row.losses}{row.ties > 0 ? `–${row.ties}` : ''}
                  </td>
                  <td className="px-4 py-4 text-right font-mono text-teal-300">
                    {row.points_for.toFixed(2)}
                  </td>
                  <td className="px-4 py-4 text-right font-mono text-rose-300">
                    {row.points_against.toFixed(2)}
                  </td>
                  <td className={`px-4 py-4 text-right font-mono font-semibold ${row.points_for - row.points_against >= 0 ? 'text-teal-300' : 'text-rose-300'}`}>
                    {row.points_for - row.points_against >= 0 ? '+' : ''}{(row.points_for - row.points_against).toFixed(2)}
                  </td>
                  <td className="px-4 py-4 text-center text-muted font-mono text-xs">
                    {row.all_play_wins}W–{row.all_play_losses}L
                  </td>
                  <td className="px-4 py-4 text-center">
                    <div className="flex flex-col items-center gap-1">
                      <Badge tone={luckTone(row.luck_index)}>{luckLabel(row.luck_index)}</Badge>
                      <p className="text-faint font-mono text-xs">
                        {row.luck_index >= 0 ? '+' : ''}{row.luck_index.toFixed(2)}
                      </p>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="md:hidden space-y-3">
          {rows.map((row, i) => (
            <div key={row.roster_id} className="bg-surface rounded-2xl p-4 border border-hairline">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <Avatar src={row.avatar_url} name={row.real_name} size="lg" />
                  <div>
                    <p className="font-bold text-ink">{row.display_name}</p>
                    <p className="text-faint text-xs">{row.real_name}</p>
                  </div>
                </div>
                <span className={`font-display font-bold text-xl ${i === 0 ? 'text-gold-300' : i < 3 ? 'text-coral-300' : 'text-faint'}`}>
                  {powerRankBadge(row.power_rank)}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="bg-surface-2 rounded-lg p-2">
                  <p className="text-muted">Record</p>
                  <p className="font-bold font-mono text-ink">{row.wins}–{row.losses}</p>
                </div>
                <div className="bg-surface-2 rounded-lg p-2">
                  <p className="text-muted">PF</p>
                  <p className="font-bold text-teal-300 font-mono">{row.points_for.toFixed(1)}</p>
                </div>
                <div className="bg-surface-2 rounded-lg p-2">
                  <p className="text-muted">Luck</p>
                  <p className="font-bold text-ink">{luckLabel(row.luck_index)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}
