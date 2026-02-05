import { Elysia } from "elysia"
import { createBookingBodySchema, cancelBookingBodySchema } from "./bookings.model"
import { createBooking, getMyBookings, getBookingById, getNextUpcoming, cancelBookingByPatient } from "./bookings.service"
import { requirePatientAuth } from "@/common/middleware/auth"

export const bookingsRoutes = new Elysia({ prefix: "/bookings" })
  .use(requirePatientAuth)
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
    const status = query.status as "pending" | "confirmed" | "cancelled" | "completed" | undefined
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
    const result = await getBookingById(params.id, auth.sub)
    set.status = 200
    return { success: true, data: result }
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
