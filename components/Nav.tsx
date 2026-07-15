'use client'

import { Suspense } from 'react'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import type { SeasonMode, SeasonOption } from '@/lib/season'

const LINKS = [
  { href: '/standings', label: 'Standings' },
  { href: '/this-week', label: 'This Week' },
  { href: '/hall-of-fame', label: 'Hall of Fame' },
  { href: '/draft', label: 'Draft' },
  { href: '/trades', label: 'Trades' },
  { href: '/rivalries', label: 'Rivalries' },
  { href: '/archive', label: 'Archive' },
  { href: '/team', label: 'Teams' },
]

function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`)
}

function SeasonToggleInner({ seasons }: { seasons: SeasonOption[] }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const activeMode: SeasonMode = searchParams.get('season') === 'previous' ? 'previous' : 'current'

  function hrefFor(mode: SeasonMode): string {
    const params = new URLSearchParams(searchParams.toString())
    if (mode === 'current') params.delete('season')
    else params.set('season', mode)
    const qs = params.toString()
    return qs ? `${pathname}?${qs}` : pathname
  }

  return (
    <div className="flex items-center gap-0.5 bg-surface-2 rounded-full p-0.5 text-xs font-semibold shrink-0">
      {seasons.map(opt => (
        <Link
          key={opt.mode}
          href={hrefFor(opt.mode)}
          className={`px-2.5 py-1 rounded-full transition-colors whitespace-nowrap ${
            activeMode === opt.mode ? 'bg-coral-900/60 text-coral-300' : 'text-muted hover:text-ink'
          }`}
        >
          {opt.year || (opt.mode === 'current' ? 'Current' : 'Previous')}
        </Link>
      ))}
    </div>
  )
}

function SeasonToggle({ seasons }: { seasons: SeasonOption[] }) {
  if (seasons.length < 2) return null
  return (
    <Suspense fallback={null}>
      <SeasonToggleInner seasons={seasons} />
    </Suspense>
  )
}

export function Nav({ seasons }: { seasons: SeasonOption[] }) {
  const pathname = usePathname()

  return (
    <nav className="sticky top-0 z-50 bg-abyss/85 backdrop-blur-md border-b border-hairline">
      {/* Desktop */}
      <div className="hidden md:flex items-center gap-1 px-6 h-14 max-w-6xl mx-auto">
        <Link href="/" className="font-display font-bold text-lg tracking-tight mr-6 shrink-0 flex items-center gap-1.5">
          <span>🏝️</span>
          <span className="bg-linear-to-r from-coral-400 to-gold-400 bg-clip-text text-transparent">
            Fantasy Island
          </span>
        </Link>
        <div className="flex items-center gap-1 text-sm font-medium">
          {LINKS.map(link => (
            <Link
              key={link.href}
              href={link.href}
              className={`px-3 py-1.5 rounded-full transition-colors ${
                isActive(pathname, link.href)
                  ? 'bg-surface-2 text-ink'
                  : 'text-muted hover:text-ink hover:bg-surface'
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>
        <div className="ml-auto pl-4">
          <SeasonToggle seasons={seasons} />
        </div>
      </div>

      {/* Mobile */}
      <div className="md:hidden px-4 h-12 flex items-center gap-2 overflow-x-auto scrollbar-none">
        <Link href="/" className="text-lg mr-1 shrink-0">
          🏝️
        </Link>
        {LINKS.map(link => (
          <Link
            key={link.href}
            href={link.href}
            className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-semibold shrink-0 transition-colors ${
              isActive(pathname, link.href)
                ? 'bg-coral-900/50 text-coral-300'
                : 'bg-surface text-muted'
            }`}
          >
            {link.label}
          </Link>
        ))}
        <div className="pl-1">
          <SeasonToggle seasons={seasons} />
        </div>
      </div>
    </nav>
  )
}
