import { cn } from '@/lib/utils'
import { initials } from '@/lib/lessons'
import type { LessonStatus, Student, Tier } from '@/lib/types'

export function PageHeader({
  title,
  description,
  actions,
  eyebrow,
}: {
  title: string
  description?: React.ReactNode
  actions?: React.ReactNode
  eyebrow?: React.ReactNode
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between md:mb-8">
      <div className="flex min-w-0 flex-col gap-1.5">
        {eyebrow}
        <h1 className="text-2xl font-semibold tracking-tight text-balance md:text-3xl">{title}</h1>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

export function SectionCard({
  title,
  description,
  action,
  children,
  className,
}: {
  title: string
  description?: string
  action?: React.ReactNode
  children: React.ReactNode
  className?: string
}) {
  return (
    <section className={cn('flex flex-col rounded-xl border border-border bg-card', className)}>
      <div className="flex items-start justify-between gap-4 border-b border-border px-4 py-3.5 md:px-5">
        <div className="flex flex-col gap-0.5">
          <h2 className="text-sm font-semibold">{title}</h2>
          {description && <p className="text-xs text-muted-foreground">{description}</p>}
        </div>
        {action}
      </div>
      <div className="flex-1">{children}</div>
    </section>
  )
}

export function StudentAvatar({
  student,
  size = 'md',
}: {
  student: Pick<Student, 'firstName' | 'lastName'>
  size?: 'sm' | 'md' | 'lg'
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'flex shrink-0 items-center justify-center rounded-full bg-secondary font-semibold text-secondary-foreground ring-1 ring-border',
        size === 'sm' && 'size-8 text-xs',
        size === 'md' && 'size-10 text-sm',
        size === 'lg' && 'size-14 text-lg',
      )}
    >
      {initials(student)}
    </span>
  )
}

const STATUS_STYLES: Record<LessonStatus, string> = {
  scheduled: 'bg-primary/15 text-primary',
  completed: 'bg-success/15 text-success',
  cancelled: 'bg-muted text-muted-foreground line-through decoration-muted-foreground/60',
}

export function LessonStatusBadge({ status }: { status: LessonStatus }) {
  return (
    <span
      className={cn(
        'inline-flex h-5 items-center rounded-full px-2 text-xs font-medium capitalize',
        STATUS_STYLES[status],
      )}
    >
      {status}
    </span>
  )
}

export function TierBadge({ tier }: { tier: Tier }) {
  return (
    <span
      className={cn(
        'inline-flex h-5 items-center rounded-full border px-2 text-xs font-medium',
        tier === 'Higher' ? 'border-primary/40 text-primary' : 'border-border text-muted-foreground',
      )}
    >
      {tier}
    </span>
  )
}

export function GradeProgress({ current, target }: { current: number; target: number }) {
  return (
    <span className="inline-flex items-center gap-1.5 font-mono text-sm tabular-nums">
      <span className="text-foreground">{current}</span>
      <span className="text-muted-foreground" aria-hidden="true">
        {'→'}
      </span>
      <span className="font-semibold text-primary">{target}</span>
      <span className="sr-only">{`Current grade ${current}, target grade ${target}`}</span>
    </span>
  )
}

export function TopicChip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-md bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">
      {children}
    </span>
  )
}

export function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="flex flex-col items-center gap-1 px-4 py-10 text-center">
      <p className="text-sm font-medium">{title}</p>
      {description && <p className="text-xs text-muted-foreground">{description}</p>}
    </div>
  )
}
