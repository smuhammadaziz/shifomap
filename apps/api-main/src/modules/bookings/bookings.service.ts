import { ObjectId } from "mongodb"
import { findClinicById } from "@/modules/clinics/clinics.repo"
import type { ClinicDoc } from "@/modules/clinics/clinics.model"
import { insertBooking, findBookingsByUserId, findBookingById, findNextUpcomingByUserId, updateBookingCancel } from "./bookings.repo"
import type { BookingDoc } from "./bookings.model"
import type { CreateBookingBody } from "./bookings.model"
import { badRequest, notFound } from "@/common/errors"

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
    price: null,
    cancel: { by: null, reason: null, cancelledAt: null },
  })

  return mapBookingToPublic(doc, clinic)
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
  const service = clinic?.services?.find((s) => s._id.equals(doc.serviceId))
  return {
    _id: doc._id.toHexString(),
    clinicId: doc.clinicId.toHexString(),
    branchId: doc.branchId?.toHexString() ?? null,
    serviceId: doc.serviceId.toHexString(),
    doctorId: doc.doctorId?.toHexString() ?? null,
    userId: doc.userId.toHexString(),
    scheduledAt: doc.scheduledAt.toISOString(),
    scheduledDate: doc.scheduledDate,
    scheduledTime: doc.scheduledTime,
    status: doc.status,
    price: doc.price,
    cancel: {
      by: doc.cancel?.by ?? null,
      reason: doc.cancel?.reason ?? null,
      cancelledAt: doc.cancel?.cancelledAt ? doc.cancel.cancelledAt.toISOString() : null,
    },
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
    serviceTitle: service?.title,
    durationMin: service?.durationMin,
  }
}
