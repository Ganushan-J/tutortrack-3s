'use client'

import { useEffect, useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { FormField, NativeSelect } from '@/components/form-controls'
import { EmptyState, SectionCard } from '@/components/shared'
import { createProgress, fetchProgress, updateProgress } from '@/lib/api'
import type { Lesson, ObservationInput, ProgressStatus, TopicObservation } from '@/lib/types'

const statusLabels: Record<ProgressStatus, string> = {
  needs_support: 'Needs support', developing: 'Developing', independent: 'Independent',
}

function initialDraft(topic: string, date: string): ObservationInput {
  return { topic, status: 'needs_support', observedOn: date, evidence: '', nextAction: '', lessonId: null }
}

export function TopicProgress({ studentId, nextTopic, today, lessons }: { studentId: string; nextTopic: string; today: string; lessons: Lesson[] }) {
  const [items, setItems] = useState<TopicObservation[]>([])
  const [draft, setDraft] = useState<ObservationInput>(() => initialDraft(nextTopic, today))
  const [editingId, setEditingId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let active = true
    fetchProgress(studentId)
      .then((observations) => { if (active) { setItems(observations); setLoadError('') } })
      .catch((cause: unknown) => { if (active) setLoadError(cause instanceof Error ? cause.message : 'Could not load progress.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [studentId])

  function edit(item: TopicObservation) {
    setEditingId(item.id)
    setDraft({ topic: item.topic, status: item.status, observedOn: item.observedOn, evidence: item.evidence, nextAction: item.nextAction, lessonId: item.lessonId })
    setFormError('')
    document.getElementById('progress-topic')?.focus()
  }

  function reset() {
    setEditingId(null)
    setDraft(initialDraft(nextTopic, today))
    setFormError('')
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (saving) return
    setSaving(true)
    setFormError('')
    try {
      const result = editingId ? await updateProgress(editingId, draft) : await createProgress(studentId, draft)
      setItems((previous) => [...previous.filter((item) => item.id !== result.id), result]
        .sort((a, b) => b.observedOn.localeCompare(a.observedOn) || b.id.localeCompare(a.id)))
      reset()
    } catch (cause) {
      setFormError(cause instanceof Error ? cause.message : 'Could not save observation.')
    } finally {
      setSaving(false)
    }
  }

  async function retry() {
    setLoading(true)
    try {
      setItems(await fetchProgress(studentId))
      setLoadError('')
    } catch (cause) {
      setLoadError(cause instanceof Error ? cause.message : 'Could not load progress.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <SectionCard title="Topic progress" description="Dated observations keep the full learning history.">
      <form onSubmit={save} className="flex flex-col gap-3 border-b border-border p-4">
        {formError && <p role="alert" className="text-sm text-destructive">{formError}</p>}
        <FormField id="progress-topic" label="Topic">
          <Input id="progress-topic" required maxLength={120} value={draft.topic} onChange={(event) => setDraft({ ...draft, topic: event.target.value })} placeholder="e.g. Linear equations" />
        </FormField>
        <div className="grid gap-3 sm:grid-cols-2">
          <FormField id="progress-status" label="Status">
            <NativeSelect id="progress-status" value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value as ProgressStatus })}>
              {Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </NativeSelect>
          </FormField>
          <FormField id="progress-date" label="Observed on">
            <Input id="progress-date" type="date" required value={draft.observedOn} onChange={(event) => setDraft({ ...draft, observedOn: event.target.value })} />
          </FormField>
        </div>
        <FormField id="progress-evidence" label="Evidence or brief note">
          <Textarea id="progress-evidence" rows={2} maxLength={2000} value={draft.evidence} onChange={(event) => setDraft({ ...draft, evidence: event.target.value })} placeholder="What did the student demonstrate?" />
        </FormField>
        <FormField id="progress-next-action" label="Next action">
          <Textarea id="progress-next-action" rows={2} maxLength={2000} value={draft.nextAction} onChange={(event) => setDraft({ ...draft, nextAction: event.target.value })} placeholder="What should we practise next?" />
        </FormField>
        <FormField id="progress-lesson" label="Related lesson (optional)">
          <NativeSelect id="progress-lesson" value={draft.lessonId ?? ''} onChange={(event) => setDraft({ ...draft, lessonId: event.target.value || null })}>
            <option value="">None</option>
            {[...lessons].sort((a, b) => b.date.localeCompare(a.date)).map((lesson) => (
              <option key={lesson.id} value={lesson.id}>{lesson.date} · {lesson.topicsCovered.join(', ') || 'Lesson'}</option>
            ))}
          </NativeSelect>
        </FormField>
        <div className="flex items-center gap-3">
          <Button type="submit" disabled={saving}>{saving ? 'Saving…' : editingId ? 'Save observation' : 'Add observation'}</Button>
          {editingId && <button type="button" onClick={reset} className="text-sm text-muted-foreground hover:text-foreground">Cancel</button>}
        </div>
      </form>
      {loading ? <p role="status" className="p-4 text-sm text-muted-foreground">Loading progress…</p> : loadError ? (
        <div role="alert" className="p-4 text-sm text-destructive">{loadError} <button type="button" onClick={() => void retry()} className="underline">Retry</button></div>
      ) : items.length === 0 ? (
        <EmptyState title="No observations yet" description="Add the first dated observation above." />
      ) : (
        <ol className="divide-y divide-border">
          {items.map((item) => (
            <li key={item.id} className="space-y-1 p-4 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-medium">{item.topic}</span>
                <button type="button" onClick={() => edit(item)} className="text-xs font-medium text-primary hover:underline">Edit</button>
              </div>
              <p className="text-xs text-muted-foreground"><time dateTime={item.observedOn}>{item.observedOn}</time> · {statusLabels[item.status]}</p>
              {item.evidence && <p className="text-muted-foreground">Evidence: {item.evidence}</p>}
              {item.nextAction && <p>Next: {item.nextAction}</p>}
            </li>
          ))}
        </ol>
      )}
    </SectionCard>
  )
}
