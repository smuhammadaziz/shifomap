import { create } from 'zustand'
import Cookies from 'js-cookie'
import { getApiUrl } from '@/lib/api'

export interface User {
  _id: string
  userName: string
  displayName: string
  role?: string
  clinicId: string
  clinicDisplayName: string
  fullName?: string
}

interface AuthState {
  isAuthenticated: boolean
  user: User | null
  login: (username: string, password: string) => Promise<boolean>
  logout: () => void
  checkAuth: () => void
  updateUser: (updates: Partial<User>) => void
}

export const useAuthStore = create<AuthState>((set) => {
  // Check for existing auth on initialization
  const checkAuth = () => {
    // Only run on client side
    if (typeof window === 'undefined') {
      return
    }

    const token = Cookies.get('clinic_auth_token')
    const userStr = localStorage.getItem('clinic_user')
    const expiry = localStorage.getItem('clinic_token_expiry')
    
    if (token && userStr && expiry) {
      try {
        const expiryDate = new Date(expiry)
        if (expiryDate > new Date()) {
          const user = JSON.parse(userStr)
          set({ isAuthenticated: true, user })
        } else {
          // Token expired, clear everything
          Cookies.remove('clinic_auth_token')
          localStorage.removeItem('clinic_user')
          localStorage.removeItem('clinic_token_expiry')
          set({ isAuthenticated: false, user: null })
        }
      } catch {
        set({ isAuthenticated: false, user: null })
        Cookies.remove('clinic_auth_token')
        localStorage.removeItem('clinic_user')
        localStorage.removeItem('clinic_token_expiry')
      }
    } else {
      set({ isAuthenticated: false, user: null })
    }
  }

  // Initialize auth state only on client side
  if (typeof window !== 'undefined') {
    checkAuth()
  }

  return {
    isAuthenticated: false,
    user: null,
    checkAuth,
    login: async (username: string, password: string) => {
      try {
        const apiUrl = getApiUrl()
        
        // Try clinic owner login first
        console.log('[LOGIN] Attempting owner login to:', `${apiUrl}/v1/clinics/login`)
        let response = await fetch(`${apiUrl}/v1/clinics/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ username, password }),
        })

        let data = await response.json()
        console.log('[LOGIN] Owner login response status:', response.status)

        // If owner login fails with 401, try doctor login
        if (!response.ok && response.status === 401) {
          console.log('[LOGIN] Owner login failed, trying doctor login to:', `${apiUrl}/v1/clinics/doctors/login`)
          response = await fetch(`${apiUrl}/v1/clinics/doctors/login`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, password }),
          })
          data = await response.json()
          console.log('[LOGIN] Doctor login response status:', response.status)
        }

        if (response.ok && data.success) {
          // Handle both owner and doctor login responses
          const { token, owner, doctor, expiresIn } = data.data
          const user = owner || doctor // owner for clinic owner, doctor for doctor
          console.log('[LOGIN] Login successful! Token received, user:', user)
          
          // Calculate expiry date (7 days from now)
          const expiryDate = new Date()
          expiryDate.setDate(expiryDate.getDate() + 7)
          
          // Store token in cookie
          Cookies.set('clinic_auth_token', token, { expires: 7 })
          
          // Store user data and expiry in localStorage
          localStorage.setItem('clinic_user', JSON.stringify(user))
          localStorage.setItem('clinic_token_expiry', expiryDate.toISOString())
          
          set({ isAuthenticated: true, user })
          console.log('[LOGIN] Returning true for successful login')
          return true
        }
        console.log('[LOGIN] Login failed - response not ok or data.success is false')
        return false
      } catch (error) {
        console.error('[LOGIN] Login error:', error)
        return false
      }
    },
    logout: () => {
      Cookies.remove('clinic_auth_token')
      localStorage.removeItem('clinic_user')
      localStorage.removeItem('clinic_token_expiry')
      set({ isAuthenticated: false, user: null })
    },
    updateUser: (updates: Partial<User>) => {
      set((state) => {
        if (!state.user) return state
        const newUser = { ...state.user, ...updates }
        if (typeof window !== 'undefined') {
          localStorage.setItem('clinic_user', JSON.stringify(newUser))
        }
        return { user: newUser }
      })
    },
  }
})

