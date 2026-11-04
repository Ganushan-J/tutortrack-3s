'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { createStudent, fetchStudents } from './api'
import { todayISO } from './dates'
import { createId } from './lessons'
import { createSampleData } from './sample-data'
import type { Lesson, LessonInput, NewStudent, Student } from './types'

/**
 * UI state for TutorTrack. Students come from the Flask API (PostgreSQL).
 * Sample students stay in memory so the existing dashboard still has demo data.
 * Lessons stay in memory until a later milestone.
 */
interface TutorStore {
  today: string
  students: Student[]
  lessons: Lesson[]
  getStudent: (id: string) => Student | undefined
  getLesson: (id: string) => Lesson | undefined
  addStudent: (student: NewStudent) => Promise<Student>
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

  useEffect(() => {
    const sampleIds = new Set(initial.students.map((student) => student.id))
    fetchStudents()
      .then((remote) => {
        setStudents((prev) => {
          const sample = prev.filter((student) => sampleIds.has(student.id))
          const seen = new Set(sample.map((student) => student.id))
          const extras = remote.filter((student) => {
            if (seen.has(student.id)) return false
            seen.add(student.id)
            return true
          })
          return [...sample, ...extras]
        })
      })
      .catch(() => {
        // Keep sample students if Flask is not running yet.
      })
  }, [initial.students])

  const getStudent = useCallback((id: string) => students.find((s) => s.id === id), [students])
  const getLesson = useCallback((id: string) => lessons.find((l) => l.id === id), [lessons])

  const addStudent = useCallback(async (input: NewStudent) => {
    const student = await createStudent(input)
    setStudents((prev) => [...prev, student])
    return student
  }, [])

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
