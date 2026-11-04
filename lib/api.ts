import type { NewStudent, Student } from './types'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://127.0.0.1:5000'

export class ApiError extends Error {
  status: number
  errors: Record<string, string>

  constructor(status: number, message: string, errors: Record<string, string> = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.errors = errors
  }
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json()
  } catch {
    return {}
  }
}

async function request(path: string, init?: RequestInit): Promise<unknown> {
  let response: Response
  try {
    response = await fetch(`${API_URL}${path}`, init)
  } catch {
    throw new ApiError(
      0,
      'Could not reach the Flask API. Start backend/app.py and check NEXT_PUBLIC_API_URL.',
    )
  }

  const body = (await readJson(response)) as {
    error?: string
    errors?: Record<string, string>
    students?: Student[]
    student?: Student
  }

  if (!response.ok) {
    throw new ApiError(
      response.status,
      body.error ?? `Request failed with status ${response.status}`,
      body.errors ?? {},
    )
  }

  return body
}

export async function fetchStudents(): Promise<Student[]> {
  const body = (await request('/api/students')) as { students: Student[] }
  return body.students
}

export async function createStudent(input: NewStudent): Promise<Student> {
  const body = (await request('/api/students', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })) as { student: Student }
  return body.student
}
