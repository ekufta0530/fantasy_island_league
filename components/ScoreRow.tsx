import { Avatar } from './Avatar'

interface Side {
  display_name: string
  real_name: string
  avatar_url: string | null
  points: number
}

export function ScoreRow({ home, away }: { home: Side; away: Side }) {
  const homeWinning = home.points >= away.points
  const awayWinning = away.points > home.points
  return (
    <div className="bg-surface border border-hairline rounded-2xl p-4 hover:border-hairline-strong transition-colors">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <Avatar src={home.avatar_url} name={home.real_name} />
          <div className="min-w-0">
            <p className="font-semibold text-sm truncate text-ink">{home.display_name}</p>
            <p className="text-faint text-xs truncate">{home.real_name}</p>
          </div>
        </div>
        <div className="flex items-center gap-2.5 shrink-0">
          <span
            className={`text-xl sm:text-2xl font-mono font-bold tabular-nums ${
              homeWinning ? 'text-teal-300' : 'text-faint'
            }`}
          >
            {home.points.toFixed(2)}
          </span>
          <span className="text-faint text-xs font-bold">–</span>
          <span
            className={`text-xl sm:text-2xl font-mono font-bold tabular-nums ${
              awayWinning ? 'text-teal-300' : 'text-faint'
            }`}
          >
            {away.points.toFixed(2)}
          </span>
        </div>
        <div className="flex items-center gap-3 flex-1 min-w-0 justify-end">
          <div className="min-w-0 text-right">
            <p className="font-semibold text-sm truncate text-ink">{away.display_name}</p>
            <p className="text-faint text-xs truncate">{away.real_name}</p>
          </div>
          <Avatar src={away.avatar_url} name={away.real_name} />
        </div>
      </div>
    </div>
  )
}
