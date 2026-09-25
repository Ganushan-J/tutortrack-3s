'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { FormField, NativeSelect, SegmentedControl } from '@/components/form-controls'
import { GCSE_TOPICS } from '@/lib/sample-data'
import { useTutorStore } from '@/lib/tutor-store'
import { EXAM_BOARDS, TIERS, YEAR_GROUPS, type ExamBoard, type Grade, type Tier, type YearGroup } from '@/lib/types'

const ALL_GRADES: Grade[] = [1, 2, 3, 4, 5, 6, 7, 8, 9]
const maxGradeForTier = (tier: Tier) => (tier === 'Foundation' ? 5 : 9)

export function AddStudentForm({ onCancel }: { onCancel: () => void }) {
  const router = useRouter()
  const { addStudent } = useTutorStore()
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [yearGroup, setYearGroup] = useState<YearGroup>('Year 11')
  const [examBoard, setExamBoard] = useState<ExamBoard>('AQA')
  const [tier, setTier] = useState<Tier>('Higher')
  const [currentGrade, setCurrentGrade] = useState<Grade>(5)
  const [targetGrade, setTargetGrade] = useState<Grade>(7)
  const [goals, setGoals] = useState('')
  const [nextTopic, setNextTopic] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  const grades = ALL_GRADES.filter((g) => g <= maxGradeForTier(tier))

  function changeTier(next: Tier) {
    setTier(next)
    const max = maxGradeForTier(next) as Grade
    if (currentGrade > max) setCurrentGrade(max)
    if (targetGrade > max) setTargetGrade(max)
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nextErrors: Record<string, string> = {}
    if (!firstName.trim()) nextErrors.firstName = 'First name is required'
    if (!lastName.trim()) nextErrors.lastName = 'Last name is required'
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    const student = addStudent({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      yearGroup,
      examBoard,
      tier,
      currentGrade,
      targetGrade,
      learningGoals: goals
        .split('\n')
        .map((g) => g.trim())
        .filter(Boolean),
      nextTopic: nextTopic.trim(),
    })
    router.push(`/students/${student.id}`)
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      aria-labelledby="add-student-heading"
      className="rounded-xl border border-primary/30 bg-card"
    >
      <div className="border-b border-border px-4 py-3.5 md:px-5">
        <h2 id="add-student-heading" className="text-sm font-semibold">
          Add student
        </h2>
        <p className="text-xs text-muted-foreground">You can edit goals and topics later from their profile.</p>
      </div>

      <div className="grid gap-5 px-4 py-5 md:grid-cols-2 md:px-5 lg:grid-cols-4">
        <FormField id="firstName" label="First name" error={errors.firstName}>
          <Input
            id="firstName"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            autoComplete="off"
            aria-invalid={!!errors.firstName}
            aria-describedby={errors.firstName ? 'firstName-error' : undefined}
            autoFocus
          />
        </FormField>
        <FormField id="lastName" label="Last name" error={errors.lastName}>
          <Input
            id="lastName"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            autoComplete="off"
            aria-invalid={!!errors.lastName}
            aria-describedby={errors.lastName ? 'lastName-error' : undefined}
          />
        </FormField>
        <FormField id="yearGroup" label="Year group">
          <NativeSelect id="yearGroup" value={yearGroup} onChange={(e) => setYearGroup(e.target.value as YearGroup)}>
            {YEAR_GROUPS.map((y) => (
              <option key={y}>{y}</option>
            ))}
          </NativeSelect>
        </FormField>
        <FormField id="examBoard" label="Exam board">
          <NativeSelect id="examBoard" value={examBoard} onChange={(e) => setExamBoard(e.target.value as ExamBoard)}>
            {EXAM_BOARDS.map((b) => (
              <option key={b}>{b}</option>
            ))}
          </NativeSelect>
        </FormField>

        <SegmentedControl name="tier" label="Tier" value={tier} options={TIERS} onChange={changeTier} />
        <FormField id="currentGrade" label="Current grade">
          <NativeSelect
            id="currentGrade"
            value={currentGrade}
            onChange={(e) => setCurrentGrade(Number(e.target.value) as Grade)}
          >
            {grades.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </NativeSelect>
        </FormField>
        <FormField
          id="targetGrade"
          label="Target grade"
          hint={tier === 'Foundation' ? 'Foundation tier caps at grade 5' : undefined}
        >
          <NativeSelect
            id="targetGrade"
            value={targetGrade}
            onChange={(e) => setTargetGrade(Number(e.target.value) as Grade)}
            aria-describedby={tier === 'Foundation' ? 'targetGrade-hint' : undefined}
          >
            {grades.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </NativeSelect>
        </FormField>
        <FormField id="nextTopic" label="First topic to cover">
          <Input
            id="nextTopic"
            list="gcse-topics"
            value={nextTopic}
            onChange={(e) => setNextTopic(e.target.value)}
            placeholder="e.g. Linear equations"
            autoComplete="off"
          />
          <datalist id="gcse-topics">
            {GCSE_TOPICS.map((t) => (
              <option key={t} value={t} />
            ))}
          </datalist>
        </FormField>

        <FormField id="goals" label="Learning goals" hint="One goal per line" className="md:col-span-2 lg:col-span-4">
          <Textarea
            id="goals"
            value={goals}
            onChange={(e) => setGoals(e.target.value)}
            rows={3}
            placeholder={'Secure a grade 7 in the summer exam\nImprove confidence with algebra'}
            aria-describedby="goals-hint"
          />
        </FormField>
      </div>

      <div className="flex justify-end gap-2 border-t border-border px-4 py-3 md:px-5">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">Save student</Button>
      </div>
    </form>
  )
}
