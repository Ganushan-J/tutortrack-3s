import type { Lesson, Student } from './types'

export function compareLessonsAsc(a: Lesson, b: Lesson): number {
  return a.date === b.date ? a.startTime.localeCompare(b.startTime) : a.date.localeCompare(b.date)
}

export function compareLessonsDesc(a: Lesson, b: Lesson): number {
  return compareLessonsAsc(b, a)
}

export function isUpcoming(lesson: Lesson, today: string): boolean {
  return lesson.status === 'scheduled' && lesson.date >= today
}

/** Missing note fields for a lesson that has already taken place. */
export function missingNoteFields(lesson: Lesson): string[] {
  const missing: string[] = []
  if (lesson.topicsCovered.length === 0) missing.push('Topics')
  if (!lesson.strengths.trim()) missing.push('Strengths')
  if (!lesson.difficulties.trim()) missing.push('Difficulties')
  if (!lesson.homework.trim()) missing.push('Homework')
  if (!lesson.nextLessonPlan.trim()) missing.push('Next plan')
  return missing
}

/**
 * A lesson needs notes if it was taught but notes are incomplete,
 * or it's in the past and was never marked as completed/cancelled.
 */
export function needsNotes(lesson: Lesson, today: string): boolean {
  if (lesson.status === 'cancelled') return false
  if (lesson.status === 'scheduled') return lesson.date < today
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
