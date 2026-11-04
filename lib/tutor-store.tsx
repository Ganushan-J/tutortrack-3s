'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import {
  createLesson as postLesson,
  createStudent as postStudent,
  fetchLessons,
  fetchStudents,
  updateLesson as patchLesson,
  updateStudent as patchStudent,
} from './api'
import { todayISO } from './dates'
import type { Lesson, LessonInput, NewStudent, Student } from './types'

/** The Flask API is the source of truth; this context caches its responses for the UI. */
interface TutorStore {
  today: string
  students: Student[]
  lessons: Lesson[]
  loading: boolean
  loadError: string | null
  reload: () => void
  getStudent: (id: string) => Student | undefined
  getLesson: (id: string) => Lesson | undefined
  addStudent: (student: NewStudent) => Promise<Student>
  updateStudent: (id: string, changes: Partial<NewStudent>) => Promise<Student>
  addLesson: (lesson: LessonInput) => Promise<Lesson>
  updateLesson: (id: string, changes: Partial<LessonInput>) => Promise<Lesson>
}

const TutorStoreContext = createContext<TutorStore | null>(null)

export function TutorStoreProvider({ children }: { children: React.ReactNode }) {
  const [today] = useState(todayISO)
  const [students, setStudents] = useState<Student[]>([])
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [revision, setRevision] = useState(0)

  useEffect(() => {
    let active = true
    setLoading(true)
    setLoadError(null)
    Promise.all([fetchStudents(), fetchLessons()])
      .then(([remoteStudents, remoteLessons]) => {
        if (!active) return
        setStudents(remoteStudents)
        setLessons(remoteLessons)
      })
      .catch((error: unknown) => {
        if (active) setLoadError(error instanceof Error ? error.message : 'Could not load TutorTrack data.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => { active = false }
  }, [revision])

  const reload = useCallback(() => setRevision((value) => value + 1), [])
  const getStudent = useCallback((id: string) => students.find((student) => student.id === id), [students])
  const getLesson = useCallback((id: string) => lessons.find((lesson) => lesson.id === id), [lessons])

  const addStudent = useCallback(async (input: NewStudent) => {
    const student = await postStudent(input)
    setStudents((previous) => [...previous, student])
    return student
  }, [])

  const updateStudent = useCallback(async (id: string, changes: Partial<NewStudent>) => {
    const student = await patchStudent(id, changes)
    setStudents((previous) => previous.map((item) => item.id === id ? student : item))
    return student
  }, [])

  const addLesson = useCallback(async (input: LessonInput) => {
    const lesson = await postLesson(input)
    setLessons((previous) => [...previous, lesson])
    return lesson
  }, [])

  const updateLesson = useCallback(async (id: string, changes: Partial<LessonInput>) => {
    const lesson = await patchLesson(id, changes)
    setLessons((previous) => previous.map((item) => item.id === id ? lesson : item))
    return lesson
  }, [])

  const value = useMemo(
    () => ({
      today, students, lessons, loading, loadError, reload,
      getStudent, getLesson, addStudent, updateStudent, addLesson, updateLesson,
    }),
    [today, students, lessons, loading, loadError, reload, getStudent, getLesson, addStudent, updateStudent, addLesson, updateLesson],
  )

  return <TutorStoreContext.Provider value={value}>{children}</TutorStoreContext.Provider>
}

export function useTutorStore(): TutorStore {
  const store = useContext(TutorStoreContext)
  if (!store) throw new Error('useTutorStore must be used within TutorStoreProvider')
  return store
}
