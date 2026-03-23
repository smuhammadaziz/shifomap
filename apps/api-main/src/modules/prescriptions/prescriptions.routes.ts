import { Elysia } from "elysia"
import { requirePatientAuth, requireAuth } from "@/common/middleware/auth"
import { upsertPrescriptionBodySchema, prescriptionEventBodySchema } from "./prescriptions.model"
import { upsertPrescriptionByDoctor, listMyPrescriptions, getMyPrescriptionDetail, setMyPrescriptionEvent, getMyNextPill } from "./prescriptions.service"

export const prescriptionsRoutes = new Elysia({ prefix: "/prescriptions" })
  // Doctor create/update prescription (requires doctor auth)
  .use(requireAuth)
  .post("/", async ({ auth, body, set }) => {
    const parsed = upsertPrescriptionBodySchema.safeParse(body ?? {})
    if (!parsed.success) {
      set.status = 400
      return {
        success: false,
        error: "Validation failed",
        code: "VALIDATION_ERROR",
        details: parsed.error.flatten().fieldErrors,
      }
    }
    const data = await upsertPrescriptionByDoctor(auth, parsed.data as any)
    set.status = 200
    return { success: true, data }
  })

// Patient routes
export const prescriptionsPatientRoutes = new Elysia({ prefix: "/prescriptions" })
  .use(requirePatientAuth)
  .get("/me", async ({ auth, set }) => {
    const data = await listMyPrescriptions(auth)
    set.status = 200
    return { success: true, data }
  })
  .get("/me/next", async ({ auth, set }) => {
    const data = await getMyNextPill(auth)
    set.status = 200
    return { success: true, data }
  })
  .get("/:id", async ({ auth, params, query, set }) => {
    const date = (query.date as string | undefined) ?? undefined
    const data = await getMyPrescriptionDetail(auth, params.id, date)
    set.status = 200
    return { success: true, data }
  })
  .post("/:id/event", async ({ auth, params, body, set }) => {
    const parsed = prescriptionEventBodySchema.safeParse(body ?? {})
    if (!parsed.success) {
      set.status = 400
      return {
        success: false,
        error: "Validation failed",
        code: "VALIDATION_ERROR",
        details: parsed.error.flatten().fieldErrors,
      }
    }
    const data = await setMyPrescriptionEvent(auth, params.id, parsed.data)
    set.status = 200
    return { success: true, data }
  })

