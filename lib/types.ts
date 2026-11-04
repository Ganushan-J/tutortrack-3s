export const YEAR_GROUPS = ['Year 9', 'Year 10', 'Year 11', 'Post-16 resit'] as const
export const EXAM_BOARDS = ['AQA', 'Edexcel', 'OCR', 'WJEC Eduqas'] as const
export const TIERS = ['Foundation', 'Higher'] as const
export const LESSON_STATUSES = ['scheduled', 'completed', 'cancelled'] as const
export const LESSON_DURATIONS = [30, 45, 60, 90] as const
export const PROGRESS_STATUSES = ['needs_support', 'developing', 'independent'] as const
export const RESOURCE_TIERS = ['Both', 'Foundation', 'Higher'] as const

export type YearGroup = (typeof YEAR_GROUPS)[number]
export type ExamBoard = (typeof EXAM_BOARDS)[number]
export type Tier = (typeof TIERS)[number]
export type LessonStatus = (typeof LESSON_STATUSES)[number]
export type ProgressStatus = (typeof PROGRESS_STATUSES)[number]
export type ResourceTier = (typeof RESOURCE_TIERS)[number]

/** GCSE grades 1–9. Foundation tier caps at grade 5. */
export type Grade = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9

export interface Student {
  id: string
  firstName: string
  lastName: string
  yearGroup: YearGroup
  examBoard: ExamBoard
  tier: Tier
  currentGrade: Grade
  targetGrade: Grade
  learningGoals: string[]
  nextTopic: string
  /** YYYY-MM-DD */
  createdAt: string
}

export interface Lesson {
  id: string
  studentId: string
  /** YYYY-MM-DD */
  date: string
  /** HH:mm (24h, UK local time) */
  startTime: string
  durationMinutes: number
  status: LessonStatus
  topicsCovered: string[]
  strengths: string
  difficulties: string
  homework: string
  resourceLinks: string[]
  /** Saved catalog resource IDs. Optional for legacy demo records. */
  resourceIds?: string[]
  nextLessonPlan: string
}

export interface TopicObservation {
  id: string
  studentId: string
  lessonId: string | null
  topic: string
  status: ProgressStatus
  observedOn: string
  evidence: string
  nextAction: string
}

export type ObservationInput = Pick<TopicObservation, 'topic' | 'status' | 'observedOn' | 'evidence' | 'nextAction'> & { lessonId?: string | null }

export interface SavedResource {
  id: string
  title: string
  url: string
  topic: string
  tier: ResourceTier
  createdAt: string
}

export type ResourceInput = Pick<SavedResource, 'title' | 'url' | 'topic' | 'tier'>

export type NewStudent = Omit<Student, 'id' | 'createdAt'>
export type LessonInput = Omit<Lesson, 'id'>
