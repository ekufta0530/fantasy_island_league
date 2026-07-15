export type StatTone = 'neutral' | 'coral' | 'gold' | 'teal'

const BORDER: Record<StatTone, string> = {
  neutral: 'border-hairline bg-surface',
  coral: 'border-coral-900 bg-coral-950/50',
  gold: 'border-gold-900 bg-gold-950/50',
  teal: 'border-teal-900 bg-teal-950/50',
}
const VALUE: Record<StatTone, string> = {
  neutral: 'text-ink',
  coral: 'text-coral-300',
  gold: 'text-gold-300',
  teal: 'text-teal-300',
}

export function StatTile({
  label,
  value,
  sub,
  tone = 'neutral',
}: {
  label: string
  value: string
  sub?: string
  tone?: StatTone
}) {
  return (
    <div className={`rounded-xl border p-4 ${BORDER[tone]}`}>
      <p className="text-muted text-xs uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-2xl font-display font-bold ${VALUE[tone]}`}>{value}</p>
      {sub && <p className="text-faint text-xs mt-1">{sub}</p>}
    </div>
  )
}
