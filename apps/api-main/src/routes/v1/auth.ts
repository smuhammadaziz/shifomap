import { Elysia } from 'elysia'

/**
 * Auth routes under /v1/auth.
 * Add: POST /v1/auth/login, POST /v1/auth/register, etc.
 */
export const authRoutes = new Elysia({ prefix: '/auth' })
  // .post('/login', loginHandler, { body: loginSchema })
  // .post('/register', registerHandler, { body: registerSchema })
  // .post('/logout', logoutHandler)
  // .get('/me', meHandler, { beforeHandle: [requireAuth] })
  .get('/', () => ({ message: 'Auth routes - add login, register here' }))
