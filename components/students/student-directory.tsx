'use client'

import { useState } from 'react'
import { Plus, Search, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PageHeader } from '@/components/shared'
import { SegmentedControl } from '@/components/form-controls'
import { compareLessonsAsc, fullName, isUpcoming } from '@/lib/lessons'
import { useTutorStore } from '@/lib/tutor-store'
import { AddStudentForm } from './add-student-form'
import { StudentList } from './student-list'

const TIER_FILTERS = ['All', 'Foundation', 'Higher'] as const
type TierFilter = (typeof TIER_FILTERS)[number]

export function StudentDirectory() {
  const { students, lessons, today, loading, loadError } = useTutorStore()
  const [query, setQuery] = useState('')
  const [tierFilter, setTierFilter] = useState<TierFilter>('All')
  const [showForm, setShowForm] = useState(false)
  const [showArchived, setShowArchived] = useState(false)

  if (loading || loadError) return null

  const normalisedQuery = query.trim().toLowerCase()
  const activeCount = students.filter((student) => !student.archived).length
  const filtered = students
    .filter((student) => showArchived || !student.archived)
    .filter((s) => tierFilter === 'All' || s.tier === tierFilter)
    .filter((s) => {
      if (!normalisedQuery) return true
      return [fullName(s), s.examBoard, s.yearGroup, s.nextTopic].some((field) =>
        field.toLowerCase().includes(normalisedQuery),
      )
    })
    .sort((a, b) => fullName(a).localeCompare(fullName(b)))

  const upcomingByStudent = new Map<string, (typeof lessons)[number]>()
  for (const lesson of lessons.filter((l) => isUpcoming(l, today) && students.some((s) => s.id === l.studentId && !s.archived)).sort(compareLessonsAsc)) {
    if (!upcomingByStudent.has(lesson.studentId)) upcomingByStudent.set(lesson.studentId, lesson)
  }

  return (
    <>
      <PageHeader
        title="Students"
        description={`${activeCount} active students`}
        actions={
          <Button size="lg" variant={showForm ? 'outline' : 'default'} onClick={() => setShowForm((v) => !v)} aria-expanded={showForm}>
            {showForm ? <X data-icon="inline-start" aria-hidden="true" /> : <Plus data-icon="inline-start" aria-hidden="true" />}
            {showForm ? 'Close form' : 'Add student'}
          </Button>
        }
      />

      {showForm && (
        <div className="mb-6">
          <AddStudentForm onCancel={() => setShowForm(false)} />
        </div>
      )}

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="relative flex-1">
          <label htmlFor="student-search" className="sr-only">
            Search students
          </label>
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            id="student-search"
            type="search"
            placeholder="Search by name, exam board, year or topic"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-9 pl-9"
          />
        </div>
        <div className="sm:w-72 [&_legend]:sr-only">
          <SegmentedControl
            name="tier-filter"
            label="Filter by tier"
            value={tierFilter}
            options={TIER_FILTERS}
            onChange={setTierFilter}
          />
        </div>
      </div>

      <label className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground">
        <input type="checkbox" checked={showArchived} onChange={(event) => setShowArchived(event.target.checked)} />
        Include archived students
      </label>

      {activeCount === 0 && !showArchived ? (
        <div className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
          {students.length ? 'No active students. Include archived students to view their history.' : 'No students yet. Use “Add student” to create your first student.'}
        </div>
      ) : (
        <StudentList students={filtered} nextLessons={upcomingByStudent} today={today} />
      )}
    </>
  )
}
