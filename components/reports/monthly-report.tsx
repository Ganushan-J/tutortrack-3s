'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { FormField, NativeSelect } from '@/components/form-controls'
import { EmptyState, PageHeader, SectionCard } from '@/components/shared'
import { fetchMonthlyReport, fetchStudents, saveMonthlyReport } from '@/lib/api'
import { todayISO } from '@/lib/dates'
import { fullName } from '@/lib/lessons'
import type { MonthlyDraft, SavedReport, Student } from '@/lib/types'

interface LoadedReport {
  key: string
  draft: MonthlyDraft
  saved: SavedReport | null
}

export function MonthlyReport() {
  const [students, setStudents] = useState<Student[]>([])
  const [studentId, setStudentId] = useState('')
  const [month, setMonth] = useState(() => todayISO().slice(0, 7))
  const [studentsLoading, setStudentsLoading] = useState(true)
  const [studentsError, setStudentsError] = useState('')
  const [reportLoading, setReportLoading] = useState(false)
  const [reportError, setReportError] = useState('')
  const [reload, setReload] = useState(0)
  const [loaded, setLoaded] = useState<LoadedReport | null>(null)
  const [text, setText] = useState('')
  const [baseline, setBaseline] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    let active = true
    fetchStudents(true)
      .then((items) => {
        if (!active) return
        setStudents(items)
        setStudentId((previous) => previous || items[0]?.id || '')
      })
      .catch((cause: unknown) => {
        if (active) setStudentsError(cause instanceof Error ? cause.message : 'Could not load students.')
      })
      .finally(() => { if (active) setStudentsLoading(false) })
    return () => { active = false }
  }, [])

  const key = studentId + '/' + month
  useEffect(() => {
    if (!studentId || !month) return
    let active = true
    fetchMonthlyReport(studentId, month)
      .then(({ draft, saved }) => {
        if (!active) return
        setLoaded({ key, draft, saved })
        const initial = saved?.text ?? draft.text
        setText(initial)
        setBaseline(initial)
      })
      .catch((cause: unknown) => {
        if (active) setReportError(cause instanceof Error ? cause.message : 'Could not load the report.')
      })
      .finally(() => { if (active) setReportLoading(false) })
    return () => { active = false }
  }, [studentId, month, reload, key])

  const current = loaded?.key === key ? loaded : null
  const reportPending = !!studentId && (reportLoading || (!current && !reportError))
  const dirty = !!current && text !== baseline
  const selectedStudent = students.find((student) => student.id === studentId)

  function canSwitch(): boolean {
    return !saving && (!dirty || window.confirm('Discard unsaved report changes?'))
  }

  async function save() {
    if (!current || saving) return
    setSaving(true)
    setMessage('')
    setReportError('')
    try {
      const saved = await saveMonthlyReport(studentId, month, text)
      setLoaded({ ...current, saved })
      setText(saved.text)
      setBaseline(saved.text)
      setMessage('Report saved. Your edits will remain after refresh.')
    } catch (cause) {
      setReportError(cause instanceof Error ? cause.message : 'Could not save the report.')
    } finally {
      setSaving(false)
    }
  }

  function useCurrentDraft() {
    if (!current || !canSwitch()) return
    setText(current.draft.text)
    setMessage('Draft rebuilt from the latest records. Save to keep this version.')
  }

  async function copyText() {
    try {
      await navigator.clipboard.writeText(text)
      setMessage('Current report text copied.')
    } catch {
      setMessage('Could not copy. Select the report text and copy it manually.')
    }
  }

  function downloadText() {
    if (!current) return
    const url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url
    link.download = `tutortrack-${studentId}-${month}.txt`
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    setMessage('Current report text downloaded. Save separately to keep edits in TutorTrack.')
  }

  return (
    <>
      <PageHeader title="Monthly feedback" description="Create an evidence-based draft, edit it, and save it for later." />
      <SectionCard title="Choose a student and month" description="Archived students remain available for historical reports.">
        <div className="grid gap-4 p-4 sm:grid-cols-2">
          <FormField id="report-student" label="Student">
            <NativeSelect
              id="report-student"
              value={studentId}
              disabled={studentsLoading || saving}
              onChange={(event) => { if (canSwitch()) { setReportError(''); setMessage(''); setStudentId(event.target.value) } }}
            >
              {students.length === 0 && <option value="">No students yet</option>}
              {students.map((student) => (
                <option key={student.id} value={student.id}>
                  {fullName(student)}{student.archived ? ' (archived)' : ''}
                </option>
              ))}
            </NativeSelect>
          </FormField>
          <FormField id="report-month" label="Calendar month">
            <input
              id="report-month"
              type="month"
              required
              value={month}
              disabled={saving}
              onChange={(event) => { if (canSwitch()) { setReportError(''); setMessage(''); setMonth(event.target.value) } }}
              className="h-9 w-full rounded-lg border border-input bg-background px-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </FormField>
        </div>
      </SectionCard>

      {studentsError && <p role="alert" className="mt-4 text-sm text-destructive">{studentsError}</p>}
      {studentsLoading && <p role="status" className="mt-4 text-sm text-muted-foreground">Loading students…</p>}
      {!studentsLoading && !studentsError && students.length === 0 && (
        <SectionCard title="No students yet" className="mt-4">
          <EmptyState title="Add a student first" description="Monthly feedback is based on that student's lesson and progress records." />
        </SectionCard>
      )}
      {reportPending && <p role="status" className="mt-4 text-sm text-muted-foreground">Preparing report…</p>}
      {reportError && (
        <div role="alert" className="mt-4 flex flex-wrap gap-3 text-sm text-destructive">
          <span>{reportError}</span>
          {!current && <button type="button" className="underline" onClick={() => { setReportError(''); setReportLoading(true); setReload((value) => value + 1) }}>Retry</button>}
        </div>
      )}
      {current && selectedStudent && (
        <div className="mt-4 grid gap-4 md:mt-6 md:gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <SectionCard
            title={`Report for ${fullName(selectedStudent)}`}
            description={current.saved ? 'Saved report loaded. You can edit and save it again.' : 'Unsaved draft based on the current records.'}
          >
            <div className="space-y-4 p-4">
              <label htmlFor="report-text" className="block text-sm font-medium">Report text</label>
              <Textarea
                id="report-text"
                value={text}
                maxLength={50000}
                rows={18}
                className="min-h-80 resize-y whitespace-pre-wrap font-mono text-sm"
                onChange={(event) => { setText(event.target.value); setMessage('') }}
              />
              {message && <p role="status" className="text-sm text-muted-foreground">{message}</p>}
              <div className="flex flex-wrap gap-2">
                <Button type="button" onClick={() => void save()} disabled={saving || !text.trim()}>
                  {saving ? 'Saving…' : current.saved ? 'Save changes' : 'Save report'}
                </Button>
                <Button type="button" variant="outline" onClick={() => void copyText()}>Copy text</Button>
                <Button type="button" variant="outline" onClick={downloadText}>Download .txt</Button>
              </div>
              {dirty && <p className="text-xs text-muted-foreground">Unsaved changes</p>}
            </div>
          </SectionCard>
          <SectionCard title="Source records" description="The saved text stays editable even if records change later.">
            <div className="space-y-4 p-4 text-sm">
              <p><strong>{current.draft.completedSessions}</strong> completed {current.draft.completedSessions === 1 ? 'session' : 'sessions'} this month</p>
              <p><strong>{current.draft.topics.length}</strong> recorded {current.draft.topics.length === 1 ? 'topic' : 'topics'}</p>
              <p><strong>{current.draft.progressEvidence.length}</strong> evidenced {current.draft.progressEvidence.length === 1 ? 'note' : 'notes'} of progress</p>
              {current.draft.completedSessions === 0 && (
                <p className="text-muted-foreground">No completed lessons were recorded for this month. The draft will not infer them.</p>
              )}
              <button type="button" className="text-left font-medium text-primary underline" onClick={useCurrentDraft}>
                Rebuild text from records
              </button>
            </div>
          </SectionCard>
        </div>
      )}
    </>
  )
}
