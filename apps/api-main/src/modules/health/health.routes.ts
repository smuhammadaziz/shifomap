import { Elysia } from "elysia"

/**
 * Health check endpoint
 * GET /health - Returns server status
 */
export const healthRoutes = new Elysia({ prefix: "/health" }).get("/", () => ({
  success: true,
  data: {
    status: "ok",
    timestamp: new Date().toISOString(),
  },
}))
