import { Elysia } from 'elysia'
import { authRoutes } from './auth'

/**
 * V1 API - all routes are under /v1.
 * Add new routes here without repeating "v1" in path.
 * Examples: .get('/get', ...) -> GET /v1/get
 *           .use(authRoutes) -> /v1/auth/login, /v1/auth/register
 */
export const v1 = new Elysia({ prefix: '/v1' })
  // Sample GET - GET /v1/get
  .get('/get', () => ({
    success: true,
  }))
  .use(authRoutes)
// Future: .use(patientsRoutes)  -> /v1/patients, /v1/patients/:id
// Future: .use(appointmentsRoutes)
