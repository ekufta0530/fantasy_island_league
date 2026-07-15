import type { ReactNode } from 'react'

export function Card({
  children,
  className = '',
  interactive = false,
}: {
  children: ReactNode
  className?: string
  interactive?: boolean
}) {
  return (
    <div
      className={`bg-surface border border-hairline rounded-2xl ${
        interactive ? 'transition-colors hover:border-hairline-strong hover:bg-surface-2' : ''
      } ${className}`}
    >
      {children}
    </div>
  )
}

export type CalloutTone = 'coral' | 'gold' | 'teal' | 'lime' | 'rose'

const BOX: Record<CalloutTone, string> = {
  coral: 'bg-coral-950/60 border-coral-900',
  gold: 'bg-gold-950/60 border-gold-900',
  teal: 'bg-teal-950/60 border-teal-900',
  lime: 'bg-lime-950/60 border-lime-900',
  rose: 'bg-rose-950/60 border-rose-900',
}
const EYEBROW: Record<CalloutTone, string> = {
  coral: 'text-coral-400',
  gold: 'text-gold-400',
  teal: 'text-teal-400',
  lime: 'text-lime-400',
  rose: 'text-rose-400',
}
const STAT: Record<CalloutTone, string> = {
  coral: 'text-coral-300',
  gold: 'text-gold-300',
  teal: 'text-teal-300',
  lime: 'text-lime-300',
  rose: 'text-rose-300',
}

export function Callout({
  tone,
  eyebrow,
  title,
  subtitle,
  stat,
  className = '',
}: {
  tone: CalloutTone
  eyebrow: string
  title: string
  subtitle?: string
  stat?: string
  className?: string
}) {
  return (
    <div className={`rounded-2xl border p-4 ${BOX[tone]} ${className}`}>
      <p className={`text-xs uppercase tracking-wider font-semibold mb-1 ${EYEBROW[tone]}`}>{eyebrow}</p>
      <p className="text-ink font-bold text-lg leading-tight">{title}</p>
      {subtitle && <p className="text-muted text-xs mt-0.5">{subtitle}</p>}
      {stat && <p className={`font-mono font-bold mt-1.5 ${STAT[tone]}`}>{stat}</p>}
    </div>
  )
}
