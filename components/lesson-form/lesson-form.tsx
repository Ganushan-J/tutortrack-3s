'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { FormField, NativeSelect, SegmentedControl } from '@/components/form-controls'
import { EmptyState, PageHeader } from '@/components/shared'
import { fullName } from '@/lib/lessons'
import { ApiError } from '@/lib/api'
import { useTutorStore } from '@/lib/tutor-store'
import { LESSON_DURATIONS, LESSON_STATUSES, type Lesson, type LessonStatus } from '@/lib/types'
import { FormSection } from './form-section'
import { ResourceLinksInput } from './resource-links-input'
import { TopicPicker } from './topic-picker'

type Props = { lessonId?: string; defaultStudentId?: string }

export function LessonForm({ lessonId, defaultStudentId }: Props) {
  const { getLesson, loading, loadError } = useTutorStore()
  const existing = lessonId ? getLesson(lessonId) : undefined

  if (loading || loadError) return null

  if (lessonId && !existing) {
    return (
      <div className="rounded-xl border border-border bg-card">
        <EmptyState title="Lesson not found" />
        <div className="flex justify-center pb-8">
          <Link href="/" className={buttonVariants({ variant: 'outline' })}>
            Back to dashboard
          </Link>
        </div>
      </div>
    )
  }

  return <LessonFormInner key={lessonId ?? 'new'} existing={existing} defaultStudentId={defaultStudentId} />
}

function LessonFormInner({ existing, defaultStudentId }: { existing?: Lesson; defaultStudentId?: string }) {
  const router = useRouter()
  const { students, resources, today, getStudent, addLesson, updateLesson } = useTutorStore()
  const sortedStudents = students
    .filter((item) => !item.archived || item.id === existing?.studentId)
    .sort((a, b) => fullName(a).localeCompare(fullName(b)))

  const initialStudentId =
    existing?.studentId ?? (defaultStudentId && !getStudent(defaultStudentId)?.archived ? defaultStudentId : '')

  const [studentId, setStudentId] = useState(initialStudentId)
  const [date, setDate] = useState(existing?.date ?? today)
  const [startTime, setStartTime] = useState(existing?.startTime ?? '17:00')
  const [duration, setDuration] = useState(existing?.durationMinutes ?? 60)
  const [status, setStatus] = useState<LessonStatus>(existing?.status ?? 'completed')
  const [topics, setTopics] = useState<string[]>(existing?.topicsCovered ?? [])
  const [strengths, setStrengths] = useState(existing?.strengths ?? '')
  const [difficulties, setDifficulties] = useState(existing?.difficulties ?? '')
  const [homework, setHomework] = useState(existing?.homework ?? '')
  const [links, setLinks] = useState<string[]>(existing?.resourceLinks ?? [])
  const [resourceIds, setResourceIds] = useState<string[]>(existing?.resourceIds ?? [])
  const [resourceSearch, setResourceSearch] = useState('')
  const [nextPlan, setNextPlan] = useState(existing?.nextLessonPlan ?? '')
  const [nextTopic, setNextTopic] = useState(getStudent(initialStudentId)?.nextTopic ?? '')
  const [error, setError] = useState('')
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)

  const student = getStudent(studentId)
  const isEdit = !!existing
  const showNotes = status !== 'cancelled'

  function changeStudent(id: string) {
    setStudentId(id)
    setNextTopic(getStudent(id)?.nextTopic ?? '')
    setError('')
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (saving) return
    setError('')
    setFormError('')
    if (!studentId) {
      setError('Choose a student')
      document.getElementById('studentId')?.focus()
      return
    }
    const input = {
      studentId,
      date,
      startTime,
      durationMinutes: duration,
      status,
      topicsCovered: topics,
      strengths: strengths.trim(),
      difficulties: difficulties.trim(),
      homework: homework.trim(),
      resourceLinks: links,
      resourceIds,
      nextLessonPlan: nextPlan.trim(),
      nextTopic: nextTopic.trim(),
    }
    setSaving(true)
    try {
      if (existing) {
        await updateLesson(existing.id, input)
      } else {
        await addLesson(input)
      }
      router.push('/students/' + studentId)
    } catch (cause) {
      if (cause instanceof ApiError) setError(cause.errors.studentId ?? '')
      const message = cause instanceof ApiError && (cause.errors.resourceIds || cause.errors.nextTopic)
        ? cause.errors.resourceIds || cause.errors.nextTopic
        : cause instanceof Error ? cause.message : 'Please try again.'
      setFormError(message)
    } finally {
      setSaving(false)
    }
  }

  const backHref = student ? `/students/${student.id}` : '/'

  return (
    <>
      <PageHeader
        eyebrow={
          <Link
            href={backHref}
            className="mb-2 inline-flex w-fit items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" aria-hidden="true" />
            {student ? fullName(student) : 'Dashboard'}
          </Link>
        }
        title={isEdit ? 'Lesson notes' : 'Log lesson'}
        description={
          student
            ? `${fullName(student)} · ${student.examBoard} ${student.tier} · target grade ${student.targetGrade}`
            : 'Record what was covered and plan the next session'
        }
      />

      <form onSubmit={handleSubmit} noValidate aria-busy={saving} className="flex flex-col gap-4 md:gap-6">
        {formError && <p role="alert" className="rounded-lg border border-destructive/40 p-3 text-sm text-destructive">{formError}</p>}
        <FormSection title="Session" description="Who, when and how it went">
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <FormField id="studentId" label="Student" error={error} className="sm:col-span-2 lg:col-span-1">
              <NativeSelect
                id="studentId"
                value={studentId}
                onChange={(e) => changeStudent(e.target.value)}
                aria-invalid={!!error}
                aria-describedby={error ? 'studentId-error' : undefined}
              >
                <option value="" disabled>
                  Select a student
                </option>
                {sortedStudents.map((s) => (
                  <option key={s.id} value={s.id}>
                    {fullName(s)}
                  </option>
                ))}
              </NativeSelect>
            </FormField>
            <FormField id="date" label="Date">
              <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
            </FormField>
            <FormField id="startTime" label="Start time">
              <Input
                id="startTime"
                type="time"
                step={900}
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
              />
            </FormField>
            <FormField id="duration" label="Duration">
              <NativeSelect id="duration" value={duration} onChange={(e) => setDuration(Number(e.target.value))}>
                {LESSON_DURATIONS.map((d) => (
                  <option key={d} value={d}>
                    {d} minutes
                  </option>
                ))}
              </NativeSelect>
            </FormField>
            <div className="sm:col-span-2 lg:col-span-4 lg:max-w-md">
              <SegmentedControl
                name="status"
                label="Status"
                value={status}
                options={LESSON_STATUSES}
                onChange={setStatus}
                renderLabel={(s) => s.charAt(0).toUpperCase() + s.slice(1)}
              />
            </div>
          </div>
        </FormSection>

        {showNotes && (
          <>
            <FormSection title="Topics covered" description="Tap to select, or add your own">
              <TopicPicker selected={topics} onChange={setTopics} />
            </FormSection>

            <FormSection title="Notes" description="Keep it short — you can always come back">
              <div className="grid gap-5 md:grid-cols-2">
                <FormField id="strengths" label="Strengths">
                  <Textarea
                    id="strengths"
                    rows={3}
                    value={strengths}
                    onChange={(e) => setStrengths(e.target.value)}
                    placeholder="What clicked this lesson?"
                  />
                </FormField>
                <FormField id="difficulties" label="Difficulties">
                  <Textarea
                    id="difficulties"
                    rows={3}
                    value={difficulties}
                    onChange={(e) => setDifficulties(e.target.value)}
                    placeholder="Misconceptions or errors to revisit"
                  />
                </FormField>
                <FormField id="homework" label="Homework set" className="md:col-span-2">
                  <Textarea
                    id="homework"
                    rows={2}
                    value={homework}
                    onChange={(e) => setHomework(e.target.value)}
                    placeholder="e.g. Corbett Maths 5-a-day x3, past paper Q10–15"
                  />
                </FormField>
              </div>
            </FormSection>

            <FormSection title="Resource links" description="Worksheets, past papers or videos shared">
              <ResourceLinksInput links={links} onChange={setLinks} />
            </FormSection>

            <FormSection title="Saved resources" description="Attach links from your reusable resource library">
              <div className="space-y-3 p-4">
                <Input aria-label="Search saved resources" placeholder="Search title or topic" value={resourceSearch} onChange={(event) => setResourceSearch(event.target.value)} />
                {resources.length === 0 ? <p className="text-sm text-muted-foreground">No saved resources yet.</p> : (
                  <div className="max-h-48 space-y-2 overflow-y-auto">
                    {resources.filter((resource) => `${resource.title} ${resource.topic}`.toLowerCase().includes(resourceSearch.trim().toLowerCase())).map((resource) => (
                      <label key={resource.id} className="flex cursor-pointer items-center gap-3 rounded-md border border-border p-2 text-sm">
                        <input type="checkbox" checked={resourceIds.includes(resource.id)} onChange={(event) => setResourceIds((previous) => event.target.checked ? [...previous, resource.id] : previous.filter((id) => id !== resource.id))} />
                        <span>{resource.title} <span className="text-xs text-muted-foreground">· {resource.topic} · {resource.tier}</span></span>
                      </label>
                    ))}
                  </div>
                )}
                <p className="text-xs text-muted-foreground">{resourceIds.length} selected · <Link href="/resources" className="text-primary hover:underline">Manage resource library</Link></p>
              </div>
            </FormSection>
          </>
        )}

        <FormSection title="Next lesson" description="Plan ahead so you can walk straight in">
          <div className="grid gap-5 md:grid-cols-2">
            <FormField id="nextPlan" label="Next lesson plan">
              <Textarea
                id="nextPlan"
                rows={3}
                value={nextPlan}
                onChange={(e) => setNextPlan(e.target.value)}
                placeholder="What to recap and what to introduce"
              />
            </FormField>
            <FormField
              id="nextTopic"
              label="Student's next topic"
              hint={student ? `Updates ${student.firstName}'s profile` : 'Choose a student first'}
            >
              <Input
                id="nextTopic"
                list="lesson-next-topics"
                value={nextTopic}
                onChange={(e) => setNextTopic(e.target.value)}
                disabled={!student}
                autoComplete="off"
                aria-describedby="nextTopic-hint"
              />
            </FormField>
          </div>
        </FormSection>

        <div className="sticky bottom-20 z-10 flex justify-end gap-2 rounded-xl border border-border bg-card/95 p-3 backdrop-blur md:bottom-4">
          <Link href={backHref} className={buttonVariants({ variant: 'ghost', size: 'lg' })}>
            Cancel
          </Link>
          <Button type="submit" size="lg" disabled={saving}>
            {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Save lesson'}
          </Button>
        </div>
      </form>
    </>
  )
}
