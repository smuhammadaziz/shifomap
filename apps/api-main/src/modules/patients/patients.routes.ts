import { Elysia } from "elysia"
import {
  authGoogleBodySchema,
  authPhoneBodySchema,
  completeProfileBodySchema,
  updatePatientBodySchema,
} from "./patients.model"
import {
  authGoogle,
  authPhone,
  getMe,
  completeProfile,
  updateMe,
} from "./patients.service"
import { requirePatientAuth } from "@/common/middleware/auth"
import { logger } from "@/common/logger"

export const patientsRoutes = new Elysia({ prefix: "/patients" })
  // POST /v1/patients/auth/google - Google OAuth (body: { idToken })
  .post("/auth/google", async ({ body, set }) => {
    const parsed = authGoogleBodySchema.safeParse(body ?? {})
    if (!parsed.success) {
      set.status = 400
      return {
        success: false,
        error: "Validation failed",
        code: "VALIDATION_ERROR",
        details: parsed.error.flatten().fieldErrors,
      }
    }
    const result = await authGoogle(parsed.data)
    set.status = 200
    return { success: true, data: result }
  })
  // POST /v1/patients/auth/phone - Phone auth (body: { phone }, optional header X-Preferred-Language: uz|ru|en)
  .post("/auth/phone", async ({ body, request, set }) => {
    logger.info("[patients] POST /auth/phone received", { body: body ?? {} })
    const parsed = authPhoneBodySchema.safeParse(body ?? {})
    if (!parsed.success) {
      logger.warn("[patients] POST /auth/phone validation failed", {
        errors: parsed.error.flatten().fieldErrors,
      })
      set.status = 400
      return {
        success: false,
        error: "Validation failed",
        code: "VALIDATION_ERROR",
        details: parsed.error.flatten().fieldErrors,
      }
    }
    const lang = (request.headers.get("x-preferred-language") ?? "uz") as "uz" | "ru" | "en"
    logger.info("[patients] POST /auth/phone calling authPhone", {
      phone: parsed.data.phone,
      preferredLanguage: lang,
    })
    try {
      const result = await authPhone(parsed.data, lang)
      logger.info("[patients] POST /auth/phone success", {
        patientId: result.patient._id,
        needsProfile: result.needsProfile,
      })
      set.status = 200
      return { success: true, data: result }
    } catch (err) {
      logger.error("[patients] POST /auth/phone error", {
        err: err instanceof Error ? err.message : String(err),
      })
      throw err
    }
  })
  .use(requirePatientAuth)
  // POST /v1/patients/me/complete - Complete profile after phone signup (body: fullName, gender, age)
  .post("/me/complete", async ({ body, auth, set }) => {
    const parsed = completeProfileBodySchema.safeParse(body ?? {})
    if (!parsed.success) {
      set.status = 400
      return {
        success: false,
        error: "Validation failed",
        code: "VALIDATION_ERROR",
        details: parsed.error.flatten().fieldErrors,
      }
    }
    const result = await completeProfile(auth.sub, parsed.data)
    set.status = 200
    return { success: true, data: result }
  })
  // GET /v1/patients/me
  .get("/me", async ({ auth, set }) => {
    const result = await getMe(auth.sub)
    set.status = 200
    return { success: true, data: result }
  })
  // PATCH /v1/patients/me
  .patch("/me", async ({ body, auth, set }) => {
    const parsed = updatePatientBodySchema.safeParse(body ?? {})
    if (!parsed.success) {
      set.status = 400
      return {
        success: false,
        error: "Validation failed",
        code: "VALIDATION_ERROR",
        details: parsed.error.flatten().fieldErrors,
      }
    }
    const result = await updateMe(auth.sub, parsed.data)
    set.status = 200
    return { success: true, data: result }
  })
