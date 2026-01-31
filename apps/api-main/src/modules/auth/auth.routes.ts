import { Elysia } from "elysia"
import { createAdminBodySchema, loginAdminBodySchema, changePasswordBodySchema, updateProfileBodySchema } from "./auth.model"
import { createAdmin, loginAdmin, changeAdminPassword, updateAdminProfileService } from "./auth.service"
import { requireAuth } from "@/common/middleware/auth"

/**
 * Auth routes under /v1/auth
 * - POST /v1/auth/createAdmin - Create a new platform admin
 * - POST /v1/auth/loginAdmin - Login and get JWT token
 * - POST /v1/auth/changePassword - Change admin password (protected)
 * - PATCH /v1/auth/updateProfile - Update admin profile (protected)
 */
export const authRoutes = new Elysia({ prefix: "/auth" })
  // Create admin endpoint
  .post("/createAdmin", async ({ body, set }) => {
    const parsed = createAdminBodySchema.safeParse(body ?? {})
    if (!parsed.success) {
      set.status = 400
      return {
        success: false,
        error: "Validation failed",
        code: "VALIDATION_ERROR",
        details: parsed.error.flatten().fieldErrors,
      }
    }
    const result = await createAdmin(parsed.data)
    set.status = 201
    return { success: true, data: result }
  })
  // Login admin endpoint
  .post("/loginAdmin", async ({ body, request, set }) => {
    const parsed = loginAdminBodySchema.safeParse(body ?? {})
    if (!parsed.success) {
      set.status = 400
      return {
        success: false,
        error: "Validation failed",
        code: "VALIDATION_ERROR",
        details: parsed.error.flatten().fieldErrors,
      }
    }
    const ip = request.headers.get("x-forwarded-for") ?? request.headers.get("x-real-ip") ?? null
    const result = await loginAdmin(parsed.data, ip)
    set.status = 200
    return { success: true, data: result }
  })
  // Change password endpoint (protected)
  .use(requireAuth)
  .post("/changePassword", async ({ body, auth, set }) => {
    const parsed = changePasswordBodySchema.safeParse(body ?? {})
    if (!parsed.success) {
      set.status = 400
      return {
        success: false,
        error: "Validation failed",
        code: "VALIDATION_ERROR",
        details: parsed.error.flatten().fieldErrors,
      }
    }
    const result = await changeAdminPassword(auth.sub, parsed.data)
    set.status = 200
    return { success: true, data: result }
  })
  // Update profile endpoint (protected)
  .patch("/updateProfile", async ({ body, auth, set }) => {
    const parsed = updateProfileBodySchema.safeParse(body ?? {})
    if (!parsed.success) {
      set.status = 400
      return {
        success: false,
        error: "Validation failed",
        code: "VALIDATION_ERROR",
        details: parsed.error.flatten().fieldErrors,
      }
    }
    const result = await updateAdminProfileService(auth.sub, parsed.data)
    set.status = 200
    return { success: true, data: result }
  })
