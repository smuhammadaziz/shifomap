/** Generate HH:mm slots from doctor weekly schedule (same rules as mobile book.tsx). */

type DaySchedule = { day: number; from: string; to: string; lunchFrom?: string; lunchTo?: string }

function parseTime(s: string): number {
  const [h, m] = s.split(":").map(Number)
  return h * 60 + m
}

function formatSlot(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`
}

export function getSlotsForDoctorAndDate(
  schedule: { weekly: DaySchedule[] },
  durationMin: number,
  dateStr: string
): string[] {
  const d = new Date(`${dateStr}T12:00:00`)
  const day = d.getDay() === 0 ? 7 : d.getDay()
  const weekDay = schedule.weekly.find((w) => w.day === day)
  if (!weekDay) return []
  const fromMin = parseTime(weekDay.from)
  const toMin = parseTime(weekDay.to)
  const lunchFrom = weekDay.lunchFrom != null ? parseTime(weekDay.lunchFrom) : null
  const lunchTo = weekDay.lunchTo != null ? parseTime(weekDay.lunchTo) : null
  const slots: string[] = []
  let slotStart = fromMin
  while (slotStart + durationMin <= toMin) {
    const slotEnd = slotStart + durationMin
    const inLunch =
      lunchFrom != null && lunchTo != null && slotStart < lunchTo && slotEnd > lunchFrom
    if (!inLunch) slots.push(formatSlot(slotStart))
    slotStart += durationMin
  }
  return slots
}
