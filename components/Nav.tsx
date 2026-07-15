'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

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

export function Nav() {
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
      </div>
    </nav>
  )
}
