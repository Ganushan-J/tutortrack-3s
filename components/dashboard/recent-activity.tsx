import Link from 'next/link'
import { CalendarX2, CheckCircle2, UserPlus } from 'lucide-react'
import { EmptyState, SectionCard, TopicChip } from '@/components/shared'
import { formatRelativeDay } from '@/lib/dates'
import { fullName } from '@/lib/lessons'
import type { Lesson, Student } from '@/lib/types'
import { cn } from '@/lib/utils'

type ActivityItem =
  | { kind: 'lesson'; date: string; sortKey: string; lesson: Lesson; student: Student }
  | { kind: 'student'; date: string; sortKey: string; student: Student }

function buildActivity(lessons: Lesson[], students: Student[], today: string): ActivityItem[] {
  const items: ActivityItem[] = []
  for (const lesson of lessons) {
    if (lesson.status === 'scheduled' || lesson.date > today) continue
    const student = students.find((s) => s.id === lesson.studentId)
    if (student) {
      items.push({ kind: 'lesson', date: lesson.date, sortKey: `${lesson.date} ${lesson.startTime}`, lesson, student })
    }
  }
  for (const student of students) {
    items.push({ kind: 'student', date: student.createdAt, sortKey: `${student.createdAt} 00:00`, student })
  }
  return items.sort((a, b) => b.sortKey.localeCompare(a.sortKey)).slice(0, 6)
}

export function RecentActivity({
  lessons,
  students,
  today,
  className,
}: {
  lessons: Lesson[]
  students: Student[]
  today: string
  className?: string
}) {
  const items = buildActivity(lessons, students, today)

  return (
    <SectionCard title="Recent activity" description="Latest lessons and new students" className={className}>
      {items.length === 0 ? (
        <EmptyState title="Nothing yet" />
      ) : (
        <ol className="grid divide-y divide-border md:grid-cols-2 md:divide-y-0">
          {items.map((item) => {
            const key = item.kind === 'lesson' ? item.lesson.id : `new-${item.student.id}`
            const cancelled = item.kind === 'lesson' && item.lesson.status === 'cancelled'
            const Icon = item.kind === 'student' ? UserPlus : cancelled ? CalendarX2 : CheckCircle2
            return (
              <li key={key} className="md:border-b md:border-border md:odd:border-r">
                <Link
                  href={`/students/${item.student.id}`}
                  className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-accent/50 md:px-5"
                >
                  <span
                    className={cn(
                      'mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full',
                      item.kind === 'student' && 'bg-primary/15 text-primary',
                      item.kind === 'lesson' && !cancelled && 'bg-success/15 text-success',
                      cancelled && 'bg-muted text-muted-foreground',
                    )}
                  >
                    <Icon className="size-3.5" aria-hidden="true" />
                  </span>
                  <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                    <p className="text-sm">
                      <span className="font-medium">{fullName(item.student)}</span>{' '}
                      <span className="text-muted-foreground">
                        {item.kind === 'student'
                          ? `joined · ${item.student.examBoard} ${item.student.tier}`
                          : cancelled
                            ? 'lesson cancelled'
                            : 'lesson completed'}
                      </span>
                    </p>
                    {item.kind === 'lesson' && item.lesson.topicsCovered.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {item.lesson.topicsCovered.map((topic) => (
                          <TopicChip key={topic}>{topic}</TopicChip>
                        ))}
                      </div>
                    )}
                  </div>
                  <time dateTime={item.date} className="shrink-0 text-xs text-muted-foreground">
                    {formatRelativeDay(item.date, today)}
                  </time>
                </Link>
              </li>
            )
          })}
        </ol>
      )}
    </SectionCard>
  )
}
