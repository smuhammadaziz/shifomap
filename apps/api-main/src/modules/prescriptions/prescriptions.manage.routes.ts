import { Elysia } from "elysia"
import { requireAuth } from "@/common/middleware/auth"
import { ObjectId } from "mongodb"
import { unauthorized, notFound } from "@/common/errors"
import { findBookingByIdForClinic } from "@/modules/bookings/bookings.repo"
import { findPrescriptionByBookingId } from "./prescriptions.repo"
import { findClinicById } from "@/modules/clinics/clinics.repo"

export const prescriptionsManageRoutes = new Elysia({ prefix: "/prescriptions" })
  .use(requireAuth)
  // Clinic owner/admin/doctor: get prescription by bookingId (for clinic dashboards)
  .get("/booking/:bookingId", async ({ auth, params, set }) => {
    if (!auth.clinicId) throw unauthorized("Clinic access only")
    if (!(auth.role === "doctor" || auth.role?.startsWith("clinic_"))) throw unauthorized("Clinic admin or doctor only")
    if (!ObjectId.isValid(params.bookingId)) throw notFound("Booking not found")
    const clinicId = new ObjectId(auth.clinicId)
    const bookingId = new ObjectId(params.bookingId)
    const booking = await findBookingByIdForClinic(bookingId, clinicId)
    if (!booking) throw notFound("Booking not found")
    if (auth.role === "doctor") {
      if (!booking.doctorId || booking.doctorId.toHexString() !== auth.sub) throw unauthorized("This booking is not assigned to you")
    }
    const rx = await findPrescriptionByBookingId(bookingId)
    if (!rx) {
      set.status = 200
      return { success: true, data: null }
    }
    const clinic = await findClinicById(clinicId)
    const doctor = clinic?.doctors?.find((d) => d._id.equals(rx.doctorId)) ?? null
    set.status = 200
    return {
      success: true,
      data: {
        _id: rx._id.toHexString(),
        bookingId: rx.bookingId.toHexString(),
        clinicId: rx.clinicId.toHexString(),
        doctorId: rx.doctorId.toHexString(),
        doctorName: doctor?.fullName ?? "",
        clinicName: clinic?.clinicDisplayName ?? "",
        medicines: rx.medicines,
        createdAt: rx.createdAt.toISOString(),
        updatedAt: rx.updatedAt.toISOString(),
      },
    }
  })

