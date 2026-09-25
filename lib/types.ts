export const YEAR_GROUPS = ['Year 9', 'Year 10', 'Year 11', 'Post-16 resit'] as const
export const EXAM_BOARDS = ['AQA', 'Edexcel', 'OCR', 'WJEC Eduqas'] as const
export const TIERS = ['Foundation', 'Higher'] as const
export const LESSON_STATUSES = ['scheduled', 'completed', 'cancelled'] as const
export const LESSON_DURATIONS = [30, 45, 60, 90] as const

export type YearGroup = (typeof YEAR_GROUPS)[number]
export type ExamBoard = (typeof EXAM_BOARDS)[number]
export type Tier = (typeof TIERS)[number]
export type LessonStatus = (typeof LESSON_STATUSES)[number]

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
  nextLessonPlan: string
}

export type NewStudent = Omit<Student, 'id' | 'createdAt'>
export type LessonInput = Omit<Lesson, 'id'>
