export function getApiUrl(): string {
  const raw = process.env.NEXT_PUBLIC_API_URL?.trim()
  if (raw) {
    return raw.replace(/\/+$/, "")
  }
  // Dev fallback: use local api-main (pnpm dev in apps/api-main).
  return "http://localhost:3000"
}
