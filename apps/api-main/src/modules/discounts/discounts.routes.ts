import { Elysia } from "elysia"
import { requireAuth } from "@/common/middleware/auth"
import { createDiscountBodySchema, updateDiscountBodySchema } from "./discounts.model"
import { listPublicDiscounts, listMyDiscounts, createDiscount, patchDiscount, removeDiscount } from "./discounts.service"

export const discountsRoutes = new Elysia({ prefix: "/discounts" })
  .get("/public", async ({ query, set }) => {
    const city = (query.city as string | undefined) ?? undefined
    const limit = Math.min(50, Math.max(1, parseInt((query.limit as string) || "12", 10) || 12))
    const data = await listPublicDiscounts(city, limit)
    set.status = 200
    return { success: true, data: { items: data } }
  })
  .use(requireAuth)
  .get("/clinics/me", async ({ auth, set }) => {
    const data = await listMyDiscounts(auth)
    set.status = 200
    return { success: true, data: { items: data } }
  })
  .post("/clinics/me", async ({ auth, body, set }) => {
    const parsed = createDiscountBodySchema.safeParse(body ?? {})
    if (!parsed.success) {
      set.status = 400
      return { success: false, error: "Validation failed", details: parsed.error.flatten().fieldErrors }
    }
    const data = await createDiscount(auth, parsed.data as any)
    set.status = 201
    return { success: true, data }
  })
  .patch("/clinics/me/:id", async ({ auth, params, body, set }) => {
    const parsed = updateDiscountBodySchema.safeParse(body ?? {})
    if (!parsed.success) {
      set.status = 400
      return { success: false, error: "Validation failed", details: parsed.error.flatten().fieldErrors }
    }
    const data = await patchDiscount(auth, params.id, parsed.data as any)
    set.status = 200
    return { success: true, data }
  })
  .delete("/clinics/me/:id", async ({ auth, params, set }) => {
    const data = await removeDiscount(auth, params.id)
    set.status = 200
    return { success: true, data }
  })
