'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import {
  createLesson as postLesson,
  createStudent as postStudent,
  fetchLessons,
  fetchStudents,
  fetchResources,
  createResource as postResource,
  updateResource as patchResource,
  updateLesson as patchLesson,
  updateStudent as patchStudent,
  setStudentArchived as postArchiveState,
} from './api'
import { londonClock, todayISO } from './dates'
import type { Lesson, LessonInput, NewStudent, Student, SavedResource, ResourceInput } from './types'

/** The Flask API is the source of truth; this context caches its responses for the UI. */
interface TutorStore {
  today: string
  clock: string
  students: Student[]
  lessons: Lesson[]
  resources: SavedResource[]
  loading: boolean
  loadError: string | null
  reload: () => void
  getStudent: (id: string) => Student | undefined
  getLesson: (id: string) => Lesson | undefined
  addStudent: (student: NewStudent) => Promise<Student>
  updateStudent: (id: string, changes: Partial<NewStudent>) => Promise<Student>
  setArchived: (id: string, archived: boolean) => Promise<Student>
  addLesson: (lesson: LessonInput) => Promise<Lesson>
  updateLesson: (id: string, changes: Partial<LessonInput>) => Promise<Lesson>
  addResource: (resource: ResourceInput) => Promise<SavedResource>
  updateResource: (id: string, changes: Partial<ResourceInput>) => Promise<SavedResource>
}

const TutorStoreContext = createContext<TutorStore | null>(null)

export function TutorStoreProvider({ children }: { children: React.ReactNode }) {
  const [today, setToday] = useState(todayISO)
  const [clock, setClock] = useState(londonClock)
  const [students, setStudents] = useState<Student[]>([])
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [resources, setResources] = useState<SavedResource[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [revision, setRevision] = useState(0)

  // Refresh civil-day and clock-sensitive dashboard views while the tab stays open.
  useEffect(() => {
    const timer = window.setInterval(() => {
      setToday(todayISO())
      setClock(londonClock())
    }, 60_000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    let active = true
    Promise.all([fetchStudents(true), fetchLessons(), fetchResources()])
      .then(([remoteStudents, remoteLessons, remoteResources]) => {
        if (!active) return
        setStudents(remoteStudents)
        setLessons(remoteLessons)
        setResources(remoteResources)
      })
      .catch((error: unknown) => {
        if (active) setLoadError(error instanceof Error ? error.message : 'Could not load TutorTrack data.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => { active = false }
  }, [revision])

  const reload = useCallback(() => {
    setLoading(true)
    setLoadError(null)
    setRevision((value) => value + 1)
  }, [])
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

  const setArchived = useCallback(async (id: string, archived: boolean) => {
    const student = await postArchiveState(id, archived)
    setStudents((previous) => previous.map((item) => item.id === id ? student : item))
    return student
  }, [])

  const addLesson = useCallback(async (input: LessonInput) => {
    const { lesson, student } = await postLesson(input)
    setLessons((previous) => [...previous, lesson])
    if (student) setStudents((previous) => previous.map((item) => item.id === student.id ? student : item))
    return lesson
  }, [])

  const updateLesson = useCallback(async (id: string, changes: Partial<LessonInput>) => {
    const { lesson, student } = await patchLesson(id, changes)
    setLessons((previous) => previous.map((item) => item.id === id ? lesson : item))
    if (student) setStudents((previous) => previous.map((item) => item.id === student.id ? student : item))
    return lesson
  }, [])

  const addResource = useCallback(async (input: ResourceInput) => {
    const resource = await postResource(input)
    setResources((previous) => [...previous, resource])
    return resource
  }, [])

  const updateResource = useCallback(async (id: string, changes: Partial<ResourceInput>) => {
    const resource = await patchResource(id, changes)
    setResources((previous) => previous.map((item) => item.id === id ? resource : item))
    return resource
  }, [])

  const value = useMemo(
    () => ({
      today, clock, students, lessons, resources, loading, loadError, reload,
      getStudent, getLesson, addStudent, updateStudent, setArchived, addLesson, updateLesson, addResource, updateResource,
    }),
    [today, clock, students, lessons, resources, loading, loadError, reload, getStudent, getLesson, addStudent, updateStudent, setArchived, addLesson, updateLesson, addResource, updateResource],
  )

  return <TutorStoreContext.Provider value={value}>{children}</TutorStoreContext.Provider>
}

export function useTutorStore(): TutorStore {
  const store = useContext(TutorStoreContext)
  if (!store) throw new Error('useTutorStore must be used within TutorStoreProvider')
  return store
}
