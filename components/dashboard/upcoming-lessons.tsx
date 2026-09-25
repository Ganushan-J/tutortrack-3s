import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { EmptyState, SectionCard, StudentAvatar, TierBadge } from '@/components/shared'
import { formatRelativeDay, formatTimeRange } from '@/lib/dates'
import { fullName } from '@/lib/lessons'
import type { Lesson, Student } from '@/lib/types'
import { cn } from '@/lib/utils'

export function UpcomingLessons({
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
  return (
    <SectionCard
      title="Upcoming lessons"
      description="Scheduled sessions and what's planned"
      className={className}
      action={
        <Link href="/students" className="text-xs font-medium text-primary hover:underline">
          All students
        </Link>
      }
    >
      {lessons.length === 0 ? (
        <EmptyState title="No upcoming lessons" description="Log or schedule a lesson to see it here." />
      ) : (
        <ul className="divide-y divide-border">
          {lessons.map((lesson) => {
            const student = students.find((s) => s.id === lesson.studentId)
            if (!student) return null
            const isToday = lesson.date === today
            const plan = lesson.nextLessonPlan || student.nextTopic
            return (
              <li key={lesson.id}>
                <Link
                  href={`/lessons/${lesson.id}`}
                  className="group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-accent/50 focus-visible:bg-accent/50 focus-visible:outline-none md:gap-4 md:px-5"
                >
                  <div
                    className={cn(
                      'flex w-20 shrink-0 flex-col rounded-lg px-2.5 py-1.5 md:w-24',
                      isToday ? 'bg-primary/15' : 'bg-secondary',
                    )}
                  >
                    <span className={cn('text-xs font-semibold', isToday ? 'text-primary' : 'text-foreground')}>
                      {formatRelativeDay(lesson.date, today)}
                    </span>
                    <span className="font-mono text-xs text-muted-foreground tabular-nums">
                      {formatTimeRange(lesson.startTime, lesson.durationMinutes)}
                    </span>
                  </div>
                  <StudentAvatar student={student} size="sm" />
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium">{fullName(student)}</span>
                      <span className="hidden sm:inline-flex">
                        <TierBadge tier={student.tier} />
                      </span>
                    </div>
                    <p className="truncate text-xs text-muted-foreground">
                      {plan ? `Plan: ${plan}` : 'No plan yet'}
                    </p>
                  </div>
                  <ChevronRight
                    className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
                    aria-hidden="true"
                  />
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </SectionCard>
  )
}
