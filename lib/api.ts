import type { Lesson, LessonInput, NewStudent, Student } from './types'

// Next.js forwards same-origin /api requests to Flask so the session cookie
// belongs to the UI origin. No database credentials or Flask URL reach JS.
let csrfToken: string | null = null
let onUnauthorized: (() => void) | null = null

export function setUnauthorizedHandler(handler: (() => void) | null) {
  onUnauthorized = handler
}

function setCsrfToken(token: string | null) {
  csrfToken = token
}

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
    const headers = new Headers(init?.headers)
    if (init?.method && init.method !== 'GET' && csrfToken) headers.set('X-CSRF-Token', csrfToken)
    response = await fetch(path, { ...init, headers, credentials: 'same-origin', cache: 'no-store' })
  } catch {
    throw new ApiError(0, 'Could not reach the Flask API. Start backend/app.py and check FLASK_API_ORIGIN.')
  }

  let body: { error?: string; errors?: Record<string, string> } & Partial<T>
  try {
    body = await response.json()
  } catch {
    throw new ApiError(response.status, 'The API returned an invalid response.')
  }

  if (!response.ok) {
    if (response.status === 401 && path !== '/api/auth/login') {
      setCsrfToken(null)
      onUnauthorized?.()
    }
    throw new ApiError(response.status, body.error ?? 'Request failed with status ' + response.status, body.errors ?? {})
  }
  return body as T
}

function json(method: 'POST' | 'PATCH', input: unknown): RequestInit {
  return { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) }
}

export interface TutorUser { id: string; email: string }
interface SessionResponse { user: TutorUser; csrfToken: string }

export async function getSession(): Promise<TutorUser> {
  const session = await request<SessionResponse>('/api/auth/me')
  setCsrfToken(session.csrfToken)
  return session.user
}

export async function signIn(email: string, password: string): Promise<TutorUser> {
  const session = await request<SessionResponse>('/api/auth/login', json('POST', { email, password }))
  setCsrfToken(session.csrfToken)
  return session.user
}

export async function signOut(): Promise<void> {
  await request<{ ok: boolean }>('/api/auth/logout', { method: 'POST' })
  setCsrfToken(null)
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
