'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useLanguage } from '@/contexts/language-context'
import { useAuthStore } from '@/store/auth-store'
import Link from 'next/link'
import { Calendar, Briefcase, Users, MessageSquare, ArrowRight, Stethoscope } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import Cookies from 'js-cookie'
import { getApiUrl } from '@/lib/api'

export default function DashboardPage() {
  const { t, language } = useLanguage()
  const user = useAuthStore((s) => s.user)
  const isDoctor = (user as { role?: string })?.role === 'doctor'

  const token = useMemo(() => Cookies.get('clinic_auth_token') || null, [])
  const apiUrl = getApiUrl()
  const [stats, setStats] = useState<{ today: number; upcoming: number; total: number; pending: number }>({
    today: 0,
    upcoming: 0,
    total: 0,
    pending: 0,
  })

  useEffect(() => {
    if (!isDoctor || !token) return
    const load = async () => {
      try {
        const res = await fetch(`${apiUrl}/v1/bookings-manage/doctor`, { headers: { Authorization: `Bearer ${token}` } })
        const json = await res.json()
        const list: Array<{ scheduledDate: string; status: string }> = res.ok && json?.success ? json.data ?? [] : []
        const todayStr = new Date().toISOString().slice(0, 10)
        const today = list.filter((b) => b.scheduledDate === todayStr && b.status !== 'cancelled').length
        const upcoming = list.filter(
          (b) => b.scheduledDate > todayStr && b.status !== 'cancelled' && b.status !== 'completed',
        ).length
        const pending = list.filter((b) => b.status === 'pending').length
        setStats({ today, upcoming, total: list.length, pending })
      } catch {
        // noop
      }
    }
    load()
  }, [isDoctor, apiUrl, token])

  if (isDoctor) {
    const displayName =
      (user as { displayName?: string; fullName?: string })?.displayName ??
      (user as { fullName?: string })?.fullName ??
      user?.userName ??
      ''
    const greeting = language === 'uz' ? 'Salom' : language === 'ru' ? 'Здравствуйте' : 'Hello'
    return (
      <div className="space-y-8">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-600 p-8 text-white shadow-lg">
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-sm text-xs font-semibold">
              <Stethoscope className="h-3.5 w-3.5" />
              {language === 'uz' ? 'SHIFOKOR PANELI' : language === 'ru' ? 'КАБИНЕТ ВРАЧА' : 'DOCTOR DASHBOARD'}
            </div>
            <h1 className="mt-3 text-3xl md:text-4xl font-bold">
              {greeting}, {displayName}
            </h1>
            <p className="mt-2 text-white/90 max-w-lg">
              {language === 'uz'
                ? 'Bugungi jadvalingiz va bemorlaringiz. Har bir bemorga g‘amxo‘rlik bilan yondashing.'
                : language === 'ru'
                ? 'Ваше расписание на сегодня и пациенты. Уделите каждому пациенту внимание.'
                : 'Your schedule and patients for today. Care for each patient with attention.'}
            </p>
          </div>
          <div className="absolute -right-10 -top-10 w-56 h-56 rounded-full bg-white/10 blur-2xl" />
          <div className="absolute -right-20 -bottom-20 w-64 h-64 rounded-full bg-pink-400/20 blur-3xl" />
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label={language === 'uz' ? 'Bugun' : language === 'ru' ? 'Сегодня' : 'Today'}
            value={stats.today}
            tone="blue"
            icon={<Calendar className="h-5 w-5" />}
          />
          <StatCard
            label={language === 'uz' ? 'Keyingi' : language === 'ru' ? 'Предстоящие' : 'Upcoming'}
            value={stats.upcoming}
            tone="emerald"
            icon={<Calendar className="h-5 w-5" />}
          />
          <StatCard
            label={language === 'uz' ? 'Kutilmoqda' : language === 'ru' ? 'В ожидании' : 'Pending'}
            value={stats.pending}
            tone="amber"
            icon={<Calendar className="h-5 w-5" />}
          />
          <StatCard
            label={language === 'uz' ? 'Jami' : language === 'ru' ? 'Всего' : 'Total'}
            value={stats.total}
            tone="violet"
            icon={<Users className="h-5 w-5" />}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <QuickLink href="/dashboard/my-appointments" icon={<Calendar className="h-6 w-6" />} label={t.sidebar.myAppointments} tone="blue" />
          <QuickLink href="/dashboard/my-services" icon={<Briefcase className="h-6 w-6" />} label={t.sidebar.myServices} tone="emerald" />
          <QuickLink href="/dashboard/my-clients" icon={<Users className="h-6 w-6" />} label={t.sidebar.myClients} tone="amber" />
          <QuickLink
            href="/dashboard/messages"
            icon={<MessageSquare className="h-6 w-6" />}
            label={language === 'uz' ? 'Xabarlar' : 'Сообщения'}
            tone="violet"
          />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">{t.dashboard.title}</h1>
        <p className="text-gray-600 mt-2">{t.dashboard.welcome}</p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t.dashboard.totalRevenue}</CardTitle>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              className="h-4 w-4 text-muted-foreground"
            >
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$1,250.00</div>
            <p className="text-xs text-muted-foreground">+12.5% {t.dashboard.fromLastMonth}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t.dashboard.newPatients}</CardTitle>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              className="h-4 w-4 text-muted-foreground"
            >
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1,234</div>
            <p className="text-xs text-muted-foreground">-20% {t.dashboard.fromLastPeriod}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t.dashboard.activeAppointments}</CardTitle>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              className="h-4 w-4 text-muted-foreground"
            >
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
            </svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">45,678</div>
            <p className="text-xs text-muted-foreground">+12.5% {t.dashboard.fromLastMonth}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t.dashboard.growthRate}</CardTitle>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              className="h-4 w-4 text-muted-foreground"
            >
              <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
              <polyline points="16 7 22 7 22 13" />
            </svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">4.5%</div>
            <p className="text-xs text-muted-foreground">+4.5% {t.dashboard.fromLastMonth}</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>{t.dashboard.overview}</CardTitle>
            <CardDescription>{t.dashboard.overviewDesc}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] flex items-center justify-center text-gray-500">
              {t.dashboard.chartPlaceholder}
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>{t.dashboard.recentActivity}</CardTitle>
            <CardDescription>{t.dashboard.recentActivityDesc}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center space-x-4">
                <div className="w-2 h-2 bg-blue-600 rounded-full" />
                <div className="flex-1">
                  <p className="text-sm font-medium">{t.dashboard.newAppointmentScheduled}</p>
                  <p className="text-xs text-gray-500">2 {t.dashboard.hoursAgo}</p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <div className="w-2 h-2 bg-green-600 rounded-full" />
                <div className="flex-1">
                  <p className="text-sm font-medium">{t.dashboard.patientCheckinCompleted}</p>
                  <p className="text-xs text-gray-500">4 {t.dashboard.hoursAgo}</p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <div className="w-2 h-2 bg-yellow-600 rounded-full" />
                <div className="flex-1">
                  <p className="text-sm font-medium">{t.dashboard.prescriptionUpdated}</p>
                  <p className="text-xs text-gray-500">6 {t.dashboard.hoursAgo}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function StatCard({
  label,
  value,
  tone,
  icon,
}: {
  label: string
  value: number
  tone: 'blue' | 'emerald' | 'amber' | 'violet'
  icon: React.ReactNode
}) {
  const toneMap: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-700',
    emerald: 'bg-emerald-50 text-emerald-700',
    amber: 'bg-amber-50 text-amber-700',
    violet: 'bg-violet-50 text-violet-700',
  }
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${toneMap[tone]}`}>{icon}</div>
        <p className="text-3xl font-bold text-gray-900">{value}</p>
      </div>
      <p className="text-sm text-gray-500 mt-3">{label}</p>
    </div>
  )
}

function QuickLink({
  href,
  icon,
  label,
  tone,
}: {
  href: string
  icon: React.ReactNode
  label: string
  tone: 'blue' | 'emerald' | 'amber' | 'violet'
}) {
  const toneMap: Record<string, string> = {
    blue: 'from-blue-500/10 to-blue-500/5 text-blue-700',
    emerald: 'from-emerald-500/10 to-emerald-500/5 text-emerald-700',
    amber: 'from-amber-500/10 to-amber-500/5 text-amber-700',
    violet: 'from-violet-500/10 to-violet-500/5 text-violet-700',
  }
  return (
    <Link
      href={href}
      className={`group rounded-2xl border border-gray-200 bg-gradient-to-br ${toneMap[tone]} p-5 hover:shadow-md transition-all hover:-translate-y-0.5`}
    >
      <div className="flex items-center justify-between">
        {icon}
        <ArrowRight className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
      <p className="mt-6 font-semibold text-gray-900">{label}</p>
    </Link>
  )
}
