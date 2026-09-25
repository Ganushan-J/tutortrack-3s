'use client'

import { useState } from 'react'
import { Check, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { GCSE_TOPICS } from '@/lib/sample-data'
import { cn } from '@/lib/utils'

export function TopicPicker({ selected, onChange }: { selected: string[]; onChange: (topics: string[]) => void }) {
  const [custom, setCustom] = useState('')
  const options = [...GCSE_TOPICS, ...selected.filter((t) => !(GCSE_TOPICS as readonly string[]).includes(t))]

  function toggle(topic: string) {
    onChange(selected.includes(topic) ? selected.filter((t) => t !== topic) : [...selected, topic])
  }

  function addCustom() {
    const topic = custom.trim()
    if (!topic) return
    if (!selected.includes(topic)) onChange([...selected, topic])
    setCustom('')
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs text-muted-foreground" aria-live="polite">
        {selected.length === 0 ? 'No topics selected' : `${selected.length} selected: ${selected.join(', ')}`}
      </p>
      <ul className="flex flex-wrap gap-2" aria-label="GCSE topics">
        {options.map((topic) => {
          const active = selected.includes(topic)
          return (
            <li key={topic}>
              <button
                type="button"
                aria-pressed={active}
                onClick={() => toggle(topic)}
                className={cn(
                  'inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
                  active
                    ? 'border-primary bg-primary/15 text-primary'
                    : 'border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground',
                )}
              >
                {active && <Check className="size-3.5" aria-hidden="true" />}
                {topic}
              </button>
            </li>
          )
        })}
      </ul>
      <div className="flex max-w-md gap-2">
        <label htmlFor="custom-topic" className="sr-only">
          Add a custom topic
        </label>
        <Input
          id="custom-topic"
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          onKeyDown={(e) => {
            if (e.key !== 'Enter') return
            e.preventDefault()
            if (e.nativeEvent.isComposing || e.keyCode === 229) return
            addCustom()
          }}
          placeholder="Add another topic"
          autoComplete="off"
        />
        <Button type="button" variant="outline" onClick={addCustom} disabled={!custom.trim()}>
          <Plus data-icon="inline-start" aria-hidden="true" />
          Add
        </Button>
      </div>
      <datalist id="lesson-next-topics">
        {GCSE_TOPICS.map((t) => (
          <option key={t} value={t} />
        ))}
      </datalist>
    </div>
  )
}
