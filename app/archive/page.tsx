import { getAllStoredRecaps } from '@/lib/recap/generate'
import { CURRENT_LEAGUE_ID } from '@/lib/constants'

export const metadata = { title: 'Recap Archive' }

export const dynamic = 'force-dynamic'
export const revalidate = 300

export default async function ArchivePage() {
  let recaps: Array<{ season: string; week: number; recap_text: string; generated_at: string }> = []
  try {
    recaps = await getAllStoredRecaps(CURRENT_LEAGUE_ID)
  } catch {
    // DB unavailable — show empty state
  }

  return (
    <main className="min-h-screen bg-gray-950 text-white px-4 py-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-4xl font-black mb-1 tracking-tight">📰 Recap Archive</h1>
        <p className="text-gray-400 text-sm mb-8">
          Every weekly commissioner&apos;s roast, preserved for posterity and future trash talk.
        </p>

        {recaps.length === 0 ? (
          <div className="text-center py-16 text-gray-600">
            <p className="text-5xl mb-4">📭</p>
            <p className="text-lg font-semibold">No recaps yet</p>
            <p className="text-sm mt-2">Check back after Week 1 wraps up.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {recaps.map(recap => (
              <article
                key={`${recap.season}-${recap.week}`}
                className="bg-gray-900 border border-gray-800 rounded-2xl p-6 hover:border-gray-700 transition-colors"
              >
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-xl font-black text-white">
                      Week {recap.week}
                      <span className="text-gray-500 font-normal text-base ml-2">{recap.season}</span>
                    </h2>
                    <p className="text-gray-500 text-xs mt-0.5">
                      🤖 Generated {new Date(recap.generated_at).toLocaleDateString('en-US', {
                        weekday: 'short', month: 'short', day: 'numeric', year: 'numeric'
                      })}
                    </p>
                  </div>
                  <div className="text-3xl">🏈</div>
                </div>
                <div className="border-t border-gray-800 pt-4">
                  <p className="text-gray-200 leading-relaxed whitespace-pre-line text-sm">
                    {recap.recap_text}
                  </p>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
