import { ObjectId } from "mongodb"
import { findClinicById } from "@/modules/clinics/clinics.repo"
import type { ClinicDoc } from "@/modules/clinics/clinics.model"
import {
  insertBooking,
  findBookingsByUserId,
  findBookingById,
  findNextUpcomingByUserId,
  updateBookingCancel,
  findBookingByIdForClinic,
  findBookingsByClinicId,
  findBookingsByDoctorId,
  updateBookingStatusByClinic,
  findBookedTimesForDoctorOnDate,
} from "./bookings.repo"
import type { BookingDoc, BookingStatus } from "./bookings.model"
import type { CreateBookingBody } from "./bookings.model"
import { findPatientsByIds } from "@/modules/patients/patients.repo"
import { badRequest, notFound, unauthorized } from "@/common/errors"

function getClinicDisplayNames(clinic: ClinicDoc | null, booking: BookingDoc) {
  if (!clinic) return { clinicDisplayName: "", serviceTitle: "", doctorName: null as string | null, branchName: null as string | null }
  const service = clinic.services?.find((s) => s._id.equals(booking.serviceId))
  const doctor = booking.doctorId ? clinic.doctors?.find((d) => d._id.equals(booking.doctorId)) : null
  const branch = booking.branchId ? clinic.branches?.find((b) => b._id.equals(booking.branchId)) : null
  return {
    clinicDisplayName: clinic.clinicDisplayName,
    serviceTitle: service?.title ?? "",
    doctorName: doctor ? doctor.fullName : null,
    branchName: branch ? branch.name : null,
  }
}

export async function createBooking(userId: string, body: CreateBookingBody) {
  const clinicId = new ObjectId(body.clinicId)
  const serviceId = new ObjectId(body.serviceId)
  const branchId = body.branchId ? new ObjectId(body.branchId) : null
  const doctorId = body.doctorId ? new ObjectId(body.doctorId) : null
  const userIdObj = new ObjectId(userId)

  const clinic = await findClinicById(clinicId)
  if (!clinic) throw notFound("Clinic not found")
  const service = (clinic.services ?? []).find((s) => s._id.equals(serviceId))
  if (!service) throw badRequest("Service not found in this clinic")

  const date = new Date(body.scheduledDate + "T00:00:00")
  const [hours, minutes] = body.scheduledTime.split(":").map(Number)
  date.setHours(hours, minutes, 0, 0)
  const scheduledAt = date

  // Prevent double-booking: check if doctor already has an active booking at this time
  if (doctorId) {
    const bookedTimes = await findBookedTimesForDoctorOnDate(clinicId, doctorId, body.scheduledDate)
    if (bookedTimes.includes(body.scheduledTime)) {
      throw badRequest("This time slot is already booked. Please select a different time.")
    }
  }

  const doc = await insertBooking({
    clinicId,
    branchId,
    serviceId,
    doctorId,
    userId: userIdObj,
    scheduledAt,
    scheduledDate: body.scheduledDate,
    scheduledTime: body.scheduledTime,
    status: "pending",
    consultationPrice: service.price ?? null,
    price: null,
    cancel: { by: null, reason: null, cancelledAt: null },
    statusHistory: [{ type: "created", at: scheduledAt, by: null }],
  })

  return mapBookingToPublic(doc, clinic)
}

export async function getBookedSlots(clinicId: string, doctorId: string, date: string) {
  const cId = new ObjectId(clinicId)
  const dId = new ObjectId(doctorId)
  const bookedTimes = await findBookedTimesForDoctorOnDate(cId, dId, date)
  return bookedTimes
}

export async function getClinicBookings(auth: { role?: string; clinicId?: string; sub: string }, options?: { status?: BookingDoc["status"] }) {
  if (!auth.role?.startsWith("clinic_") || !auth.clinicId) throw unauthorized("Clinic admin access only")
  const clinicId = new ObjectId(auth.clinicId)
  const list = await findBookingsByClinicId(clinicId, { status: options?.status, limit: 500 })
  const clinic = await findClinicById(clinicId)
  return list.map((b) => {
    const names = getClinicDisplayNames(clinic ?? null, b)
    return { ...mapBookingToPublic(b, clinic), ...names }
  })
}

export async function getDoctorTodayBookings(auth: { role?: string; clinicId?: string; sub: string }) {
  if (auth.role !== "doctor" || !auth.clinicId) throw unauthorized("Doctor access only")
  const clinicId = new ObjectId(auth.clinicId)
  const doctorId = new ObjectId(auth.sub)
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  const end = new Date(start)
  end.setDate(end.getDate() + 1)
  const list = await findBookingsByDoctorId(clinicId, doctorId, { from: start, to: end, limit: 200 })
  const clinic = await findClinicById(clinicId)
  return list.map((b) => {
    const names = getClinicDisplayNames(clinic ?? null, b)
    return { ...mapBookingToPublic(b, clinic), ...names }
  })
}

export async function getDoctorBookings(auth: { role?: string; clinicId?: string; sub: string }) {
  if (auth.role !== "doctor" || !auth.clinicId) throw unauthorized("Doctor access only")
  const clinicId = new ObjectId(auth.clinicId)
  const doctorId = new ObjectId(auth.sub)
  const list = await findBookingsByDoctorId(clinicId, doctorId, { limit: 500 })
  const clinic = await findClinicById(clinicId)
  return list
    .sort((a, b) => b.scheduledAt.getTime() - a.scheduledAt.getTime())
    .map((b) => {
      const names = getClinicDisplayNames(clinic ?? null, b)
      return { ...mapBookingToPublic(b, clinic), ...names }
    })
}

export async function getClinicBookingById(auth: { role?: string; clinicId?: string; sub: string }, bookingId: string) {
  if (!auth.clinicId) throw unauthorized("Clinic access only")
  if (!(auth.role === "doctor" || auth.role?.startsWith("clinic_"))) throw unauthorized("Clinic admin or doctor only")
  const clinicId = new ObjectId(auth.clinicId)
  const id = new ObjectId(bookingId)
  const doc = await findBookingByIdForClinic(id, clinicId)
  if (!doc) throw notFound("Booking not found")
  if (auth.role === "doctor") {
    if (!doc.doctorId || doc.doctorId.toHexString() !== auth.sub) throw unauthorized("This booking is not assigned to you")
  }
  const clinic = await findClinicById(clinicId)
  const names = getClinicDisplayNames(clinic ?? null, doc)
  return { ...mapBookingToPublic(doc, clinic), ...names }
}

function assertNotCancelled(doc: BookingDoc) {
  if (doc.status === "cancelled") throw badRequest("Booking is cancelled")
}

export async function clinicConfirmBooking(auth: { role?: string; clinicId?: string; sub: string }, bookingId: string) {
  if (!auth.clinicId) throw unauthorized("Clinic access only")
  const clinicId = new ObjectId(auth.clinicId)
  const id = new ObjectId(bookingId)
  const current = await findBookingByIdForClinic(id, clinicId)
  if (!current) throw notFound("Booking not found")
  assertNotCancelled(current)
  if (current.status !== "pending") throw badRequest("Only pending bookings can be confirmed")
  if (auth.role === "doctor") {
    if (!current.doctorId || current.doctorId.toHexString() !== auth.sub) throw unauthorized("This booking is not assigned to you")
  } else if (!auth.role?.startsWith("clinic_")) {
    throw unauthorized("Clinic admin or doctor only")
  }
  const actor = { role: auth.role === "doctor" ? ("doctor" as const) : ("clinic" as const), id: new ObjectId(auth.sub) }
  const updated = await updateBookingStatusByClinic(id, clinicId, "confirmed", actor)
  if (!updated) throw badRequest("Failed to confirm booking")
  const clinic = await findClinicById(clinicId)
  const names = getClinicDisplayNames(clinic ?? null, updated)
  return { ...mapBookingToPublic(updated, clinic), ...names }
}

export async function clinicMarkArrived(auth: { role?: string; clinicId?: string; sub: string }, bookingId: string) {
  if (!auth.role?.startsWith("clinic_") || !auth.clinicId) throw unauthorized("Clinic admin access only")
  const clinicId = new ObjectId(auth.clinicId)
  const id = new ObjectId(bookingId)
  const current = await findBookingByIdForClinic(id, clinicId)
  if (!current) throw notFound("Booking not found")
  assertNotCancelled(current)
  if (current.status !== "confirmed") throw badRequest("Patient can be marked arrived only after confirmation")
  const actor = { role: "clinic" as const, id: new ObjectId(auth.sub) }
  const updated = await updateBookingStatusByClinic(id, clinicId, "patient_arrived", actor)
  if (!updated) throw badRequest("Failed to update booking")
  const clinic = await findClinicById(clinicId)
  const names = getClinicDisplayNames(clinic ?? null, updated)
  return { ...mapBookingToPublic(updated, clinic), ...names }
}

export async function doctorStartConsultation(auth: { role?: string; clinicId?: string; sub: string }, bookingId: string) {
  if (auth.role !== "doctor" || !auth.clinicId) throw unauthorized("Doctor access only")
  const clinicId = new ObjectId(auth.clinicId)
  const id = new ObjectId(bookingId)
  const current = await findBookingByIdForClinic(id, clinicId)
  if (!current) throw notFound("Booking not found")
  assertNotCancelled(current)
  if (!current.doctorId || current.doctorId.toHexString() !== auth.sub) throw unauthorized("This booking is not assigned to you")
  if (current.status !== "patient_arrived" && current.status !== "confirmed") {
    throw badRequest("Doctor can start only after booking is confirmed")
  }
  const actor = { role: "doctor" as const, id: new ObjectId(auth.sub) }
  const updated = await updateBookingStatusByClinic(id, clinicId, "in_progress", actor)
  if (!updated) throw badRequest("Failed to update booking")
  const clinic = await findClinicById(clinicId)
  const names = getClinicDisplayNames(clinic ?? null, updated)
  return { ...mapBookingToPublic(updated, clinic), ...names }
}

export async function doctorFinishConsultation(auth: { role?: string; clinicId?: string; sub: string }, bookingId: string) {
  if (auth.role !== "doctor" || !auth.clinicId) throw unauthorized("Doctor access only")
  const clinicId = new ObjectId(auth.clinicId)
  const id = new ObjectId(bookingId)
  const current = await findBookingByIdForClinic(id, clinicId)
  if (!current) throw notFound("Booking not found")
  assertNotCancelled(current)
  if (!current.doctorId || current.doctorId.toHexString() !== auth.sub) throw unauthorized("This booking is not assigned to you")
  if (current.status !== "in_progress") throw badRequest("Booking cannot be completed unless consultation started")
  const actor = { role: "doctor" as const, id: new ObjectId(auth.sub) }
  const updated = await updateBookingStatusByClinic(id, clinicId, "completed", actor)
  if (!updated) throw badRequest("Failed to update booking")
  const clinic = await findClinicById(clinicId)
  const names = getClinicDisplayNames(clinic ?? null, updated)
  return { ...mapBookingToPublic(updated, clinic), ...names }
}

export async function clinicCancelBooking(auth: { role?: string; clinicId?: string; sub: string }, bookingId: string, reason: string | null) {
  if (!auth.clinicId) throw unauthorized("Clinic access only")
  const clinicId = new ObjectId(auth.clinicId)
  const id = new ObjectId(bookingId)
  const current = await findBookingByIdForClinic(id, clinicId)
  if (!current) throw notFound("Booking not found")
  assertNotCancelled(current)
  if (current.status === "completed") throw badRequest("Completed booking cannot be cancelled")
  if (auth.role === "doctor") {
    if (!current.doctorId || current.doctorId.toHexString() !== auth.sub) throw unauthorized("This booking is not assigned to you")
  } else if (!auth.role?.startsWith("clinic_")) {
    throw unauthorized("Clinic admin or doctor only")
  }
  const actor = { role: auth.role === "doctor" ? ("doctor" as const) : ("clinic" as const), id: new ObjectId(auth.sub) }
  const updated = await updateBookingStatusByClinic(id, clinicId, "cancelled", actor, { cancelReason: reason ?? null })
  if (!updated) throw badRequest("Failed to cancel booking")
  const clinic = await findClinicById(clinicId)
  const names = getClinicDisplayNames(clinic ?? null, updated)
  return { ...mapBookingToPublic(updated, clinic), ...names }
}

export async function getMyBookings(userId: string, status?: BookingDoc["status"]) {
  const userIdObj = new ObjectId(userId)
  const list = await findBookingsByUserId(userIdObj, { status, limit: 200 })
  const clinicIds = [...new Set(list.map((b) => b.clinicId.toHexString()))]
  const clinics = new Map<string, ClinicDoc | null>()
  for (const id of clinicIds) {
    const clinic = await findClinicById(new ObjectId(id))
    clinics.set(id, clinic)
  }
  return list.map((b) => {
    const clinic = clinics.get(b.clinicId.toHexString()) ?? null
    const names = getClinicDisplayNames(clinic, b)
    return { ...mapBookingToPublic(b, clinic), ...names }
  })
}

export async function getBookingById(bookingId: string, userId: string) {
  const id = new ObjectId(bookingId)
  const userIdObj = new ObjectId(userId)
  const doc = await findBookingById(id, userIdObj)
  if (!doc) throw notFound("Booking not found")
  const clinic = await findClinicById(doc.clinicId)
  const names = getClinicDisplayNames(clinic ?? null, doc)
  return { ...mapBookingToPublic(doc, clinic ?? undefined), ...names }
}

export async function getNextUpcoming(userId: string) {
  const userIdObj = new ObjectId(userId)
  const doc = await findNextUpcomingByUserId(userIdObj)
  if (!doc) return null
  const clinic = await findClinicById(doc.clinicId)
  const names = getClinicDisplayNames(clinic ?? null, doc)
  return { ...mapBookingToPublic(doc, clinic ?? undefined), ...names }
}

export async function cancelBookingByPatient(bookingId: string, userId: string, reason: string | null) {
  const id = new ObjectId(bookingId)
  const userIdObj = new ObjectId(userId)
  const doc = await updateBookingCancel(id, userIdObj, reason)
  if (!doc) throw notFound("Booking not found or cannot be cancelled")
  const clinic = await findClinicById(doc.clinicId)
  const names = getClinicDisplayNames(clinic ?? null, doc)
  return { ...mapBookingToPublic(doc, clinic ?? undefined), ...names }
}

function mapBookingToPublic(doc: BookingDoc, clinic?: ClinicDoc | null) {
  const service = clinic?.services?.find((s) => s._id.toString() === doc.serviceId?.toString())
  return {
    _id: doc._id?.toString(),
    clinicId: doc.clinicId?.toString(),
    branchId: doc.branchId?.toString() ?? null,
    serviceId: doc.serviceId?.toString(),
    doctorId: doc.doctorId?.toString() ?? null,
    userId: doc.userId?.toString(),
    scheduledAt: doc.scheduledAt ? new Date(doc.scheduledAt).toISOString() : null,
    scheduledDate: doc.scheduledDate,
    scheduledTime: doc.scheduledTime,
    status: doc.status,
    consultationPrice: doc.consultationPrice ?? (service?.price ?? null),
    price: doc.price,
    cancel: {
      by: doc.cancel?.by ?? null,
      reason: doc.cancel?.reason ?? null,
      cancelledAt: doc.cancel?.cancelledAt ? new Date(doc.cancel.cancelledAt).toISOString() : null,
    },
    statusHistory: (doc.statusHistory ?? []).map((e) => ({
      type: e.type,
      at: e.at ? new Date(e.at).toISOString() : null,
      by: e.by ? { role: e.by.role, id: e.by.id?.toString() } : null,
    })),
    createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : null,
    updatedAt: doc.updatedAt ? new Date(doc.updatedAt).toISOString() : null,
    serviceTitle: service?.title,
    durationMin: service?.durationMin,
  }
}

function dateKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

function priceAmount(p: BookingDoc["consultationPrice"]): number {
  if (!p) return 0
  if (typeof p.amount === "number") return p.amount
  if (typeof p.minAmount === "number" && typeof p.maxAmount === "number") {
    return Math.round((p.minAmount + p.maxAmount) / 2)
  }
  if (typeof p.minAmount === "number") return p.minAmount
  if (typeof p.maxAmount === "number") return p.maxAmount
  return 0
}

export async function getClinicDashboardStats(auth: { role?: string; clinicId?: string; sub: string }) {
  if (!auth.role?.startsWith("clinic_") || !auth.clinicId) throw unauthorized("Clinic admin access only")
  const clinicId = new ObjectId(auth.clinicId)
  const clinic = await findClinicById(clinicId)
  if (!clinic) throw notFound("Clinic not found")

  const list = await findBookingsByClinicId(clinicId, { limit: 2000 })

  const now = new Date()
  const todayStart = new Date(now)
  todayStart.setHours(0, 0, 0, 0)
  const tomorrowStart = new Date(todayStart)
  tomorrowStart.setDate(tomorrowStart.getDate() + 1)

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 1)

  // Stat counts
  let todayCount = 0
  let upcomingCount = 0
  let pendingCount = 0
  let completedCount = 0
  let cancelledCount = 0
  let monthRevenue = 0
  let prevMonthRevenue = 0
  const statusBreakdown: Record<BookingStatus, number> = {
    pending: 0,
    confirmed: 0,
    patient_arrived: 0,
    in_progress: 0,
    completed: 0,
    cancelled: 0,
  }

  // Weekly series (last 7 days, including today)
  const weeklyMap = new Map<string, number>()
  for (let i = 6; i >= 0; i--) {
    const d = new Date(todayStart)
    d.setDate(d.getDate() - i)
    weeklyMap.set(dateKey(d), 0)
  }
  const weekStart = new Date(todayStart)
  weekStart.setDate(weekStart.getDate() - 6)

  // Top services / doctors aggregation
  const serviceCounts = new Map<string, number>()
  const doctorCounts = new Map<string, number>()

  for (const b of list) {
    statusBreakdown[b.status] = (statusBreakdown[b.status] ?? 0) + 1
    if (b.scheduledAt >= todayStart && b.scheduledAt < tomorrowStart && b.status !== "cancelled") {
      todayCount++
    }
    if (b.scheduledAt >= tomorrowStart && b.status !== "cancelled" && b.status !== "completed") {
      upcomingCount++
    }
    if (b.status === "pending") pendingCount++
    if (b.status === "completed") completedCount++
    if (b.status === "cancelled") cancelledCount++

    if (b.status === "completed") {
      if (b.scheduledAt >= monthStart) monthRevenue += priceAmount(b.consultationPrice)
      else if (b.scheduledAt >= prevMonthStart && b.scheduledAt < prevMonthEnd) {
        prevMonthRevenue += priceAmount(b.consultationPrice)
      }
    }

    if (b.scheduledAt >= weekStart && b.scheduledAt < tomorrowStart) {
      const k = dateKey(b.scheduledAt)
      weeklyMap.set(k, (weeklyMap.get(k) ?? 0) + 1)
    }

    const sId = b.serviceId?.toHexString()
    if (sId) serviceCounts.set(sId, (serviceCounts.get(sId) ?? 0) + 1)
    const dId = b.doctorId?.toHexString()
    if (dId) doctorCounts.set(dId, (doctorCounts.get(dId) ?? 0) + 1)
  }

  const weeklySeries = Array.from(weeklyMap.entries()).map(([date, count]) => ({ date, count }))

  const topServices = Array.from(serviceCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id, count]) => {
      const svc = clinic.services?.find((s) => s._id.toHexString() === id)
      return { serviceId: id, title: svc?.title ?? "—", count }
    })

  const topDoctors = Array.from(doctorCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id, count]) => {
      const doc = clinic.doctors?.find((d) => d._id.toHexString() === id)
      return { doctorId: id, name: doc?.fullName ?? "—", count }
    })

  // Recent bookings (last 8 by creation/scheduledAt)
  const recentDocs = [...list]
    .sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0))
    .slice(0, 8)
  const patientIds = [...new Set(recentDocs.map((d) => d.userId.toHexString()))].map((id) => new ObjectId(id))
  const patients = await findPatientsByIds(patientIds)
  const patientMap = new Map(patients.map((p) => [p._id.toHexString(), p]))

  const recentBookings = recentDocs.map((b) => {
    const svc = clinic.services?.find((s) => s._id.equals(b.serviceId))
    const doctor = b.doctorId ? clinic.doctors?.find((d) => d._id.equals(b.doctorId!)) : null
    const patient = patientMap.get(b.userId.toHexString())
    return {
      _id: b._id.toHexString(),
      scheduledAt: b.scheduledAt.toISOString(),
      scheduledDate: b.scheduledDate,
      scheduledTime: b.scheduledTime,
      status: b.status,
      serviceTitle: svc?.title ?? "—",
      doctorName: doctor?.fullName ?? null,
      patientName: patient?.fullName ?? null,
      patientPhone: patient?.contacts?.phone ?? null,
      consultationPrice: b.consultationPrice ?? svc?.price ?? null,
      createdAt: b.createdAt?.toISOString() ?? null,
    }
  })

  const revenueGrowthPct =
    prevMonthRevenue > 0
      ? Math.round(((monthRevenue - prevMonthRevenue) / prevMonthRevenue) * 100)
      : monthRevenue > 0
        ? 100
        : 0

  return {
    todayCount,
    upcomingCount,
    pendingCount,
    completedCount,
    cancelledCount,
    totalBookings: list.length,
    monthRevenue,
    prevMonthRevenue,
    revenueCurrency: "UZS",
    revenueGrowthPct,
    weeklySeries,
    statusBreakdown: Object.entries(statusBreakdown).map(([status, count]) => ({
      status: status as BookingStatus,
      count,
    })),
    topServices,
    topDoctors,
    recentBookings,
    rating: clinic.rating ?? { avg: 0, count: 0 },
    servicesCount: clinic.stats?.servicesCount ?? clinic.services?.length ?? 0,
    doctorsCount: clinic.stats?.doctorsCount ?? clinic.doctors?.length ?? 0,
    branchesCount: clinic.stats?.branchesCount ?? clinic.branches?.length ?? 0,
  }
}
