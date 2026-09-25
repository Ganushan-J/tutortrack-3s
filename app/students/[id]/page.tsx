import type { Metadata } from 'next'
import { StudentProfile } from '@/components/student-profile/student-profile'

export const metadata: Metadata = { title: 'Student profile' }

export default async function StudentProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <StudentProfile studentId={id} />
}
