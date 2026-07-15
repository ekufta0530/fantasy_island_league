import type { ReactNode } from 'react'

export type Tone = 'coral' | 'gold' | 'teal' | 'lime' | 'rose' | 'neutral'

const TONE_CLASSES: Record<Tone, string> = {
  coral: 'bg-coral-900/60 text-coral-300 border-coral-900',
  gold: 'bg-gold-900/60 text-gold-300 border-gold-900',
  teal: 'bg-teal-950 text-teal-300 border-teal-900',
  lime: 'bg-lime-950 text-lime-300 border-lime-900',
  rose: 'bg-rose-950 text-rose-300 border-rose-900',
  neutral: 'bg-surface-2 text-muted border-hairline',
}

export function Badge({
  tone = 'neutral',
  children,
  className = '',
}: {
  tone?: Tone
  children: ReactNode
  className?: string
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full border whitespace-nowrap ${TONE_CLASSES[tone]} ${className}`}
    >
      {children}
    </span>
  )
}
