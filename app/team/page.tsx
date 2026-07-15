import Link from 'next/link'
import { MANAGERS } from '@/lib/managers'
import { PageHeader } from '@/components/PageHeader'
import { Avatar } from '@/components/Avatar'

export const metadata = { title: 'Teams' }

export default function TeamsIndexPage() {
  return (
    <main className="min-h-screen px-4 py-10">
      <div className="max-w-2xl mx-auto">
        <PageHeader eyebrow="The whole roster of degenerates" title="Teams" />
        <div className="space-y-3">
          {MANAGERS.map(m => (
            <Link
              key={m.username}
              href={`/team/${m.username}`}
              className="flex items-center gap-4 bg-surface border border-hairline rounded-2xl px-5 py-4 hover:border-hairline-strong hover:bg-surface-2 transition-all"
            >
              <Avatar name={m.realName} size="lg" />
              <div className="flex-1 min-w-0">
                <p className="font-bold text-ink">{m.teamName ?? m.username}</p>
                <p className="text-muted text-sm">{m.realName} · {m.nflTeam} fan</p>
              </div>
              <span className="text-faint text-sm">→</span>
            </Link>
          ))}
        </div>
      </div>
    </main>
  )
}
