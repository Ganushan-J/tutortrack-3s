import type { Metadata } from 'next'
import { LessonForm } from '@/components/lesson-form/lesson-form'

export const metadata: Metadata = { title: 'Lesson notes' }

export default async function EditLessonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <LessonForm lessonId={id} />
}
