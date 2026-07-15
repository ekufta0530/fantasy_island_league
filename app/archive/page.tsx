import { getAllStoredRecaps } from '@/lib/recap/generate'
import { CURRENT_LEAGUE_ID } from '@/lib/constants'
import { PageHeader } from '@/components/PageHeader'
import { EmptyState } from '@/components/EmptyState'

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
    <main className="min-h-screen px-4 py-10">
      <div className="max-w-3xl mx-auto">
        <PageHeader
          eyebrow="Every roast, preserved"
          title="Recap Archive"
          subtitle="Every weekly commissioner's roast, kept for posterity and future trash talk."
        />

        {recaps.length === 0 ? (
          <EmptyState icon="📭" title="No recaps yet" subtitle="Check back after Week 1 wraps up." />
        ) : (
          <div className="space-y-6">
            {recaps.map(recap => (
              <article
                key={`${recap.season}-${recap.week}`}
                className="bg-surface border border-hairline rounded-2xl p-6 hover:border-hairline-strong transition-colors"
              >
                <div className="flex items-center justify-between mb-4 gap-4">
                  <div>
                    <h2 className="font-display text-xl font-bold text-ink">
                      Week {recap.week}
                      <span className="text-faint font-normal text-base ml-2">{recap.season}</span>
                    </h2>
                    <p className="text-faint text-xs mt-0.5">
                      Generated {new Date(recap.generated_at).toLocaleDateString('en-US', {
                        weekday: 'short', month: 'short', day: 'numeric', year: 'numeric'
                      })}
                    </p>
                  </div>
                </div>
                <div className="border-t border-hairline pt-4">
                  <p className="text-ink/85 leading-relaxed whitespace-pre-line text-sm">
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
