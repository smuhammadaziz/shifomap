import { Elysia } from "elysia"
import { createBookingBodySchema, cancelBookingBodySchema } from "./bookings.model"
import { createBooking, getMyBookings, getBookingById, getNextUpcoming, cancelBookingByPatient, getBookedSlots } from "./bookings.service"
import { requirePatientAuth } from "@/common/middleware/auth"
import { findClinicById } from "@/modules/clinics/clinics.repo"
import { findBookedTimesForDoctorOnDate } from "./bookings.repo"
import { toObjectId } from "@/common/utils/id"

export const bookingsRoutes = new Elysia({ prefix: "/bookings" })
  .use(requirePatientAuth)
  .get("/doctor-slots", async ({ query, set }) => {
    const clinicId = query.clinicId as string | undefined
    const doctorId = query.doctorId as string | undefined
    const date = query.date as string | undefined
    if (!clinicId || !doctorId || !date) {
      set.status = 400
      return { success: false, error: "clinicId, doctorId, and date are required" }
    }
    const clinic = await findClinicById(toObjectId(clinicId))
    if (!clinic) {
      set.status = 404
      return { success: false, error: "Clinic not found" }
    }
    const doctor = clinic.doctors?.find((d) => d._id.toHexString() === doctorId)
    if (!doctor) {
      set.status = 404
      return { success: false, error: "Doctor not found" }
    }
    const bookedTimes = await findBookedTimesForDoctorOnDate(
      toObjectId(clinicId),
      toObjectId(doctorId),
      date
    )
    const serviceIds = (doctor.serviceIds ?? []).map((id) => id.toHexString())
    const services = (clinic.services ?? [])
      .filter((s) => serviceIds.includes(s._id.toHexString()))
      .map((s) => ({
        _id: s._id.toHexString(),
        title: s.title,
        durationMin: s.durationMin,
        price: s.price,
        serviceImage: s.serviceImage ?? null,
      }))
    set.status = 200
    return {
      success: true,
      data: {
        schedule: doctor.schedule,
        bookedTimes,
        services,
      },
    }
  })
  .get("/booked-slots", async ({ query, set }) => {
    const clinicId = query.clinicId as string | undefined
    const doctorId = query.doctorId as string | undefined
    const date = query.date as string | undefined
    if (!clinicId || !doctorId || !date) {
      set.status = 400
      return { success: false, error: "clinicId, doctorId, and date are required" }
    }
    const bookedTimes = await getBookedSlots(clinicId, doctorId, date)
    set.status = 200
    return { success: true, data: bookedTimes }
  })
  .post("/", async ({ body, auth, set }) => {
    const parsed = createBookingBodySchema.safeParse(body ?? {})
    if (!parsed.success) {
      set.status = 400
      return {
        success: false,
        error: "Validation failed",
        code: "VALIDATION_ERROR",
        details: parsed.error.flatten().fieldErrors,
      }
    }
    const result = await createBooking(auth.sub, parsed.data)
    set.status = 201
    return { success: true, data: result }
  })
  .get("/me", async ({ query, auth, set }) => {
    const status = query.status as
      | "pending"
      | "confirmed"
      | "patient_arrived"
      | "in_progress"
      | "cancelled"
      | "completed"
      | undefined
    const result = await getMyBookings(auth.sub, status)
    set.status = 200
    return { success: true, data: result }
  })
  .get("/next-upcoming", async ({ auth, set }) => {
    const result = await getNextUpcoming(auth.sub)
    set.status = 200
    return { success: true, data: result }
  })
  .get("/:id", async ({ params, auth, set }) => {
    try {
      const result = await getBookingById(params.id, auth.sub)
      set.status = 200
      return { success: true, data: result }
    } catch (e: any) {
      set.status = 500
      return { success: false, error: e.stack || e.message || String(e) }
    }
  })
  .patch("/:id/cancel", async ({ params, body, auth, set }) => {
    const parsed = cancelBookingBodySchema.safeParse(body ?? {})
    if (!parsed.success) {
      set.status = 400
      return {
        success: false,
        error: "Validation failed",
        code: "VALIDATION_ERROR",
        details: parsed.error.flatten().fieldErrors,
      }
    }
    const result = await cancelBookingByPatient(params.id, auth.sub, parsed.data.reason ?? null)
    set.status = 200
    return { success: true, data: result }
  })
