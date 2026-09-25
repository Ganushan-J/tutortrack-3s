import { cn } from '@/lib/utils'

export function StatCard({
  label,
  value,
  highlight = false,
}: {
  label: string
  value: number | string
  highlight?: boolean
}) {
  return (
    <div
      className={cn(
        'flex flex-col gap-2 rounded-xl border border-border bg-card px-4 py-4 md:px-5',
        highlight && 'border-primary/40 bg-primary/10',
      )}
    >
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className={cn('font-mono text-2xl font-semibold tabular-nums md:text-3xl', highlight && 'text-primary')}>
        {value}
      </p>
    </div>
  )
}
