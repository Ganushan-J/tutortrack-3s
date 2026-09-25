'use client'

import { useState } from 'react'
import { ExternalLink, Link2, Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

function normaliseUrl(value: string): string | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
  try {
    const url = new URL(withProtocol)
    return url.hostname.includes('.') ? url.toString() : null
  } catch {
    return null
  }
}

export function ResourceLinksInput({ links, onChange }: { links: string[]; onChange: (links: string[]) => void }) {
  const [draft, setDraft] = useState('')
  const [error, setError] = useState('')

  function add() {
    const url = normaliseUrl(draft)
    if (!url) {
      setError('Enter a valid link, e.g. corbettmaths.com/...')
      return
    }
    if (!links.includes(url)) onChange([...links, url])
    setDraft('')
    setError('')
  }

  return (
    <div className="flex flex-col gap-3">
      {links.length > 0 && (
        <ul className="flex flex-col gap-2">
          {links.map((url) => (
            <li key={url} className="flex items-center gap-2 rounded-lg border border-border bg-secondary/50 py-1.5 pr-1.5 pl-3">
              <Link2 className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex min-w-0 flex-1 items-center gap-1.5 truncate text-sm text-primary hover:underline"
              >
                <span className="truncate">{url}</span>
                <ExternalLink className="size-3 shrink-0" aria-hidden="true" />
              </a>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => onChange(links.filter((l) => l !== url))}
                aria-label={`Remove ${url}`}
              >
                <X aria-hidden="true" />
              </Button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex max-w-xl gap-2">
        <label htmlFor="resource-link" className="sr-only">
          Resource link
        </label>
        <Input
          id="resource-link"
          type="url"
          inputMode="url"
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value)
            if (error) setError('')
          }}
          onKeyDown={(e) => {
            if (e.key !== 'Enter') return
            e.preventDefault()
            if (e.nativeEvent.isComposing || e.keyCode === 229) return
            add()
          }}
          placeholder="Paste a link"
          aria-invalid={!!error}
          aria-describedby={error ? 'resource-link-error' : undefined}
          autoComplete="off"
        />
        <Button type="button" variant="outline" onClick={add} disabled={!draft.trim()}>
          <Plus data-icon="inline-start" aria-hidden="true" />
          Add
        </Button>
      </div>
      {error && (
        <p id="resource-link-error" className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}
