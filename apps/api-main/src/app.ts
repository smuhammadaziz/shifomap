import { Elysia } from "elysia"
import { cors } from "@elysiajs/cors"
import { healthRoutes } from "@/modules/health/health.routes"
import { authRoutes } from "@/modules/auth/auth.routes"
import { usersRoutes } from "@/modules/users/users.routes"
import { clinicsRoutes } from "@/modules/clinics/clinics.routes"
import { AppError } from "@/common/errors"

// V1 API routes
const v1 = new Elysia({ prefix: "/v1" })
  .use(authRoutes)
  .use(usersRoutes)
  .use(clinicsRoutes)

// Main Elysia app
export const app = new Elysia()
  // CORS plugin - allows requests from any origin in dev
  .use(
    cors({
      origin: true, // Allow all origins (set to specific domains in production)
      credentials: true,
      allowedHeaders: ["Content-Type", "Authorization"],
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      maxAge: 86400,
    })
  )
  // Root endpoint
  .get("/", () => ({
    name: "api-main",
    version: "1.0.0",
    docs: "Use /v1/* for API endpoints",
  }))
  // Health check
  .use(healthRoutes)
  // V1 API
  .use(v1)
  // Global error handler
  .onError(({ error, set }) => {
    if (error instanceof AppError) {
      set.status = error.statusCode
      return { success: false, error: error.message, code: error.code }
    }
    set.status = 500
    return { success: false, error: "Internal server error" }
  })

export type App = typeof app
