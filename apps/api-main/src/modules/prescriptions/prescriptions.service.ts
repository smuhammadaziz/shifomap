import { ObjectId } from "mongodb"
import { unauthorized, notFound, badRequest } from "@/common/errors"
import { findClinicById } from "@/modules/clinics/clinics.repo"
import { findBookingByIdForClinic } from "@/modules/bookings/bookings.repo"
import type { PrescriptionMedicine } from "./prescriptions.model"
import { upsertPrescription, listPrescriptionsByUserId, findPrescriptionByIdForPatient, listPrescriptionEventsForDate, upsertPrescriptionEvent } from "./prescriptions.repo"

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

export async function getMyNextPill(auth: { role?: string; sub: string }) {
  if (auth.role !== "patient") throw unauthorized("Patient access only")
  const userId = new ObjectId(auth.sub)
  const list = await listPrescriptionsByUserId(userId, 50)
  const today = new Date().toISOString().slice(0, 10)
  const nowTime = new Date().toISOString().slice(11, 16)

  // naive: next pending item today across all prescriptions
  let best: any = null
  for (const p of list) {
    const events = await listPrescriptionEventsForDate(p._id, today)
    const taken = new Set(events.map((e) => `${e.medicineKey}|${e.time}`))
    for (const m of p.medicines) {
      for (const time of m.scheduleTimes.slice(0, m.timesPerDay)) {
        if (time < nowTime) continue
        if (taken.has(`${m.key}|${time}`)) continue
        const candidate = { prescriptionId: p._id.toHexString(), time, medicineName: m.name }
        if (!best || candidate.time < best.time) best = candidate
      }
    }
  }
  return best
}

