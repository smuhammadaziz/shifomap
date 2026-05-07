import { Elysia } from "elysia"
import { requireAuth } from "@/common/middleware/auth"
import { unauthorized } from "@/common/errors"
import { getAdminPillCheckStats } from "./prescriptions.service"

function isPlatformAdmin(role?: string) {
  return role === "SUPER_ADMIN_SHIFO" || role === "admin"
}

export const prescriptionsAdminRoutes = new Elysia({ prefix: "/admin" })
  .use(requireAuth)
  .get("/pill-check-stats", async ({ auth, query, set }) => {
    if (!isPlatformAdmin(auth.role)) throw unauthorized("Admin only")
    const from = ((query.from as string) ?? "").trim()
    const to = ((query.to as string) ?? "").trim()
    const q = ((query.q as string) ?? "").trim()
    const data = await getAdminPillCheckStats(from, to, q)
    set.status = 200
    return { success: true, data: { rows: data } }
  })
