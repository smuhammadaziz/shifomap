import { Elysia } from "elysia"
import { requireAuth } from "@/common/middleware/auth"
import {
  getClinicBookings,
  getDoctorTodayBookings,
  getDoctorBookings,
  getClinicBookingById,
  clinicConfirmBooking,
  clinicMarkArrived,
  doctorStartConsultation,
  doctorFinishConsultation,
  clinicCancelBooking,
} from "./bookings.service"
import { cancelBookingBodySchema } from "./bookings.model"

export const bookingsManageRoutes = new Elysia({ prefix: "/bookings-manage" })
  .use(requireAuth)
  // Clinic owner/admin: list all bookings for clinic
  .get("/clinic", async ({ auth, query, set }) => {
    const status = (query.status as string | undefined) ?? undefined
    const data = await getClinicBookings(auth, { status: status as any })
    set.status = 200
    return { success: true, data }
  })
  // Doctor: list today's bookings
  .get("/doctor/today", async ({ auth, set }) => {
    const data = await getDoctorTodayBookings(auth)
    set.status = 200
    return { success: true, data }
  })
  // Doctor: list all my bookings (past + upcoming)
  .get("/doctor", async ({ auth, set }) => {
    const data = await getDoctorBookings(auth)
    set.status = 200
    return { success: true, data }
  })
  // Clinic/doctor: get booking details
  .get("/:id", async ({ auth, params, set }) => {
    const data = await getClinicBookingById(auth, params.id)
    set.status = 200
    return { success: true, data }
  })
  // Status transitions
  .patch("/:id/confirm", async ({ auth, params, set }) => {
    const data = await clinicConfirmBooking(auth, params.id)
    set.status = 200
    return { success: true, data }
  })
  .patch("/:id/patient-arrived", async ({ auth, params, set }) => {
    const data = await clinicMarkArrived(auth, params.id)
    set.status = 200
    return { success: true, data }
  })
  .patch("/:id/start", async ({ auth, params, set }) => {
    const data = await doctorStartConsultation(auth, params.id)
    set.status = 200
    return { success: true, data }
  })
  .patch("/:id/finish", async ({ auth, params, set }) => {
    const data = await doctorFinishConsultation(auth, params.id)
    set.status = 200
    return { success: true, data }
  })
  .patch("/:id/cancel", async ({ auth, params, body, set }) => {
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
    const data = await clinicCancelBooking(auth, params.id, parsed.data.reason ?? null)
    set.status = 200
    return { success: true, data }
  })

