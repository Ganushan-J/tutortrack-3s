import type { Metadata } from 'next'
import { LessonForm } from '@/components/lesson-form/lesson-form'

export const metadata: Metadata = { title: 'Log lesson' }

export default async function NewLessonPage({
  searchParams,
}: {
  searchParams: Promise<{ studentId?: string | string[] }>
}) {
  const { studentId } = await searchParams
  return <LessonForm defaultStudentId={typeof studentId === 'string' ? studentId : undefined} />
}
