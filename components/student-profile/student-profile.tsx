'use client'

import Link from 'next/link'
import { ArrowLeft, ArrowRight, Plus, Target } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { EmptyState, PageHeader, SectionCard, StudentAvatar, TierBadge } from '@/components/shared'
import { formatRelativeDay, formatTimeRange } from '@/lib/dates'
import { compareLessonsAsc, compareLessonsDesc, fullName, isUpcoming } from '@/lib/lessons'
import { useTutorStore } from '@/lib/tutor-store'
import { LessonHistory } from './lesson-history'

export function StudentProfile({ studentId }: { studentId: string }) {
  const { getStudent, lessons, today } = useTutorStore()
  const student = getStudent(studentId)

  if (!student) {
    return (
      <div className="rounded-xl border border-border bg-card">
        <EmptyState title="Student not found" description="They may have been removed." />
        <div className="flex justify-center pb-8">
          <Link href="/students" className={buttonVariants({ variant: 'outline' })}>
            Back to students
          </Link>
        </div>
      </div>
    )
  }

  const studentLessons = lessons.filter((l) => l.studentId === student.id)
  const nextLesson = studentLessons.filter((l) => isUpcoming(l, today)).sort(compareLessonsAsc)[0]
  const history = studentLessons.filter((l) => !isUpcoming(l, today)).sort(compareLessonsDesc)
  const completedCount = history.filter((l) => l.status === 'completed').length

  const details = [
    { label: 'Year group', value: student.yearGroup },
    { label: 'Exam board', value: student.examBoard },
    { label: 'Tier', value: <TierBadge tier={student.tier} /> },
    { label: 'Current grade', value: <span className="font-mono">{student.currentGrade}</span> },
    { label: 'Target grade', value: <span className="font-mono font-semibold text-primary">{student.targetGrade}</span> },
    { label: 'Lessons completed', value: <span className="font-mono">{completedCount}</span> },
  ]

  return (
    <>
      <PageHeader
        eyebrow={
          <Link
            href="/students"
            className="mb-2 inline-flex w-fit items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" aria-hidden="true" />
            Students
          </Link>
        }
        title={fullName(student)}
        description={`${student.yearGroup} · ${student.examBoard} ${student.tier}`}
        actions={
          <Link href={`/lessons/new?studentId=${student.id}`} className={buttonVariants({ size: 'lg' })}>
            <Plus data-icon="inline-start" aria-hidden="true" />
            Log lesson
          </Link>
        }
      />

      <div className="grid gap-4 md:gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-4 md:gap-6">
          <section
            aria-labelledby="next-topic-heading"
            className="flex flex-col gap-3 rounded-xl border border-primary/40 bg-primary/10 p-4 md:p-5"
          >
            <div className="flex items-center gap-2 text-primary">
              <Target className="size-4" aria-hidden="true" />
              <h2 id="next-topic-heading" className="text-xs font-semibold tracking-wide uppercase">
                Next topic to cover
              </h2>
            </div>
            <p className="text-lg font-semibold text-balance">{student.nextTopic || 'Not set yet'}</p>
            {nextLesson ? (
              <Link
                href={`/lessons/${nextLesson.id}`}
                className="group inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
              >
                Next lesson: {formatRelativeDay(nextLesson.date, today)},{' '}
                <span className="font-mono">{formatTimeRange(nextLesson.startTime, nextLesson.durationMinutes)}</span>
                <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
              </Link>
            ) : (
              <p className="text-sm text-muted-foreground">No lesson scheduled</p>
            )}
          </section>

          <section className="flex items-center gap-4 rounded-xl border border-border bg-card p-4 md:p-5">
            <StudentAvatar student={student} size="lg" />
            <dl className="grid flex-1 grid-cols-2 gap-x-4 gap-y-3">
              {details.map((d) => (
                <div key={d.label} className="flex flex-col gap-0.5">
                  <dt className="text-xs text-muted-foreground">{d.label}</dt>
                  <dd className="text-sm font-medium">{d.value}</dd>
                </div>
              ))}
            </dl>
          </section>

          <SectionCard title="Learning goals">
            {student.learningGoals.length === 0 ? (
              <EmptyState title="No goals yet" />
            ) : (
              <ol className="flex flex-col gap-3 px-4 py-4 md:px-5">
                {student.learningGoals.map((goal, index) => (
                  <li key={goal} className="flex gap-3 text-sm leading-relaxed">
                    <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-secondary font-mono text-xs text-muted-foreground">
                      {index + 1}
                    </span>
                    {goal}
                  </li>
                ))}
              </ol>
            )}
          </SectionCard>
        </div>

        <LessonHistory className="lg:col-span-2" lessons={history} today={today} />
      </div>
    </>
  )
}
