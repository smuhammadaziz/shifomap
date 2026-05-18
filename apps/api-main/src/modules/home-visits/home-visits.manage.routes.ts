import { Elysia } from "elysia"
import { requireAuth } from "@/common/middleware/auth"
import { updateHomeVisitStatusBodySchema } from "./home-visits.model"
import {
  getHomeVisitById,
  listHomeVisitsForClinic,
  listHomeVisitsForDoctor,
  updateHomeVisitStatus,
} from "./home-visits.service"

export const homeVisitsManageRoutes = new Elysia({ prefix: "/home-visits-manage" })
  .use(requireAuth)
  .get("/doctor", async ({ auth, query, set }) => {
    const status = (query.status as string | undefined) || undefined
    const data = await listHomeVisitsForDoctor(auth, status as any)
    set.status = 200
    return { success: true, data }
  })
  .get("/clinic", async ({ auth, query, set }) => {
    const status = (query.status as string | undefined) || undefined
    const data = await listHomeVisitsForClinic(auth, status as any)
    set.status = 200
    return { success: true, data }
  })
  .get("/:id", async ({ auth, params, set }) => {
    const data = await getHomeVisitById(auth, params.id)
    set.status = 200
    return { success: true, data }
  })
  .patch("/:id/confirm", async ({ auth, params, set }) => {
    const data = await updateHomeVisitStatus(auth, params.id, "confirmed")
    set.status = 200
    return { success: true, data }
  })
  .patch("/:id/complete", async ({ auth, params, set }) => {
    const data = await updateHomeVisitStatus(auth, params.id, "completed")
    set.status = 200
    return { success: true, data }
  })
  .patch("/:id/cancel", async ({ auth, params, body, set }) => {
    const parsed = updateHomeVisitStatusBodySchema.safeParse(body ?? {})
    if (!parsed.success) {
      set.status = 400
      return { success: false, error: "Validation failed", details: parsed.error.flatten().fieldErrors }
    }
    const data = await updateHomeVisitStatus(auth, params.id, "cancelled", parsed.data.reason)
    set.status = 200
    return { success: true, data }
  })
