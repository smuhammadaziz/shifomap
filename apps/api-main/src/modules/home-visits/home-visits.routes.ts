import { Elysia } from "elysia"
import { requirePatientAuth } from "@/common/middleware/auth"
import { createHomeVisitBodySchema } from "./home-visits.model"
import { createHomeVisit } from "./home-visits.service"

export const homeVisitsPatientRoutes = new Elysia({ prefix: "/patients/me/home-visits" })
  .use(requirePatientAuth)
  .post("/", async ({ auth, body, set }) => {
    const parsed = createHomeVisitBodySchema.safeParse(body ?? {})
    if (!parsed.success) {
      set.status = 400
      return {
        success: false,
        error: "Validation failed",
        code: "VALIDATION_ERROR",
        details: parsed.error.flatten().fieldErrors,
      }
    }
    const data = await createHomeVisit(auth.sub, parsed.data)
    set.status = 201
    return { success: true, data }
  })
