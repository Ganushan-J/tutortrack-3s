'use client'

import Link from 'next/link'
import { Plus } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { PageHeader } from '@/components/shared'
import { addDays, formatLongDate } from '@/lib/dates'
import { compareLessonsAsc, compareLessonsDesc, isUpcoming, needsNotes } from '@/lib/lessons'
import { useTutorStore } from '@/lib/tutor-store'
import { NotesPending } from './notes-pending'
import { RecentActivity } from './recent-activity'
import { StatCard } from './stat-card'
import { UpcomingLessons } from './upcoming-lessons'

export function DashboardView() {
  const { today, clock, students, lessons, loading, loadError } = useTutorStore()

  if (loading || loadError) return null

  const upcoming = lessons.filter((l) => isUpcoming(l, today, clock)).sort(compareLessonsAsc)
  const todayCount = upcoming.filter((l) => l.date === today).length
  const weekEnd = addDays(today, 7)
  const thisWeekCount = upcoming.filter((l) => l.date < weekEnd).length
  const pending = lessons.filter((l) => needsNotes(l, today, clock)).sort(compareLessonsDesc)
  const monthStart = `${today.slice(0, 7)}-01`
  const hoursThisMonth =
    lessons
      .filter((l) => l.status === 'completed' && l.date >= monthStart && l.date <= today)
      .reduce((sum, l) => sum + l.durationMinutes, 0) / 60

  return (
    <>
      <PageHeader
        title="Dashboard"
        description={formatLongDate(today)}
        actions={
          <Link href="/lessons/new" className={buttonVariants({ size: 'lg' })}>
            <Plus data-icon="inline-start" aria-hidden="true" />
            Log lesson
          </Link>
        }
      />

      <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
        <StatCard label="Lessons today" value={todayCount} />
        <StatCard label="Next 7 days" value={thisWeekCount} />
        <StatCard label="Notes to complete" value={pending.length} highlight={pending.length > 0} />
        <StatCard label="Hours this month" value={Number.isInteger(hoursThisMonth) ? hoursThisMonth : hoursThisMonth.toFixed(1)} />
      </div>

      <div className="mt-4 grid gap-4 md:mt-6 md:gap-6 lg:grid-cols-3">
        <UpcomingLessons className="lg:col-span-2" lessons={upcoming.slice(0, 6)} students={students} today={today} />
        <NotesPending lessons={pending} students={students} today={today} />
        <RecentActivity className="lg:col-span-3" lessons={lessons} students={students} today={today} />
      </div>
    </>
  )
}
