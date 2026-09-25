'use client'

import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { todayISO } from './dates'
import { createId } from './lessons'
import { createSampleData } from './sample-data'
import type { Lesson, LessonInput, NewStudent, Student } from './types'

/**
 * In-memory store for the frontend-only build. When the Flask API is ready,
 * swap these actions for API calls (e.g. via SWR) — components only use this hook.
 */
interface TutorStore {
  today: string
  students: Student[]
  lessons: Lesson[]
  getStudent: (id: string) => Student | undefined
  getLesson: (id: string) => Lesson | undefined
  addStudent: (student: NewStudent) => Student
  updateStudent: (id: string, changes: Partial<NewStudent>) => void
  addLesson: (lesson: LessonInput) => Lesson
  updateLesson: (id: string, changes: Partial<LessonInput>) => void
}

const TutorStoreContext = createContext<TutorStore | null>(null)

export function TutorStoreProvider({ children }: { children: React.ReactNode }) {
  const [initial] = useState(() => {
    const today = todayISO()
    return { today, ...createSampleData(today) }
  })
  const [students, setStudents] = useState<Student[]>(initial.students)
  const [lessons, setLessons] = useState<Lesson[]>(initial.lessons)
  const { today } = initial

  const getStudent = useCallback((id: string) => students.find((s) => s.id === id), [students])
  const getLesson = useCallback((id: string) => lessons.find((l) => l.id === id), [lessons])

  const addStudent = useCallback(
    (input: NewStudent) => {
      const student: Student = { ...input, id: createId('stu'), createdAt: today }
      setStudents((prev) => [...prev, student])
      return student
    },
    [today],
  )

  const updateStudent = useCallback((id: string, changes: Partial<NewStudent>) => {
    setStudents((prev) => prev.map((s) => (s.id === id ? { ...s, ...changes } : s)))
  }, [])

  const addLesson = useCallback((input: LessonInput) => {
    const lesson: Lesson = { ...input, id: createId('les') }
    setLessons((prev) => [...prev, lesson])
    return lesson
  }, [])

  const updateLesson = useCallback((id: string, changes: Partial<LessonInput>) => {
    setLessons((prev) => prev.map((l) => (l.id === id ? { ...l, ...changes } : l)))
  }, [])

  const value = useMemo(
    () => ({
      today,
      students,
      lessons,
      getStudent,
      getLesson,
      addStudent,
      updateStudent,
      addLesson,
      updateLesson,
    }),
    [today, students, lessons, getStudent, getLesson, addStudent, updateStudent, addLesson, updateLesson],
  )

  return <TutorStoreContext.Provider value={value}>{children}</TutorStoreContext.Provider>
}

export function useTutorStore(): TutorStore {
  const store = useContext(TutorStoreContext)
  if (!store) throw new Error('useTutorStore must be used within TutorStoreProvider')
  return store
}
