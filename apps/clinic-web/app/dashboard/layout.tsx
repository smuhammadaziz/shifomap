'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth-store'
import Sidebar from '@/components/sidebar'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const { isAuthenticated, checkAuth } = useAuthStore()
  const [hasCheckedAuth, setHasCheckedAuth] = useState(false)

  // Run checkAuth on mount; only then allow redirect decision
  useEffect(() => {
    checkAuth()
    setHasCheckedAuth(true)
  }, [checkAuth])

  // Redirect only after we've run checkAuth (avoids redirecting before reading token from storage)
  useEffect(() => {
    if (hasCheckedAuth && !isAuthenticated) {
      router.replace('/auth/sign-in')
    }
  }, [hasCheckedAuth, isAuthenticated, router])

  // Re-check auth every 60 seconds (token expiry)
  useEffect(() => {
    const interval = setInterval(() => {
      checkAuth()
    }, 60 * 1000)
    return () => clearInterval(interval)
  }, [checkAuth])

  if (!hasCheckedAuth || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-pulse text-gray-500">Loading…</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <div className="lg:pl-64">
        <main className="py-8 px-4 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  )
}

