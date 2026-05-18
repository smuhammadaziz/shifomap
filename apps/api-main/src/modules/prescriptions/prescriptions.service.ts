import { ObjectId } from "mongodb"
import { unauthorized, notFound, badRequest } from "@/common/errors"
import { findClinicById } from "@/modules/clinics/clinics.repo"
import { findBookingByIdForClinic } from "@/modules/bookings/bookings.repo"
import type { PrescriptionMedicine } from "./prescriptions.model"
import { findPatientsByIds } from "@/modules/patients/patients.repo"
import {
  upsertPrescription,
  listPrescriptionsByUserId,
  findPrescriptionByIdForPatient,
  listPrescriptionEventsForDate,
  upsertPrescriptionEvent,
  upsertCustomReminder,
  listCustomRemindersByUserId,
  deleteCustomReminder,
  findCustomReminderByIdForPatient,
  upsertPillCheckEvent,
  listPillCheckTakenCustomKeysForDate,
  listPillCheckEventsInRange,
  findCustomRemindersByIds,
} from "./prescriptions.repo"
import type { CustomReminderPillEventBody } from "./prescriptions.model"

function genDefaultTimes(timesPerDay: number): string[] {
  if (timesPerDay <= 1) return ["09:00"]
  if (timesPerDay === 2) return ["09:00", "21:00"]
  if (timesPerDay === 3) return ["08:00", "14:00", "21:00"]
  if (timesPerDay === 4) return ["08:00", "12:00", "16:00", "20:00"]
  const start = 8 * 60
  const end = 22 * 60
  const step = Math.floor((end - start) / (timesPerDay - 1))
  const out: string[] = []
  for (let i = 0; i < timesPerDay; i++) {
    const m = start + step * i
    const hh = Math.floor(m / 60)
    const mm = m % 60
    out.push(`${hh.toString().padStart(2, "0")}:${mm.toString().padStart(2, "0")}`)
  }
  return out
}

function normalizeMedicines(meds: Array<Omit<PrescriptionMedicine, "scheduleTimes"> & { scheduleTimes?: string[] }>): PrescriptionMedicine[] {
  return meds.map((m) => ({
    key: m.key,
    name: m.name.trim(),
    dosage: m.dosage.trim(),
    durationDays: m.durationDays,
    timesPerDay: m.timesPerDay,
    foodRelation: m.foodRelation,
    foodTiming: m.foodTiming ?? null,
    notes: m.notes ?? null,
    scheduleTimes: (m.scheduleTimes && m.scheduleTimes.length ? m.scheduleTimes : genDefaultTimes(m.timesPerDay)).slice(0, m.timesPerDay),
  }))
}

export async function upsertPrescriptionByDoctor(auth: { role?: string; clinicId?: string; sub: string }, body: { bookingId: string; medicines: any[] }) {
  if (auth.role !== "doctor" || !auth.clinicId) throw unauthorized("Doctor access only")
  const clinicId = new ObjectId(auth.clinicId)
  const doctorId = new ObjectId(auth.sub)
  const bookingId = new ObjectId(body.bookingId)

  const booking = await findBookingByIdForClinic(bookingId, clinicId)
  if (!booking) throw notFound("Booking not found")
  if (booking.status === "cancelled") throw badRequest("Booking is cancelled")
  if (booking.status !== "completed") throw badRequest("Prescription can be created only after booking is completed")
  if (!booking.doctorId || !booking.doctorId.equals(doctorId)) throw unauthorized("This booking is not assigned to you")

  const medicines = normalizeMedicines(body.medicines as any)
  const doc = await upsertPrescription({
    bookingId,
    clinicId,
    doctorId,
    userId: booking.userId,
    medicines,
  })

  const clinic = await findClinicById(clinicId)
  const doctor = clinic?.doctors?.find((d) => d._id.equals(doctorId)) ?? null
  return {
    _id: doc._id.toHexString(),
    bookingId: doc.bookingId.toHexString(),
    clinicId: doc.clinicId.toHexString(),
    doctorId: doc.doctorId.toHexString(),
    userId: doc.userId.toHexString(),
    doctorName: doctor?.fullName ?? "",
    clinicName: clinic?.clinicDisplayName ?? "",
    medicines: doc.medicines,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  }
}

export async function listMyPrescriptions(auth: { role?: string; sub: string }) {
  if (auth.role !== "patient") throw unauthorized("Patient access only")
  const userId = new ObjectId(auth.sub)
  const list = await listPrescriptionsByUserId(userId)

  // best-effort clinic/doctor name hydration (from clinic doc)
  const out = []
  for (const p of list) {
    const clinic = await findClinicById(p.clinicId)
    const doctor = clinic?.doctors?.find((d) => d._id.equals(p.doctorId)) ?? null
    out.push({
      _id: p._id.toHexString(),
      bookingId: p.bookingId.toHexString(),
      clinicId: p.clinicId.toHexString(),
      doctorId: p.doctorId.toHexString(),
      doctorName: doctor?.fullName ?? "",
      clinicName: clinic?.clinicDisplayName ?? "",
      prescriptionDate: p.createdAt.toISOString(),
      medicinesCount: p.medicines.length,
    })
  }
  return out
}

export async function getMyPrescriptionDetail(auth: { role?: string; sub: string }, prescriptionId: string, date?: string) {
  if (auth.role !== "patient") throw unauthorized("Patient access only")
  const userId = new ObjectId(auth.sub)
  const id = new ObjectId(prescriptionId)
  const doc = await findPrescriptionByIdForPatient(id, userId)
  if (!doc) throw notFound("Prescription not found")
  const clinic = await findClinicById(doc.clinicId)
  const doctor = clinic?.doctors?.find((d) => d._id.equals(doc.doctorId)) ?? null

  const targetDate = date ?? new Date().toISOString().slice(0, 10)
  const events = await listPrescriptionEventsForDate(doc._id, targetDate)
  const statusMap = new Map<string, "taken" | "skipped">()
  for (const e of events) statusMap.set(`${e.medicineKey}|${e.time}`, e.action)

  const schedule = doc.medicines
    .flatMap((m) =>
      m.scheduleTimes.slice(0, m.timesPerDay).map((time) => ({
        medicineKey: m.key,
        time,
        name: m.name,
        dosage: m.dosage,
        foodRelation: m.foodRelation,
        foodTiming: m.foodTiming,
        notes: m.notes,
        status: statusMap.get(`${m.key}|${time}`) ?? "pending",
      }))
    )
    .sort((a, b) => a.time.localeCompare(b.time))

  return {
    _id: doc._id.toHexString(),
    bookingId: doc.bookingId.toHexString(),
    clinicId: doc.clinicId.toHexString(),
    doctorId: doc.doctorId.toHexString(),
    doctorName: doctor?.fullName ?? "",
    clinicName: clinic?.clinicDisplayName ?? "",
    prescriptionDate: doc.createdAt.toISOString(),
    medicines: doc.medicines,
    schedule: { date: targetDate, items: schedule },
  }
}

export async function setMyPrescriptionEvent(auth: { role?: string; sub: string }, prescriptionId: string, body: { medicineKey: string; date: string; time: string; action: "taken" | "skipped" }) {
  if (auth.role !== "patient") throw unauthorized("Patient access only")
  const userId = new ObjectId(auth.sub)
  const id = new ObjectId(prescriptionId)
  const doc = await findPrescriptionByIdForPatient(id, userId)
  if (!doc) throw notFound("Prescription not found")

  const hasMedicine = doc.medicines.some((m) => m.key === body.medicineKey)
  if (!hasMedicine) throw badRequest("Medicine not found in this prescription")

  const ev = await upsertPrescriptionEvent({
    prescriptionId: doc._id,
    medicineKey: body.medicineKey,
    date: body.date,
    time: body.time,
    action: body.action,
  })
  return {
    prescriptionId: ev.prescriptionId.toHexString(),
    medicineKey: ev.medicineKey,
    date: ev.date,
    time: ev.time,
    action: ev.action,
    actedAt: ev.actedAt.toISOString(),
  }
}

type NextPillPayload = {
  prescriptionId: string | null
  customReminderId: string | null
  medicineKey: string | null
  date: string
  time: string
  medicineName: string
}

export async function getMyNextPill(auth: { role?: string; sub: string }): Promise<NextPillPayload | null> {
  if (auth.role !== "patient") throw unauthorized("Patient access only")
  const userId = new ObjectId(auth.sub)
  const today = new Date().toISOString().slice(0, 10)
  const nowTime = new Date().toISOString().slice(11, 16)

  const [prescriptions, customDocs, customTaken] = await Promise.all([
    listPrescriptionsByUserId(userId, 50),
    listCustomRemindersByUserId(userId),
    listPillCheckTakenCustomKeysForDate(userId, today),
  ])

  let best: NextPillPayload | null = null

  // 1. Check Prescriptions
  for (const p of prescriptions) {
    const events = await listPrescriptionEventsForDate(p._id, today)
    const taken = new Set(events.map((e) => `${e.medicineKey}|${e.time}`))
    for (const m of p.medicines) {
      for (const time of m.scheduleTimes.slice(0, m.timesPerDay)) {
        if (time < nowTime) continue
        if (taken.has(`${m.key}|${time}`)) continue
        const candidate: NextPillPayload = {
          prescriptionId: p._id.toHexString(),
          customReminderId: null,
          medicineKey: m.key,
          date: today,
          time,
          medicineName: m.name,
        }
        if (!best || candidate.time < best.time) best = candidate
      }
    }
  }

  // 2. Check Custom Reminders
  for (const c of customDocs) {
    if (!c.isActive) continue
    const doseTimes = [c.time]

    for (const t of doseTimes) {
      if (t < nowTime) continue
      const key = `${c._id.toHexString()}|${t}`
      if (customTaken.has(key)) continue
      const candidate: NextPillPayload = {
        prescriptionId: null,
        customReminderId: c._id.toHexString(),
        medicineKey: null,
        date: today,
        time: t,
        medicineName: c.pillName,
      }
      if (!best || candidate.time < best.time) best = candidate
    }
  }

  return best
}

export async function recordCustomReminderPillEvent(
  auth: { role?: string; sub: string },
  reminderIdStr: string,
  body: CustomReminderPillEventBody
) {
  if (auth.role !== "patient") throw unauthorized("Patient access only")
  const userId = new ObjectId(auth.sub)
  if (!ObjectId.isValid(reminderIdStr)) throw badRequest("Invalid reminder id")
  const reminderId = new ObjectId(reminderIdStr)
  const rem = await findCustomReminderByIdForPatient(reminderId, userId)
  if (!rem) throw notFound("Reminder not found")

  const ev = await upsertPillCheckEvent({
    userId,
    reminderId,
    date: body.date,
    time: body.time,
    action: body.action,
  })
  return {
    id: ev._id.toHexString(),
    reminderId: reminderIdStr,
    date: ev.date,
    time: ev.time,
    action: ev.action,
    actedAt: ev.actedAt.toISOString(),
  }
}

export type PillCheckStatRow = {
  patientName: string
  patientPhone: string
  pillName: string
  reminderId: string
  takenCount: number
  skippedCount: number
  lastTakenAt: string | null
}

export async function getAdminPillCheckStats(fromStr: string, toStr: string, q: string): Promise<PillCheckStatRow[]> {
  const end = toStr && /^\d{4}-\d{2}-\d{2}$/.test(toStr) ? new Date(`${toStr}T23:59:59.999Z`) : new Date()
  const start =
    fromStr && /^\d{4}-\d{2}-\d{2}$/.test(fromStr)
      ? new Date(`${fromStr}T00:00:00.000Z`)
      : new Date(end.getTime() - 30 * 86400000)
  const events = await listPillCheckEventsInRange(start, end)
  const needle = q.trim().toLowerCase()

  type Agg = { userId: ObjectId; reminderId: ObjectId; takenCount: number; skippedCount: number; lastTakenAt: Date | null }
  const map = new Map<string, Agg>()
  for (const e of events) {
    const k = `${e.userId.toHexString()}:${e.reminderId.toHexString()}`
    let row = map.get(k)
    if (!row) {
      row = { userId: e.userId, reminderId: e.reminderId, takenCount: 0, skippedCount: 0, lastTakenAt: null }
      map.set(k, row)
    }
    if (e.action === "taken") {
      row.takenCount += 1
      if (!row.lastTakenAt || e.actedAt > row.lastTakenAt) row.lastTakenAt = e.actedAt
    } else {
      row.skippedCount += 1
    }
  }

  const userIds = [...new Set(Array.from(map.values(), (r) => r.userId.toHexString()))].map((id) => new ObjectId(id))
  const reminderIds = [...new Set(Array.from(map.values(), (r) => r.reminderId.toHexString()))].map((h) => new ObjectId(h))

  const [patients, reminders] = await Promise.all([findPatientsByIds(userIds), findCustomRemindersByIds(reminderIds)])
  const patientById = new Map(patients.map((p) => [p._id.toHexString(), p]))
  const reminderById = new Map(reminders.map((r) => [r._id.toHexString(), r]))

  const rows: PillCheckStatRow[] = []
  for (const r of map.values()) {
    const p = patientById.get(r.userId.toHexString())
    const rem = reminderById.get(r.reminderId.toHexString())
    const patientName = p?.fullName ?? "—"
    const patientPhone = p?.contacts?.phone ?? "—"
    const pillName = rem?.pillName ?? "—"
    if (needle) {
      const hay = `${patientName} ${patientPhone} ${pillName}`.toLowerCase()
      if (!hay.includes(needle)) continue
    }
    rows.push({
      patientName,
      patientPhone,
      pillName,
      reminderId: r.reminderId.toHexString(),
      takenCount: r.takenCount,
      skippedCount: r.skippedCount,
      lastTakenAt: r.lastTakenAt ? r.lastTakenAt.toISOString() : null,
    })
  }
  rows.sort((a, b) => (b.lastTakenAt ?? "").localeCompare(a.lastTakenAt ?? ""))
  return rows
}

export async function publicCreateCustomReminder(auth: { role?: string; sub: string }, body: { pillName: string; time: string; notes?: string | null; timesPerDay: number }) {
  if (auth.role !== "patient") throw unauthorized("Patient access only")
  if (!ObjectId.isValid(auth.sub)) throw badRequest("Invalid patient id")
  const userId = new ObjectId(auth.sub)
  const doc = await upsertCustomReminder(userId, body)
  return {
    id: doc._id.toHexString(),
    pillName: doc.pillName,
    time: doc.time,
    notes: doc.notes,
    timesPerDay: doc.timesPerDay,
    isActive: doc.isActive,
  }
}

export async function publicListCustomReminders(auth: { role?: string; sub: string }) {
  if (auth.role !== "patient") throw unauthorized("Patient access only")
  const userId = new ObjectId(auth.sub)
  const list = await listCustomRemindersByUserId(userId)
  return list.map(c => ({
    id: c._id.toHexString(),
    pillName: c.pillName,
    time: c.time,
    notes: c.notes,
    timesPerDay: c.timesPerDay,
    isActive: c.isActive
  }))
}

export async function publicDeleteCustomReminder(auth: { role?: string; sub: string }, id: string) {
  if (auth.role !== "patient") throw unauthorized("Patient access only")
  const userId = new ObjectId(auth.sub)
  const success = await deleteCustomReminder(new ObjectId(id), userId)
  if (!success) throw notFound("Reminder not found")
  return { success: true }
}

