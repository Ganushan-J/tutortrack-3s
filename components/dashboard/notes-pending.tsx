import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'
import { EmptyState, SectionCard, StudentAvatar } from '@/components/shared'
import { formatRelativeDay } from '@/lib/dates'
import { fullName, missingNoteFields } from '@/lib/lessons'
import type { Lesson, Student } from '@/lib/types'

export function NotesPending({
  lessons,
  students,
  today,
}: {
  lessons: Lesson[]
  students: Student[]
  today: string
}) {
  return (
    <SectionCard
      title="Notes to complete"
      description="Finish these while the lesson is fresh"
      action={
        lessons.length > 0 ? (
          <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 font-mono text-xs font-semibold text-primary-foreground">
            {lessons.length}
          </span>
        ) : undefined
      }
    >
      {lessons.length === 0 ? (
        <EmptyState title="All caught up" description="Every past lesson has complete notes." />
      ) : (
        <ul className="divide-y divide-border">
          {lessons.map((lesson) => {
            const student = students.find((s) => s.id === lesson.studentId)
            if (!student) return null
            const unlogged = lesson.status === 'scheduled'
            const missing = missingNoteFields(lesson)
            return (
              <li key={lesson.id} className="flex items-center gap-3 px-4 py-3 md:px-5">
                <StudentAvatar student={student} size="sm" />
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="truncate text-sm font-medium">{fullName(student)}</span>
                  <span className="truncate text-xs text-muted-foreground">
                    {formatRelativeDay(lesson.date, today)}
                    {' · '}
                    {unlogged ? 'Not marked as taught' : `Missing: ${missing.join(', ')}`}
                  </span>
                </div>
                <Link
                  href={`/lessons/${lesson.id}`}
                  className={buttonVariants({ variant: 'outline', size: 'sm' })}
                >
                  {unlogged ? 'Log' : 'Complete'}
                  <span className="sr-only">{` notes for ${fullName(student)}`}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </SectionCard>
  )
}
