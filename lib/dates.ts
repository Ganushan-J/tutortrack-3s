const UK_TIME_ZONE = 'Europe/London'

/** Today's date (YYYY-MM-DD) in UK time, so server and browser agree. */
export function todayISO(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: UK_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

function parseISODate(iso: string): Date {
  const [year, month, day] = iso.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day))
}

export function addDays(iso: string, days: number): string {
  const date = parseISODate(iso)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

export function daysBetween(fromISO: string, toISO: string): number {
  return Math.round((parseISODate(toISO).getTime() - parseISODate(fromISO).getTime()) / 86_400_000)
}

function formatUTC(iso: string, options: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', ...options }).format(parseISODate(iso))
}

/** e.g. "Fri 25 Sep" */
export function formatShortDate(iso: string): string {
  return formatUTC(iso, { weekday: 'short', day: 'numeric', month: 'short' })
}

/** e.g. "Friday 25 September 2026" */
export function formatLongDate(iso: string): string {
  return formatUTC(iso, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

/** "Today", "Tomorrow", "Yesterday" or a short date. */
export function formatRelativeDay(iso: string, today: string): string {
  const diff = daysBetween(today, iso)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Tomorrow'
  if (diff === -1) return 'Yesterday'
  return formatShortDate(iso)
}

export function formatTimeRange(startTime: string, durationMinutes: number): string {
  const [hours, minutes] = startTime.split(':').map(Number)
  const endTotal = hours * 60 + minutes + durationMinutes
  const end = `${String(Math.floor(endTotal / 60) % 24).padStart(2, '0')}:${String(endTotal % 60).padStart(2, '0')}`
  return `${startTime}–${end}`
}
