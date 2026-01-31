import { redirect } from "next/navigation"
import { cookies } from "next/headers"

const AUTH_COOKIE = "console_auth_token"

export default async function HomePage() {
  const cookieStore = await cookies()
  const token = cookieStore.get(AUTH_COOKIE)?.value
  if (token) {
    redirect("/dashboard")
  }
  redirect("/auth/login")
}
