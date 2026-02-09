import { Elysia } from "elysia"
import { landingContactBodySchema } from "./landing.model"
import { sendClinicContactToTelegram } from "./landing.service"

/**
 * Landing page routes (public).
 * POST /v1/landing/contact - Clinic contacted us (sends notification to Telegram group).
 */
export const landingRoutes = new Elysia({ prefix: "/landing" }).post(
  "/contact",
  async ({ body, set }) => {
    try {
      const parsed = landingContactBodySchema.safeParse(body ?? {})
      if (!parsed.success) {
        set.status = 400
        return {
          success: false,
          error: "Validation failed",
          code: "VALIDATION_ERROR",
          details: parsed.error.flatten().fieldErrors,
        }
      }
      await sendClinicContactToTelegram(parsed.data)
      set.status = 200
      return { success: true, data: { message: "Notification sent" } }
    } catch (error: unknown) {
      const err = error as { message?: string }
      set.status = 500
      return { success: false, error: err?.message ?? "Internal server error" }
    }
  }
)
