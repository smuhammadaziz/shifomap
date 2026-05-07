'use client'

import { useLanguage } from '@/contexts/language-context'
import { useAuthStore } from '@/store/auth-store'
import Link from 'next/link'
import {
  Calendar,
  Briefcase,
  Users,
  MessageSquare,
  ArrowRight,
  Stethoscope,
  CalendarClock,
  Clock,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  XCircle,
  PlayCircle,
  UserCheck,
  Wallet,
  Star,
  Phone,
  Building2,
  Activity,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import Cookies from 'js-cookie'
import { getApiUrl } from '@/lib/api'

type Lang = 'uz' | 'ru' | 'en'
type Status = 'pending' | 'confirmed' | 'patient_arrived' | 'in_progress' | 'completed' | 'cancelled'

interface RecentBooking {
  _id: string
  scheduledAt: string
  scheduledDate: string
  scheduledTime: string
  status: Status
  serviceTitle: string
  doctorName: string | null
  patientName: string | null
  patientPhone: string | null
  consultationPrice: { amount?: number; minAmount?: number; maxAmount?: number; currency: string } | null
  createdAt: string | null
}

interface DashboardStats {
  todayCount: number
  upcomingCount: number
  pendingCount: number
  completedCount: number
  cancelledCount: number
  totalBookings: number
  monthRevenue: number
  prevMonthRevenue: number
  revenueCurrency: string
  revenueGrowthPct: number
  weeklySeries: Array<{ date: string; count: number }>
  statusBreakdown: Array<{ status: Status; count: number }>
  topServices: Array<{ serviceId: string; title: string; count: number }>
  topDoctors: Array<{ doctorId: string; name: string; count: number }>
  recentBookings: RecentBooking[]
  rating: { avg: number; count: number }
  servicesCount: number
  doctorsCount: number
  branchesCount: number
}

export default function DashboardPage() {
  const { t, language } = useLanguage()
  const lang = language as Lang
  const user = useAuthStore((s) => s.user)
  const isDoctor = (user as { role?: string })?.role === 'doctor'

  const token = useMemo(() => Cookies.get('clinic_auth_token') || null, [])
  const apiUrl = getApiUrl()

  // Doctor view (kept as-is, just refactored to use shared loader)
  const [doctorStats, setDoctorStats] = useState<{ today: number; upcoming: number; total: number; pending: number }>({
    today: 0,
    upcoming: 0,
    total: 0,
    pending: 0,
  })

  // Clinic owner dashboard
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loadingStats, setLoadingStats] = useState(true)

  useEffect(() => {
    if (!token) return
    if (isDoctor) {
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
          setDoctorStats({ today, upcoming, total: list.length, pending })
        } catch {
          /* noop */
        }
      }
      load()
      return
    }
    const loadOwner = async () => {
      setLoadingStats(true)
      try {
        const res = await fetch(`${apiUrl}/v1/bookings-manage/clinic/dashboard-stats`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        const json = await res.json()
        if (res.ok && json?.success) setStats(json.data)
      } catch {
        /* noop */
      } finally {
        setLoadingStats(false)
      }
    }
    loadOwner()
  }, [isDoctor, apiUrl, token])

  if (isDoctor) {
    const displayName =
      (user as { displayName?: string; fullName?: string })?.displayName ??
      (user as { fullName?: string })?.fullName ??
      user?.userName ??
      ''
    const greeting = lang === 'uz' ? 'Salom' : lang === 'ru' ? 'Здравствуйте' : 'Hello'
    return (
      <div className="space-y-8">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-600 p-8 text-white shadow-lg">
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-sm text-xs font-semibold">
              <Stethoscope className="h-3.5 w-3.5" />
              {lang === 'uz' ? 'SHIFOKOR PANELI' : lang === 'ru' ? 'КАБИНЕТ ВРАЧА' : 'DOCTOR DASHBOARD'}
            </div>
            <h1 className="mt-3 text-3xl md:text-4xl font-bold">
              {greeting}, {displayName}
            </h1>
            <p className="mt-2 text-white/90 max-w-lg">
              {lang === 'uz'
                ? 'Bugungi jadvalingiz va bemorlaringiz. Har bir bemorga g‘amxo‘rlik bilan yondashing.'
                : lang === 'ru'
                  ? 'Ваше расписание на сегодня и пациенты. Уделите каждому пациенту внимание.'
                  : 'Your schedule and patients for today. Care for each patient with attention.'}
            </p>
          </div>
          <div className="absolute -right-10 -top-10 w-56 h-56 rounded-full bg-white/10 blur-2xl" />
          <div className="absolute -right-20 -bottom-20 w-64 h-64 rounded-full bg-pink-400/20 blur-3xl" />
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatTile
            label={lang === 'uz' ? 'Bugun' : lang === 'ru' ? 'Сегодня' : 'Today'}
            value={doctorStats.today}
            tone="blue"
            icon={<Calendar className="h-5 w-5" />}
          />
          <StatTile
            label={lang === 'uz' ? 'Keyingi' : lang === 'ru' ? 'Предстоящие' : 'Upcoming'}
            value={doctorStats.upcoming}
            tone="emerald"
            icon={<Calendar className="h-5 w-5" />}
          />
          <StatTile
            label={lang === 'uz' ? 'Kutilmoqda' : lang === 'ru' ? 'В ожидании' : 'Pending'}
            value={doctorStats.pending}
            tone="amber"
            icon={<Calendar className="h-5 w-5" />}
          />
          <StatTile
            label={lang === 'uz' ? 'Jami' : lang === 'ru' ? 'Всего' : 'Total'}
            value={doctorStats.total}
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
            label={lang === 'uz' ? 'Xabarlar' : 'Сообщения'}
            tone="violet"
          />
        </div>
      </div>
    )
  }

  // ============ CLINIC OWNER DASHBOARD ============

  if (loadingStats && !stats) {
    return (
      <div className="space-y-8">
        <SkeletonHeader />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="h-11 w-11 rounded-xl bg-gray-200 animate-pulse" />
              <div className="h-7 w-24 mt-4 bg-gray-200 rounded animate-pulse" />
              <div className="h-4 w-20 mt-2 bg-gray-100 rounded animate-pulse" />
            </div>
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2 h-72 rounded-2xl border border-gray-200 bg-white shadow-sm animate-pulse" />
          <div className="h-72 rounded-2xl border border-gray-200 bg-white shadow-sm animate-pulse" />
        </div>
      </div>
    )
  }

  const ownerName =
    (user as { displayName?: string; fullName?: string })?.displayName ??
    (user as { fullName?: string })?.fullName ??
    user?.userName ??
    ''

  return (
    <div className="space-y-8">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-600 p-7 md:p-8 text-white shadow-lg">
        <div className="relative z-10 flex flex-col md:flex-row md:items-end md:justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-sm text-xs font-semibold">
              <Building2 className="h-3.5 w-3.5" />
              {lang === 'uz' ? 'KLINIKA PANELI' : lang === 'ru' ? 'ПАНЕЛЬ КЛИНИКИ' : 'CLINIC DASHBOARD'}
            </div>
            <h1 className="mt-3 text-2xl md:text-4xl font-bold">{t.dashboard.title}</h1>
            <p className="mt-2 text-white/85 text-sm md:text-base max-w-xl">{t.dashboard.welcome}{ownerName ? `, ${ownerName}` : ''}</p>
          </div>
          {stats ? (
            <div className="flex flex-wrap gap-3">
              <HeaderChip icon={<Star className="h-4 w-4 fill-yellow-300 text-yellow-300" />} label={`${(stats.rating?.avg ?? 0).toFixed(1)} (${stats.rating?.count ?? 0})`} />
              <HeaderChip icon={<Briefcase className="h-4 w-4" />} label={`${stats.servicesCount} ${lang === 'uz' ? 'xizmat' : lang === 'ru' ? 'услуг' : 'services'}`} />
              <HeaderChip icon={<Stethoscope className="h-4 w-4" />} label={`${stats.doctorsCount} ${lang === 'uz' ? 'shifokor' : lang === 'ru' ? 'врачей' : 'doctors'}`} />
              <HeaderChip icon={<Building2 className="h-4 w-4" />} label={`${stats.branchesCount} ${lang === 'uz' ? 'filial' : lang === 'ru' ? 'филиалов' : 'branches'}`} />
            </div>
          ) : null}
        </div>
        <div className="absolute -right-10 -top-10 w-56 h-56 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -right-20 -bottom-20 w-64 h-64 rounded-full bg-pink-400/20 blur-3xl" />
      </div>

      {/* Top stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label={lang === 'uz' ? 'Bugun' : lang === 'ru' ? 'Сегодня' : 'Today'}
          value={stats?.todayCount ?? 0}
          tone="blue"
          icon={<CalendarClock className="h-5 w-5" />}
          sub={lang === 'uz' ? 'tashriflar' : lang === 'ru' ? 'приёмов' : 'appointments'}
        />
        <StatTile
          label={lang === 'uz' ? 'Keyingi' : lang === 'ru' ? 'Предстоящие' : 'Upcoming'}
          value={stats?.upcomingCount ?? 0}
          tone="emerald"
          icon={<Calendar className="h-5 w-5" />}
          sub={lang === 'uz' ? 'rejalashtirilgan' : lang === 'ru' ? 'запланировано' : 'scheduled'}
        />
        <StatTile
          label={lang === 'uz' ? 'Kutilmoqda' : lang === 'ru' ? 'В ожидании' : 'Pending'}
          value={stats?.pendingCount ?? 0}
          tone="amber"
          icon={<Clock className="h-5 w-5" />}
          sub={lang === 'uz' ? 'tasdiqlash kerak' : lang === 'ru' ? 'требует подтверждения' : 'awaits confirmation'}
        />
        <RevenueTile
          lang={lang}
          amount={stats?.monthRevenue ?? 0}
          currency={stats?.revenueCurrency ?? 'UZS'}
          growthPct={stats?.revenueGrowthPct ?? 0}
        />
      </div>

      {/* Chart + status breakdown */}
      <div className="grid gap-4 lg:grid-cols-3">
        <WeeklyChart series={stats?.weeklySeries ?? []} lang={lang} />
        <StatusBreakdownCard breakdown={stats?.statusBreakdown ?? []} lang={lang} />
      </div>

      {/* Top services / Top doctors */}
      <div className="grid gap-4 lg:grid-cols-2">
        <TopList
          title={lang === 'uz' ? 'Eng ko‘p bron qilingan xizmatlar' : lang === 'ru' ? 'Самые востребованные услуги' : 'Top booked services'}
          items={(stats?.topServices ?? []).map((s) => ({ id: s.serviceId, label: s.title, count: s.count }))}
          icon={<Briefcase className="h-4 w-4" />}
          tone="emerald"
          empty={lang === 'uz' ? 'Hozircha bronlar yo‘q' : lang === 'ru' ? 'Пока нет броней' : 'No bookings yet'}
        />
        <TopList
          title={lang === 'uz' ? 'Eng faol shifokorlar' : lang === 'ru' ? 'Самые активные врачи' : 'Top doctors'}
          items={(stats?.topDoctors ?? []).map((d) => ({ id: d.doctorId, label: d.name, count: d.count }))}
          icon={<Stethoscope className="h-4 w-4" />}
          tone="violet"
          empty={lang === 'uz' ? 'Hozircha bronlar yo‘q' : lang === 'ru' ? 'Пока нет броней' : 'No bookings yet'}
        />
      </div>

      {/* Recent bookings */}
      <RecentBookingsCard items={stats?.recentBookings ?? []} lang={lang} />
    </div>
  )
}

function SkeletonHeader() {
  return <div className="h-40 rounded-3xl bg-gray-100 animate-pulse" />
}

function HeaderChip({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/15 backdrop-blur-sm text-xs font-semibold">
      {icon}
      <span>{label}</span>
    </div>
  )
}

function StatTile({
  label,
  value,
  tone,
  icon,
  sub,
}: {
  label: string
  value: number
  tone: 'blue' | 'emerald' | 'amber' | 'violet'
  icon: React.ReactNode
  sub?: string
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
        <p className="text-3xl font-bold text-gray-900 tabular-nums">{value.toLocaleString()}</p>
      </div>
      <p className="text-sm text-gray-700 mt-3 font-medium">{label}</p>
      {sub ? <p className="text-xs text-gray-400 mt-0.5">{sub}</p> : null}
    </div>
  )
}

function RevenueTile({
  lang,
  amount,
  currency,
  growthPct,
}: {
  lang: Lang
  amount: number
  currency: string
  growthPct: number
}) {
  const positive = growthPct >= 0
  return (
    <div className="rounded-2xl border border-gray-200 bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div className="w-11 h-11 rounded-xl flex items-center justify-center bg-blue-100 text-blue-700">
          <Wallet className="h-5 w-5" />
        </div>
        <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${positive ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
          {positive ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
          {positive ? '+' : ''}
          {growthPct}%
        </div>
      </div>
      <p className="text-2xl md:text-3xl font-bold text-gray-900 mt-3 tabular-nums">
        {amount.toLocaleString()} <span className="text-base font-semibold text-gray-500">{currency}</span>
      </p>
      <p className="text-xs text-gray-500 mt-1">
        {lang === 'uz' ? 'Joriy oy daromadi' : lang === 'ru' ? 'Доход в текущем месяце' : 'Revenue this month'}
      </p>
    </div>
  )
}

function WeeklyChart({ series, lang }: { series: Array<{ date: string; count: number }>; lang: Lang }) {
  const max = Math.max(1, ...series.map((s) => s.count))
  const total = series.reduce((acc, s) => acc + s.count, 0)
  const dayLabel = (iso: string) => {
    const d = new Date(iso + 'T00:00:00')
    const names = lang === 'uz'
      ? ['Yak', 'Du', 'Se', 'Cho', 'Pa', 'Ju', 'Sha']
      : lang === 'ru'
        ? ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб']
        : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    return names[d.getDay()]
  }
  return (
    <div className="lg:col-span-2 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="font-semibold text-gray-900">
            {lang === 'uz' ? 'Bronlar — so‘nggi 7 kun' : lang === 'ru' ? 'Брони — последние 7 дней' : 'Bookings — last 7 days'}
          </h3>
          <p className="text-xs text-gray-500 mt-1">
            {lang === 'uz' ? `Jami: ${total}` : lang === 'ru' ? `Всего: ${total}` : `Total: ${total}`}
          </p>
        </div>
        <Activity className="h-4 w-4 text-gray-400" />
      </div>
      <div className="h-44 flex items-end justify-between gap-2 md:gap-3">
        {series.map((s) => {
          const h = Math.round((s.count / max) * 100)
          return (
            <div key={s.date} className="flex-1 flex flex-col items-center gap-2">
              <div className="w-full flex items-end" style={{ height: '140px' }}>
                <div
                  className="w-full rounded-t-md bg-gradient-to-t from-blue-500 to-indigo-400 transition-all"
                  style={{ height: `${h || 4}%`, minHeight: s.count > 0 ? '6px' : '4px', opacity: s.count > 0 ? 1 : 0.25 }}
                  title={`${s.count}`}
                />
              </div>
              <div className="text-[11px] text-gray-500 font-medium">{dayLabel(s.date)}</div>
              <div className="text-xs font-semibold text-gray-700 tabular-nums -mt-1">{s.count}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function StatusBreakdownCard({ breakdown, lang }: { breakdown: Array<{ status: Status; count: number }>; lang: Lang }) {
  const total = breakdown.reduce((acc, s) => acc + s.count, 0)
  const order: Status[] = ['pending', 'confirmed', 'patient_arrived', 'in_progress', 'completed', 'cancelled']
  const sorted = order.map((st) => breakdown.find((b) => b.status === st) ?? { status: st, count: 0 })

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between mb-5">
        <h3 className="font-semibold text-gray-900">
          {lang === 'uz' ? 'Holat bo‘yicha' : lang === 'ru' ? 'По статусу' : 'By status'}
        </h3>
        <span className="text-xs text-gray-500">{total}</span>
      </div>
      <div className="space-y-3">
        {sorted.map((s) => {
          const pct = total > 0 ? Math.round((s.count / total) * 100) : 0
          return (
            <div key={s.status}>
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <StatusDot status={s.status} />
                  <span className="text-gray-700 font-medium">{statusLabel(s.status, lang)}</span>
                </div>
                <span className="text-gray-500 tabular-nums">
                  {s.count} <span className="text-gray-400">({pct}%)</span>
                </span>
              </div>
              <div className="mt-1.5 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                <div className={`h-full ${statusBarColor(s.status)}`} style={{ width: `${pct}%` }} />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function StatusDot({ status }: { status: Status }) {
  return <span className={`w-2 h-2 rounded-full ${statusBarColor(status)}`} />
}

function statusBarColor(status: Status) {
  switch (status) {
    case 'pending':
      return 'bg-amber-400'
    case 'confirmed':
      return 'bg-blue-500'
    case 'patient_arrived':
      return 'bg-indigo-500'
    case 'in_progress':
      return 'bg-violet-500'
    case 'completed':
      return 'bg-emerald-500'
    case 'cancelled':
      return 'bg-rose-400'
  }
}

function statusLabel(s: Status, lang: Lang): string {
  const dict: Record<Status, [string, string, string]> = {
    pending: ['Kutilmoqda', 'В ожидании', 'Pending'],
    confirmed: ['Tasdiqlangan', 'Подтверждено', 'Confirmed'],
    patient_arrived: ['Bemor kelgan', 'Пациент пришёл', 'Patient arrived'],
    in_progress: ['Davomida', 'В процессе', 'In progress'],
    completed: ['Tugatildi', 'Завершено', 'Completed'],
    cancelled: ['Bekor qilingan', 'Отменено', 'Cancelled'],
  }
  const [uz, ru, en] = dict[s]
  return lang === 'uz' ? uz : lang === 'ru' ? ru : en
}

function statusBadge(s: Status) {
  switch (s) {
    case 'pending':
      return 'bg-amber-50 text-amber-700 border-amber-200'
    case 'confirmed':
      return 'bg-blue-50 text-blue-700 border-blue-200'
    case 'patient_arrived':
      return 'bg-indigo-50 text-indigo-700 border-indigo-200'
    case 'in_progress':
      return 'bg-violet-50 text-violet-700 border-violet-200'
    case 'completed':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200'
    case 'cancelled':
      return 'bg-rose-50 text-rose-700 border-rose-200'
  }
}

function statusIcon(s: Status) {
  switch (s) {
    case 'pending':
      return <Clock className="h-3.5 w-3.5" />
    case 'confirmed':
      return <CheckCircle2 className="h-3.5 w-3.5" />
    case 'patient_arrived':
      return <UserCheck className="h-3.5 w-3.5" />
    case 'in_progress':
      return <PlayCircle className="h-3.5 w-3.5" />
    case 'completed':
      return <CheckCircle2 className="h-3.5 w-3.5" />
    case 'cancelled':
      return <XCircle className="h-3.5 w-3.5" />
  }
}

function TopList({
  title,
  items,
  icon,
  tone,
  empty,
}: {
  title: string
  items: Array<{ id: string; label: string; count: number }>
  icon: React.ReactNode
  tone: 'emerald' | 'violet'
  empty: string
}) {
  const max = Math.max(1, ...items.map((i) => i.count))
  const dotColor = tone === 'emerald' ? 'from-emerald-500 to-teal-400' : 'from-violet-500 to-fuchsia-400'
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900 inline-flex items-center gap-2">
          <span className={`w-7 h-7 rounded-lg flex items-center justify-center ${tone === 'emerald' ? 'bg-emerald-50 text-emerald-700' : 'bg-violet-50 text-violet-700'}`}>
            {icon}
          </span>
          {title}
        </h3>
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-gray-400 py-6 text-center">{empty}</p>
      ) : (
        <ul className="space-y-3">
          {items.map((it, idx) => {
            const pct = Math.round((it.count / max) * 100)
            return (
              <li key={it.id || idx} className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-gray-800 truncate pr-3">
                    <span className="text-gray-400 mr-2 tabular-nums">{idx + 1}.</span>
                    {it.label}
                  </span>
                  <span className="text-gray-500 tabular-nums">{it.count}</span>
                </div>
                <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                  <div className={`h-full bg-gradient-to-r ${dotColor}`} style={{ width: `${pct}%` }} />
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

function timeAgo(iso: string | null, lang: Lang): string {
  if (!iso) return ''
  const ms = Date.now() - new Date(iso).getTime()
  if (ms < 0) return ''
  const min = Math.floor(ms / 60000)
  if (min < 1) return lang === 'uz' ? 'hozir' : lang === 'ru' ? 'только что' : 'just now'
  if (min < 60) return `${min} ${lang === 'uz' ? 'daqiqa oldin' : lang === 'ru' ? 'мин назад' : 'min ago'}`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr} ${lang === 'uz' ? 'soat oldin' : lang === 'ru' ? 'ч назад' : 'h ago'}`
  const day = Math.floor(hr / 24)
  return `${day} ${lang === 'uz' ? 'kun oldin' : lang === 'ru' ? 'дн назад' : 'd ago'}`
}

function priceDisplay(p: RecentBooking['consultationPrice']): string {
  if (!p) return '—'
  if (p.amount != null) return `${p.amount.toLocaleString()} ${p.currency}`
  if (p.minAmount != null && p.maxAmount != null) return `${p.minAmount.toLocaleString()} – ${p.maxAmount.toLocaleString()} ${p.currency}`
  return p.currency || '—'
}

function RecentBookingsCard({ items, lang }: { items: RecentBooking[]; lang: Lang }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      <div className="flex items-center justify-between p-5 border-b border-gray-100">
        <div>
          <h3 className="font-semibold text-gray-900">
            {lang === 'uz' ? 'So‘nggi bronlar' : lang === 'ru' ? 'Недавние брони' : 'Recent bookings'}
          </h3>
          <p className="text-xs text-gray-500 mt-1">
            {lang === 'uz' ? 'Eng yangi 8 ta bron' : lang === 'ru' ? 'Последние 8 броней' : 'Latest 8 bookings'}
          </p>
        </div>
        <Link
          href="/dashboard/bookings"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:text-blue-700"
        >
          {lang === 'uz' ? 'Hammasi' : lang === 'ru' ? 'Все' : 'View all'}
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
      {items.length === 0 ? (
        <div className="p-10 text-center text-sm text-gray-400">
          {lang === 'uz' ? 'Hozircha bronlar yo‘q' : lang === 'ru' ? 'Пока нет броней' : 'No bookings yet'}
        </div>
      ) : (
        <ul className="divide-y divide-gray-100">
          {items.map((b) => (
            <li key={b._id} className="p-4 md:p-5 hover:bg-gray-50/60 transition-colors">
              <div className="flex flex-wrap md:flex-nowrap items-start md:items-center gap-3 md:gap-4">
                <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-bold shrink-0">
                  {(b.patientName ?? '—').charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-gray-900 truncate">{b.patientName ?? '—'}</p>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] font-semibold ${statusBadge(b.status)}`}>
                      {statusIcon(b.status)}
                      {statusLabel(b.status, lang)}
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-gray-500 flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="inline-flex items-center gap-1">
                      <Briefcase className="h-3 w-3" />
                      {b.serviceTitle}
                    </span>
                    {b.doctorName ? (
                      <span className="inline-flex items-center gap-1">
                        <Stethoscope className="h-3 w-3" />
                        {b.doctorName}
                      </span>
                    ) : null}
                    {b.patientPhone ? (
                      <span className="inline-flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {b.patientPhone}
                      </span>
                    ) : null}
                  </div>
                </div>
                <div className="text-right shrink-0 ml-auto">
                  <p className="text-sm font-semibold text-gray-900">{priceDisplay(b.consultationPrice)}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {b.scheduledDate} · {b.scheduledTime}
                  </p>
                  <p className="text-[11px] text-gray-400 mt-0.5">{timeAgo(b.createdAt, lang)}</p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
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
