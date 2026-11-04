import type { Lesson, LessonInput, NewStudent, Student } from './types'

const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? 'http://127.0.0.1:5000').replace(/\/$/, '')

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

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response
  try {
    response = await fetch(API_URL + path, { ...init, cache: 'no-store' })
  } catch {
    throw new ApiError(0, 'Could not reach the Flask API. Start backend/app.py and check NEXT_PUBLIC_API_URL.')
  }

  let body: { error?: string; errors?: Record<string, string> } & Partial<T>
  try {
    body = await response.json()
  } catch {
    throw new ApiError(response.status, 'The API returned an invalid response.')
  }

  if (!response.ok) {
    throw new ApiError(response.status, body.error ?? 'Request failed with status ' + response.status, body.errors ?? {})
  }
  return body as T
}

function json(method: 'POST' | 'PATCH', input: unknown): RequestInit {
  return { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) }
}

export async function fetchStudents(): Promise<Student[]> {
  return (await request<{ students: Student[] }>('/api/students')).students
}

export async function createStudent(input: NewStudent): Promise<Student> {
  return (await request<{ student: Student }>('/api/students', json('POST', input))).student
}

export async function updateStudent(id: string, changes: Partial<NewStudent>): Promise<Student> {
  return (await request<{ student: Student }>('/api/students/' + encodeURIComponent(id), json('PATCH', changes))).student
}

export async function fetchLessons(): Promise<Lesson[]> {
  return (await request<{ lessons: Lesson[] }>('/api/lessons')).lessons
}

export async function createLesson(input: LessonInput): Promise<Lesson> {
  return (await request<{ lesson: Lesson }>('/api/lessons', json('POST', input))).lesson
}

export async function updateLesson(id: string, changes: Partial<LessonInput>): Promise<Lesson> {
  return (await request<{ lesson: Lesson }>('/api/lessons/' + encodeURIComponent(id), json('PATCH', changes))).lesson
}
