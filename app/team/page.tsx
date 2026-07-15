import Link from 'next/link'
import { MANAGERS } from '@/lib/managers'

export const metadata = { title: 'Teams' }

export default function TeamsIndexPage() {
  return (
    <main className="min-h-screen bg-gray-950 text-white px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-4xl font-black mb-8 tracking-tight">👥 Teams</h1>
        <div className="space-y-3">
          {MANAGERS.map(m => (
            <Link
              key={m.username}
              href={`/team/${m.username}`}
              className="flex items-center justify-between bg-gray-900 border border-gray-800 rounded-xl px-5 py-4 hover:border-gray-600 hover:bg-gray-800 transition-all"
            >
              <div>
                <p className="font-bold text-white">{m.teamName ?? m.username}</p>
                <p className="text-gray-400 text-sm">{m.realName} · {m.nflTeam} fan</p>
              </div>
              <span className="text-gray-500 text-sm">→</span>
            </Link>
          ))}
        </div>
      </div>
    </main>
  )
}
