import { create } from "zustand"
import Cookies from "js-cookie"
import { getApiUrl, decodeJwtPayload, isTokenExpired } from "@/lib/api"

const AUTH_TOKEN_KEY = "console_auth_token"
const USER_KEY = "console_user"
const TOKEN_EXP_KEY = "console_auth_token_exp"

interface User {
  _id: string
  username: string
  displayName: string
  name?: string
  status: string
  role: string
  access: { permissions: string[] }
}

interface AuthState {
  isAuthenticated: boolean
  user: User | null
  login: (username: string, password: string) => Promise<boolean>
  logout: () => void
  checkAuth: () => void
  setUser: (user: User) => void
}

function clearAllAuthStorage() {
  Cookies.remove(AUTH_TOKEN_KEY)
  Cookies.remove(USER_KEY)
  Cookies.remove(TOKEN_EXP_KEY)
  if (typeof window !== "undefined") {
    const keysToRemove: string[] = []
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i)
      if (
        key &&
        (key.startsWith("console_") || key === "auth_token" || key === "user")
      ) {
        keysToRemove.push(key)
      }
    }
    keysToRemove.forEach((k) => window.localStorage.removeItem(k))
  }
}

const cookieOpts = { expires: 7, sameSite: "strict" as const }

export const useAuthStore = create<AuthState>((set, get) => {
  const checkAuth = () => {
    const token =
      Cookies.get(AUTH_TOKEN_KEY) ??
      (typeof window !== "undefined"
        ? window.localStorage.getItem(AUTH_TOKEN_KEY)
        : null)
    const userStr =
      Cookies.get(USER_KEY) ??
      (typeof window !== "undefined"
        ? window.localStorage.getItem(USER_KEY)
        : null)

    if (!token || !userStr) {
      set({ isAuthenticated: false, user: null })
      return
    }

    if (isTokenExpired(token)) {
      clearAllAuthStorage()
      set({ isAuthenticated: false, user: null })
      return
    }

    try {
      const user = JSON.parse(userStr)
      set({ isAuthenticated: true, user })
    } catch {
      clearAllAuthStorage()
      set({ isAuthenticated: false, user: null })
    }
  }

  if (typeof window !== "undefined") {
    checkAuth()
  }

  return {
    isAuthenticated: false,
    user: null,
    checkAuth,
    login: async (username: string, password: string) => {
      const apiUrl = getApiUrl()
      const res = await fetch(`${apiUrl}/v1/auth/loginAdmin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      })

      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        return false
      }
      if (!json.success || !json.data?.token || !json.data?.admin) {
        return false
      }

      const { token, admin } = json.data
      const payload = decodeJwtPayload(token)
      const exp = payload?.exp ?? null

      // Store full admin object with all fields
      const user: User = {
        _id: admin._id,
        username: admin.username,
        displayName: admin.displayName,
        name: admin.displayName, // for backward compatibility
        status: admin.status,
        role: admin.role,
        access: admin.access,
      }

      Cookies.set(AUTH_TOKEN_KEY, token, cookieOpts)
      Cookies.set(USER_KEY, JSON.stringify(user), cookieOpts)
      if (exp) {
        Cookies.set(TOKEN_EXP_KEY, String(exp), cookieOpts)
      }

      if (typeof window !== "undefined") {
        window.localStorage.setItem(AUTH_TOKEN_KEY, token)
        window.localStorage.setItem(USER_KEY, JSON.stringify(user))
        if (exp != null) {
          window.localStorage.setItem(TOKEN_EXP_KEY, String(exp))
        }
      }

      set({ isAuthenticated: true, user })
      return true
    },
    logout: () => {
      clearAllAuthStorage()
      set({ isAuthenticated: false, user: null })
    },
    setUser: (user: User) => {
      // Update user in state
      set({ user })
      // Update user in localStorage
      if (typeof window !== "undefined") {
        window.localStorage.setItem(USER_KEY, JSON.stringify(user))
      }
      // Update user in cookies
      Cookies.set(USER_KEY, JSON.stringify(user), { expires: 7 })
    },
  }
})
