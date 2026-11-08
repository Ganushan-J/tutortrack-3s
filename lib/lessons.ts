import type { Lesson, Student } from './types'
import { addDays, londonClock } from './dates'

export function compareLessonsAsc(a: Lesson, b: Lesson): number {
  return a.date === b.date ? a.startTime.localeCompare(b.startTime) : a.date.localeCompare(b.date)
}

export function compareLessonsDesc(a: Lesson, b: Lesson): number {
  return compareLessonsAsc(b, a)
}

function minutes(clock: string): number {
  const [hour, minute] = clock.split(':').map(Number)
  return hour * 60 + minute
}

export function isUpcoming(lesson: Lesson, today: string, clock = londonClock()): boolean {
  if (lesson.status !== 'scheduled') return false
  if (lesson.date > today) return true
  const end = minutes(lesson.startTime) + lesson.durationMinutes
  if (lesson.date === today) return end > minutes(clock)
  // A late lesson may continue shortly after midnight.
  return addDays(lesson.date, 1) === today && end > 1440 + minutes(clock)
}

/** Completion rule: a topic and at least one useful recap field; others are optional. */
export function missingNoteFields(lesson: Lesson): string[] {
  const missing: string[] = []
  if (lesson.topicsCovered.length === 0) missing.push('Topics')
  if (![lesson.strengths, lesson.difficulties, lesson.homework, lesson.nextLessonPlan].some((field) => field.trim())) {
    missing.push('Recap')
  }
  return missing
}

/**
 * A lesson needs notes if it was taught but notes are incomplete,
 * or it's in the past and was never marked as completed/cancelled.
 */
export function needsNotes(lesson: Lesson, today: string, clock = londonClock()): boolean {
  if (lesson.status === 'cancelled') return false
  if (lesson.status === 'scheduled') return !isUpcoming(lesson, today, clock)
  return missingNoteFields(lesson).length > 0
}

export function fullName(student: Pick<Student, 'firstName' | 'lastName'>): string {
  return `${student.firstName} ${student.lastName}`
}

export function initials(student: Pick<Student, 'firstName' | 'lastName'>): string {
  return `${student.firstName.charAt(0)}${student.lastName.charAt(0)}`.toUpperCase()
}

export function createId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID().slice(0, 8)}`
}
