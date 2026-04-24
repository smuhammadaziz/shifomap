'use client'

import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuthStore } from '@/store/auth-store'
import { useLanguage } from '@/contexts/language-context'
import { getApiUrl } from '@/lib/api'
import Cookies from 'js-cookie'
import {
  LayoutDashboard,
  Home,
  Briefcase,
  Users,
  BarChart3,
  Building2,
  Calendar,
  LogOut,
  Menu,
  X,
  Star,
  MessageSquare,
} from 'lucide-react'
import { useState, useMemo, useEffect } from 'react'
import { Button } from './ui/button'

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { t, language, setLanguage } = useLanguage()
  const { logout, user } = useAuthStore()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [doctorUnreadChats, setDoctorUnreadChats] = useState(0)
  const apiUrl = getApiUrl()

  const isDoctor = (user as { role?: string })?.role === 'doctor'

  useEffect(() => {
    if (!isDoctor) return
    const token = Cookies.get('clinic_auth_token')
    if (!token) return

    const loadUnread = async () => {
      try {
        const res = await fetch(`${apiUrl}/v1/chat/doctor/conversations`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        const json = await res.json()
        if (res.ok && json?.success) {
          const list = Array.isArray(json.data) ? json.data : []
          const total = list.reduce((acc: number, c: { unread?: number }) => acc + (c.unread ?? 0), 0)
          setDoctorUnreadChats(total)
        }
      } catch {
        // ignore transient network errors
      }
    }

    loadUnread()
    const timer = setInterval(loadUnread, 7000)
    return () => clearInterval(timer)
  }, [isDoctor, apiUrl])

  const ownerNavigation = useMemo(
    () => [
      { name: t.sidebar.dashboard, href: '/dashboard', icon: LayoutDashboard },
      { name: t.sidebar.clinic, href: '/dashboard/clinic', icon: Building2 },
      { name: t.sidebar.bookings, href: '/dashboard/bookings', icon: Calendar },
      { name: t.sidebar.accounts, href: '/dashboard/accounts', icon: Users },
      { name: t.sidebar.analytics, href: '/dashboard/analytics', icon: BarChart3 },
      { name: t.sidebar.ratingsAndReviews, href: '/dashboard/ratings', icon: Star },
    ],
    [t.sidebar]
  )

  const doctorNavigation = useMemo(
    () => [
      { name: t.sidebar.home, href: '/dashboard', icon: Home },
      { name: t.sidebar.myServices, href: '/dashboard/my-services', icon: Briefcase },
      { name: t.sidebar.myAppointments, href: '/dashboard/my-appointments', icon: Calendar },
      { name: t.sidebar.myClients, href: '/dashboard/my-clients', icon: Users },
      {
        name: language === 'uz' ? 'Xabarlar' : 'Сообщения',
        href: '/dashboard/messages',
        icon: MessageSquare,
        badge: doctorUnreadChats,
      },
      { name: t.dashboard.settingsTitle, href: '/dashboard/settings', icon: Building2 },
    ],
    [t.sidebar, t.dashboard.settingsTitle, language, doctorUnreadChats]
  )

  const navigation = isDoctor ? doctorNavigation : ownerNavigation

  const handleLogout = () => {
    logout()
    router.push('/auth/sign-in')
    router.refresh()
  }

  return (
    <>
      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-gray-200 transform ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0 transition-transform duration-300 ease-in-out`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center">
                <span className="text-white font-bold text-sm">⌘</span>
              </div>
              <span className="text-xl font-bold text-gray-900">{t.common.clinicAdmin}</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setMobileMenuOpen(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
            {navigation.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <item.icon className="h-5 w-5" />
                  <span>{item.name}</span>
                  {typeof (item as { badge?: number }).badge === 'number' && (item as { badge?: number }).badge! > 0 ? (
                    <span className="ml-auto inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-blue-600 text-white text-[10px] font-bold">
                      {(item as { badge?: number }).badge}
                    </span>
                  ) : null}
                </Link>
              )
            })}
          </nav>

          {/* Language switcher */}
          <div className="border-t border-gray-200 px-4 py-3">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <button
                type="button"
                onClick={() => setLanguage('uz')}
                className={`px-2 py-1 rounded transition-colors ${
                  language === 'uz'
                    ? 'bg-blue-100 text-blue-700 font-medium'
                    : 'hover:bg-gray-100'
                }`}
              >
                {t.signIn.langOzbek}
              </button>
              <button
                type="button"
                onClick={() => setLanguage('ru')}
                className={`px-2 py-1 rounded transition-colors ${
                  language === 'ru'
                    ? 'bg-blue-100 text-blue-700 font-medium'
                    : 'hover:bg-gray-100'
                }`}
              >
                {t.signIn.langRussian}
              </button>
            </div>
          </div>

          {/* User section */}
          <div className="border-t border-gray-200 p-4">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-medium">
                  {(user?.displayName || user?.userName)?.charAt(0)?.toUpperCase() ?? 'A'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {(user as { displayName?: string; fullName?: string; userName?: string })?.displayName ||
                    (user as { fullName?: string })?.fullName ||
                    user?.userName ||
                    t.common.adminUser}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {user?.userName ?? ''}
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4 mr-2" />
              {t.common.logout}
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile overlay */}
      {mobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-30"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}
    </>
  )
}

