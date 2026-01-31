/**
 * API base URL from env. Used for auth and other API calls.
 */
export function getApiUrl(): string {
  if (typeof window !== "undefined") {
    return (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/$/, "") || "http://localhost:8080"
  }
  return process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080"
}

/**
 * Decode JWT payload without verifying (client-side; only to read exp).
 * Returns { exp?: number } or null if invalid.
 */
export function decodeJwtPayload(token: string): { exp?: number } | null {
  try {
    const parts = token.split(".")
    if (parts.length !== 3) return null
    const payload = parts[1]
    const decoded = atob(payload.replace(/-/g, "+").replace(/_/g, "/"))
    return JSON.parse(decoded) as { exp?: number }
  } catch {
    return null
  }
}

/**
 * Check if token is expired (exp in seconds since epoch).
 */
export function isTokenExpired(token: string): boolean {
  const payload = decodeJwtPayload(token)
  if (!payload?.exp) return true
  const nowSec = Math.floor(Date.now() / 1000)
  return payload.exp < nowSec
}
