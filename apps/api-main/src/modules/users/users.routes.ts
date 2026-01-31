import { Elysia } from "elysia"

/**
 * Users module routes
 * GET /v1/users - Placeholder for future user CRUD
 * Add users.service, users.repo, users.model, users.dto when implementing
 */
export const usersRoutes = new Elysia({ prefix: "/users" }).get("/", () => ({
  success: true,
  data: { message: "Users module - add CRUD here" },
}))
