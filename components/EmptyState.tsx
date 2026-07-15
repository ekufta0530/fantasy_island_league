export function EmptyState({
  icon = '🌴',
  title,
  subtitle,
}: {
  icon?: string
  title: string
  subtitle?: string
}) {
  return (
    <div className="text-center py-20 text-muted">
      <p className="text-5xl mb-4">{icon}</p>
      <p className="text-lg font-semibold text-ink">{title}</p>
      {subtitle && <p className="text-sm mt-2 max-w-sm mx-auto">{subtitle}</p>}
    </div>
  )
}
