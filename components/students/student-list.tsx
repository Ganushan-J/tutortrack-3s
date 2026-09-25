import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { EmptyState, GradeProgress, StudentAvatar, TierBadge } from '@/components/shared'
import { formatRelativeDay } from '@/lib/dates'
import { fullName } from '@/lib/lessons'
import type { Lesson, Student } from '@/lib/types'

export function StudentList({
  students,
  nextLessons,
  today,
}: {
  students: Student[]
  nextLessons: Map<string, Lesson>
  today: string
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div
        className="hidden grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.4fr)_1rem] gap-4 border-b border-border px-5 py-2.5 text-xs font-medium text-muted-foreground md:grid"
        aria-hidden="true"
      >
        <span>Student</span>
        <span>Tier</span>
        <span>Grade → target</span>
        <span>Next lesson</span>
        <span />
      </div>

      {students.length === 0 ? (
        <EmptyState title="No students match" description="Try a different search or filter." />
      ) : (
        <ul className="divide-y divide-border">
          {students.map((student) => {
            const next = nextLessons.get(student.id)
            return (
              <li key={student.id}>
                <Link
                  href={`/students/${student.id}`}
                  className="group grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3.5 transition-colors hover:bg-accent/50 focus-visible:bg-accent/50 focus-visible:outline-none md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.4fr)_1rem] md:gap-4 md:px-5"
                >
                  <div className="col-span-2 flex min-w-0 items-center gap-3 md:col-span-1">
                    <StudentAvatar student={student} />
                    <div className="flex min-w-0 flex-col gap-0.5">
                      <span className="truncate text-sm font-medium">{fullName(student)}</span>
                      <span className="truncate text-xs text-muted-foreground">
                        {student.yearGroup} · {student.examBoard}
                      </span>
                      <span className="flex items-center gap-2 pt-1 md:hidden">
                        <TierBadge tier={student.tier} />
                        <GradeProgress current={student.currentGrade} target={student.targetGrade} />
                      </span>
                    </div>
                  </div>
                  <span className="hidden md:block">
                    <TierBadge tier={student.tier} />
                  </span>
                  <span className="hidden md:block">
                    <GradeProgress current={student.currentGrade} target={student.targetGrade} />
                  </span>
                  <span className="hidden min-w-0 flex-col md:flex">
                    {next ? (
                      <>
                        <span className="text-sm">{formatRelativeDay(next.date, today)}</span>
                        <span className="font-mono text-xs text-muted-foreground">{next.startTime}</span>
                      </>
                    ) : (
                      <span className="text-sm text-muted-foreground">Not scheduled</span>
                    )}
                  </span>
                  <ChevronRight
                    className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5"
                    aria-hidden="true"
                  />
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
