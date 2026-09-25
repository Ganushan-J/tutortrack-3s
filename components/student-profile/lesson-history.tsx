import Link from 'next/link'
import { AlertCircle, ExternalLink, Pencil } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { EmptyState, LessonStatusBadge, SectionCard, TopicChip } from '@/components/shared'
import { formatShortDate, formatTimeRange } from '@/lib/dates'
import { needsNotes } from '@/lib/lessons'
import type { Lesson } from '@/lib/types'

function NoteRow({ label, value }: { label: string; value: string }) {
  if (!value.trim()) return null
  return (
    <div className="flex flex-col gap-0.5 sm:grid sm:grid-cols-[7rem_1fr] sm:gap-3">
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="text-sm leading-relaxed text-pretty">{value}</dd>
    </div>
  )
}

function hostname(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

export function LessonHistory({
  lessons,
  today,
  className,
}: {
  lessons: Lesson[]
  today: string
  className?: string
}) {
  return (
    <SectionCard title="Lesson history" description={`${lessons.length} past lessons`} className={className}>
      {lessons.length === 0 ? (
        <EmptyState title="No lessons yet" description="Logged lessons will appear here." />
      ) : (
        <ol className="divide-y divide-border">
          {lessons.map((lesson) => {
            const incomplete = needsNotes(lesson, today)
            return (
              <li key={lesson.id} className="flex flex-col gap-3 px-4 py-4 md:px-5">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                  <time dateTime={lesson.date} className="text-sm font-semibold">
                    {formatShortDate(lesson.date)}
                  </time>
                  <span className="font-mono text-xs text-muted-foreground">
                    {formatTimeRange(lesson.startTime, lesson.durationMinutes)}
                  </span>
                  <LessonStatusBadge status={lesson.status} />
                  {incomplete && (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-primary">
                      <AlertCircle className="size-3.5" aria-hidden="true" />
                      Notes incomplete
                    </span>
                  )}
                  <Link
                    href={`/lessons/${lesson.id}`}
                    className={buttonVariants({ variant: 'ghost', size: 'sm', className: 'ml-auto' })}
                  >
                    <Pencil data-icon="inline-start" aria-hidden="true" />
                    {incomplete ? 'Complete' : 'Edit'}
                    <span className="sr-only">{` lesson on ${formatShortDate(lesson.date)}`}</span>
                  </Link>
                </div>

                {lesson.topicsCovered.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {lesson.topicsCovered.map((topic) => (
                      <TopicChip key={topic}>{topic}</TopicChip>
                    ))}
                  </div>
                )}

                <dl className="flex flex-col gap-2.5">
                  <NoteRow label="Strengths" value={lesson.strengths} />
                  <NoteRow label="Difficulties" value={lesson.difficulties} />
                  <NoteRow label="Homework" value={lesson.homework} />
                  <NoteRow label="Next plan" value={lesson.nextLessonPlan} />
                </dl>

                {lesson.resourceLinks.length > 0 && (
                  <ul className="flex flex-wrap gap-2">
                    {lesson.resourceLinks.map((url) => (
                      <li key={url}>
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
                        >
                          <ExternalLink className="size-3" aria-hidden="true" />
                          {hostname(url)}
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            )
          })}
        </ol>
      )}
    </SectionCard>
  )
}
