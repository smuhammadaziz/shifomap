import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

const CONSOLE_AUTH_COOKIE = "console_auth_token"
const CONSOLE_USER_COOKIE = "console_user"

const publicPaths = ["/auth/login", "/auth/sign-in"]
const authPath = "/auth/login"

function isPublic(pathname: string) {
  return publicPaths.some((p) => pathname === p || pathname.startsWith(p + "/"))
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const token = request.cookies.get(CONSOLE_AUTH_COOKIE)?.value
  const user = request.cookies.get(CONSOLE_USER_COOKIE)?.value

  const hasAuth = !!(token && user)

  if (isPublic(pathname)) {
    if (hasAuth) {
      return NextResponse.redirect(new URL("/dashboard", request.url))
    }
    return NextResponse.next()
  }

  if (!hasAuth) {
    const loginUrl = new URL(authPath, request.url)
    loginUrl.searchParams.set("from", pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/).*)",
  ],
}
