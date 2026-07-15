export function PageHeader({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow?: string
  title: string
  subtitle?: string
}) {
  return (
    <div className="mb-8">
      {eyebrow && (
        <p className="text-coral-400 text-xs font-bold uppercase tracking-[0.2em] mb-2">{eyebrow}</p>
      )}
      <h1 className="font-display text-4xl sm:text-5xl font-bold tracking-tight text-ink">{title}</h1>
      {subtitle && <p className="text-muted text-sm mt-2 max-w-2xl leading-relaxed">{subtitle}</p>}
    </div>
  )
}

export function SectionHeading({
  title,
  subtitle,
  className = '',
}: {
  title: string
  subtitle?: string
  className?: string
}) {
  return (
    <div className={`mb-5 ${className}`}>
      <h2 className="font-display text-xl sm:text-2xl font-bold text-ink tracking-tight">{title}</h2>
      {subtitle && <p className="text-muted text-sm mt-1">{subtitle}</p>}
    </div>
  )
}
