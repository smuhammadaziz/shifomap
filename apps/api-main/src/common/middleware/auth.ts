import { Elysia } from "elysia"
import { jwtVerify, SignJWT } from "jose"
import { env } from "@/env"
import { unauthorized } from "@/common/errors"

const secret = new TextEncoder().encode(env.JWT_SECRET)

export type JwtPayload = {
  sub: string // admin _id or owner _id
  username: string
  role: string // e.g. "SUPER_ADMIN_SHIFO" or "clinic_owner"
  clinicId?: string // set for clinic owner tokens
}

/**
 * Sign JWT token for admin authentication
 * Token expires in JWT_EXPIRES_IN (default 7d)
 */
export async function signToken(payload: JwtPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer(env.JWT_ISSUER)
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(env.JWT_EXPIRES_IN)
    .sign(secret)
}

/**
 * Verify JWT token
 * Throws if invalid or expired
 */
export async function verifyToken(token: string): Promise<JwtPayload> {
  const { payload } = await jwtVerify(token, secret, { issuer: env.JWT_ISSUER })
  return payload as unknown as JwtPayload
}

/**
 * Elysia plugin to require authentication
 * Adds `auth` to context with decoded JWT payload
 * Usage: .use(requireAuth).get("/protected", ({ auth }) => ...)
 */
export const requireAuth = new Elysia({ name: "requireAuth" }).derive(
  { as: "scoped" },
  async ({ request }) => {
    const auth = request.headers.get("authorization")
    const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null

    if (!token) {
      throw unauthorized("Missing or invalid Authorization header")
    }

    try {
      const payload = await verifyToken(token)
      return { auth: payload }
    } catch {
      throw unauthorized("Invalid or expired token")
    }
  }
)
