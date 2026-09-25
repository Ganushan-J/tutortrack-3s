import type { Metadata } from 'next'
import { StudentDirectory } from '@/components/students/student-directory'

export const metadata: Metadata = { title: 'Students' }

export default function StudentsPage() {
  return <StudentDirectory />
}
