'use client'

import { useState, type FormEvent } from 'react'
import { ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FormField, NativeSelect } from '@/components/form-controls'
import { EmptyState, PageHeader, SectionCard } from '@/components/shared'
import { useTutorStore } from '@/lib/tutor-store'
import { RESOURCE_TIERS, type ResourceInput, type ResourceTier, type SavedResource } from '@/lib/types'

const blank: ResourceInput = { title: '', url: '', topic: '', tier: 'Both' }

export function ResourceLibrary() {
  const { resources, addResource, updateResource, loading, loadError } = useTutorStore()
  const [draft, setDraft] = useState<ResourceInput>(blank)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [tier, setTier] = useState<ResourceTier>('Both')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  if (loading || loadError) return null

  const matches = resources.filter((resource) => {
    const term = search.trim().toLowerCase()
    return (tier === 'Both' || resource.tier === tier || resource.tier === 'Both') &&
      (!term || `${resource.title} ${resource.topic}`.toLowerCase().includes(term))
  }).sort((a, b) => a.topic.localeCompare(b.topic) || a.title.localeCompare(b.title))

  function edit(resource: SavedResource) {
    setEditingId(resource.id)
    setDraft({ title: resource.title, url: resource.url, topic: resource.topic, tier: resource.tier })
    setError('')
    document.getElementById('resource-title')?.focus()
  }

  function reset() {
    setEditingId(null)
    setDraft(blank)
    setError('')
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (saving) return
    setSaving(true)
    setError('')
    try {
      if (editingId) await updateResource(editingId, draft)
      else await addResource(draft)
      reset()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save resource.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <PageHeader title="Resources" description="Save worksheets, videos and past papers to reuse across lessons." />
      <div className="grid gap-4 md:gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <SectionCard title="Saved links" description={`${resources.length} in your library`}>
          <div className="grid gap-3 border-b border-border p-4 sm:grid-cols-[1fr_10rem]">
            <Input aria-label="Search resources" placeholder="Search title or topic" value={search} onChange={(event) => setSearch(event.target.value)} />
            <NativeSelect aria-label="Filter by tier" value={tier} onChange={(event) => setTier(event.target.value as ResourceTier)}>
              {RESOURCE_TIERS.map((item) => <option key={item} value={item}>{item === 'Both' ? 'All tiers' : item}</option>)}
            </NativeSelect>
          </div>
          {matches.length === 0 ? (
            <EmptyState title={resources.length ? 'No matching resources' : 'No resources yet'} description={resources.length ? 'Try another search or tier.' : 'Add a useful link with its topic and tier.'} />
          ) : (
            <ul className="divide-y divide-border">
              {matches.map((resource) => (
                <li key={resource.id} className="flex flex-wrap items-start justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <p className="font-medium">{resource.title}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{resource.topic} · {resource.tier}</p>
                    {/^https?:\/\//i.test(resource.url) && (
                      <a href={resource.url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex max-w-full items-center gap-1 truncate text-sm text-primary hover:underline">
                        Open link <ExternalLink className="size-3.5" aria-hidden="true" />
                      </a>
                    )}
                  </div>
                  <button type="button" onClick={() => edit(resource)} className="text-sm font-medium text-primary hover:underline">Edit</button>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard title={editingId ? 'Edit resource' : 'Add resource'}>
          <form onSubmit={save} className="flex flex-col gap-4 p-4">
            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
            <FormField id="resource-title" label="Title">
              <Input id="resource-title" required maxLength={160} value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} placeholder="Algebra worksheet" />
            </FormField>
            <FormField id="resource-url" label="URL">
              <Input id="resource-url" type="url" required maxLength={500} value={draft.url} onChange={(event) => setDraft({ ...draft, url: event.target.value })} placeholder="https://..." />
            </FormField>
            <FormField id="resource-topic" label="Topic">
              <Input id="resource-topic" required maxLength={120} value={draft.topic} onChange={(event) => setDraft({ ...draft, topic: event.target.value })} placeholder="Linear equations" />
            </FormField>
            <FormField id="resource-tier" label="Tier">
              <NativeSelect id="resource-tier" value={draft.tier} onChange={(event) => setDraft({ ...draft, tier: event.target.value as ResourceTier })}>
                {RESOURCE_TIERS.map((item) => <option key={item} value={item}>{item}</option>)}
              </NativeSelect>
            </FormField>
            <div className="flex gap-2">
              <Button type="submit" disabled={saving}>{saving ? 'Saving…' : editingId ? 'Save changes' : 'Add link'}</Button>
              {editingId && <button type="button" onClick={reset} className="text-sm text-muted-foreground hover:text-foreground">Cancel</button>}
            </div>
          </form>
        </SectionCard>
      </div>
    </>
  )
}
