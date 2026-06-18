'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Cookies from 'js-cookie'
import Link from 'next/link'
import { getApiUrl } from '@/lib/api'
import { useAuthStore } from '@/store/auth-store'
import { useLanguage } from '@/contexts/language-context'
import { useToast } from '@/contexts/toast-context'
import { Button } from '@/components/ui/button'

type BookingItem = {
  _id: string
  scheduledAt?: string
  scheduledDate: string
  scheduledTime: string
  status: string
  doctorName?: string
  serviceTitle?: string
  branchName?: string
  price?: number | null
  consultationPrice?: number | null
  durationMin?: number | null
}

type NormalizedBooking = BookingItem & { _dt: Date }

type TabKey = 'today' | 'upcoming' | 'past' | 'cancelled' | 'all'

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function formatPrice(value?: number | null): string | null {
  if (value == null || Number.isNaN(value) || value <= 0) return null
  return new Intl.NumberFormat('ru-RU').format(value)
}

function initials(name?: string): string {
  if (!name) return '—'
  const parts = name.trim().split(/\s+/).slice(0, 2)
  return parts.map((p) => p[0]?.toUpperCase() ?? '').join('') || '—'
}

const STATUS_STYLES: Record<string, { badge: string; accent: string; dot: string }> = {
  pending: { badge: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200', accent: 'bg-amber-400', dot: 'bg-amber-500' },
  confirmed: { badge: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200', accent: 'bg-blue-500', dot: 'bg-blue-500' },
  patient_arrived: { badge: 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200', accent: 'bg-indigo-500', dot: 'bg-indigo-500' },
  in_progress: { badge: 'bg-purple-50 text-purple-700 ring-1 ring-purple-200', accent: 'bg-purple-500', dot: 'bg-purple-500' },
  completed: { badge: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200', accent: 'bg-emerald-500', dot: 'bg-emerald-500' },
  cancelled: { badge: 'bg-rose-50 text-rose-700 ring-1 ring-rose-200', accent: 'bg-rose-400', dot: 'bg-rose-500' },
}

function statusStyle(status: string) {
  return STATUS_STYLES[status] ?? { badge: 'bg-gray-100 text-gray-700 ring-1 ring-gray-200', accent: 'bg-gray-400', dot: 'bg-gray-500' }
}

export default function OwnerBookingsPage() {
  const { t } = useLanguage()
  const { toast } = useToast()
  const user = useAuthStore((s) => s.user)
  const token = useMemo(() => Cookies.get('clinic_auth_token') || null, [])
  const apiUrl = getApiUrl()

  const [loading, setLoading] = useState(true)
  const [list, setList] = useState<BookingItem[]>([])
  const [tab, setTab] = useState<TabKey>('today')
  const [search, setSearch] = useState('')
  const [doctorFilter, setDoctorFilter] = useState<string>('all')
  const [busyId, setBusyId] = useState<string | null>(null)

  const bk = ((t as any).bookings ?? {}) as Record<string, string>

  const load = useCallback(async () => {
    if (!token) return
    setLoading(true)
    try {
      const res = await fetch(`${apiUrl}/v1/bookings-manage/clinic`, { headers: { Authorization: `Bearer ${token}` } })
      const json = await res.json()
      setList(res.ok && json?.success ? (json.data ?? []) : [])
    } catch {
      setList([])
    } finally {
      setLoading(false)
    }
  }, [apiUrl, token])

  const action = useCallback(
    async (id: string, path: string) => {
      if (!token) return
      setBusyId(id)
      try {
        const res = await fetch(`${apiUrl}/v1/bookings-manage/${id}/${path}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: path === 'cancel' ? JSON.stringify({ reason: null }) : undefined,
        })
        const json = await res.json().catch(() => null)
        if (!res.ok || !json?.success) {
          toast(json?.error ?? (bk.actionFailed ?? 'Amalni bajarib bo\'lmadi'), 'error')
          return
        }
        toast(bk.actionSuccess ?? 'Bajarildi', 'success')
        await load()
      } catch {
        toast(bk.actionFailed ?? 'Amalni bajarib bo\'lmadi', 'error')
      } finally {
        setBusyId(null)
      }
    },
    [apiUrl, token, load, toast, bk]
  )

  useEffect(() => {
    load()
  }, [load])

  const normalized = useMemo<NormalizedBooking[]>(() => {
    return (list ?? [])
      .map((b) => {
        const dt = b.scheduledAt ? new Date(b.scheduledAt) : new Date(`${b.scheduledDate}T${b.scheduledTime}:00`)
        return { ...b, _dt: dt }
      })
      .sort((a, b) => b._dt.getTime() - a._dt.getTime())
  }, [list])

  const doctorNames = useMemo(() => {
    const set = new Set<string>()
    normalized.forEach((b) => b.doctorName && set.add(b.doctorName))
    return Array.from(set).sort()
  }, [normalized])

  const stats = useMemo(() => {
    const now = new Date()
    return {
      total: normalized.length,
      today: normalized.filter((b) => isSameDay(b._dt, now) && b.status !== 'cancelled').length,
      pending: normalized.filter((b) => b.status === 'pending').length,
      confirmed: normalized.filter((b) => b.status === 'confirmed').length,
      completed: normalized.filter((b) => b.status === 'completed').length,
    }
  }, [normalized])

  const filtered = useMemo(() => {
    const now = new Date()
    const q = search.trim().toLowerCase()
    return normalized.filter((b) => {
      if (doctorFilter !== 'all' && b.doctorName !== doctorFilter) return false
      if (q) {
        const haystack = `${b.doctorName ?? ''} ${b.serviceTitle ?? ''} ${b.branchName ?? ''}`.toLowerCase()
        if (!haystack.includes(q)) return false
      }
      if (tab === 'all') return true
      if (tab === 'cancelled') return b.status === 'cancelled'
      if (tab === 'past') return b._dt.getTime() < now.getTime() && b.status !== 'cancelled'
      if (tab === 'today') return isSameDay(b._dt, now) && b.status !== 'cancelled'
      return b._dt.getTime() >= now.getTime() && b.status !== 'cancelled'
    })
  }, [normalized, tab, search, doctorFilter])

  const statusLabel = (status: string) => {
    if (status === 'pending') return bk.statusPending ?? 'Kutilmoqda'
    if (status === 'confirmed') return bk.statusConfirmed ?? 'Tasdiqlangan'
    if (status === 'patient_arrived') return bk.statusArrived ?? 'Keldi'
    if (status === 'in_progress') return bk.statusInProgress ?? 'Jarayonda'
    if (status === 'completed') return bk.statusCompleted ?? 'Yakunlangan'
    if (status === 'cancelled') return bk.statusCancelled ?? 'Bekor qilingan'
    return status
  }

  const role = String((user as { role?: string } | null)?.role ?? '')
  const canSee = role === 'owner' || role === 'admin' || role === 'super_admin' || role.startsWith('clinic_')
  if (user && !canSee) {
    return <div className="py-16 text-center text-gray-500">{bk.forbidden ?? 'Ruxsat yo\'q'}</div>
  }

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'today', label: bk.today ?? 'Bugun' },
    { key: 'upcoming', label: bk.upcoming ?? 'Kutilmoqda' },
    { key: 'past', label: bk.past ?? 'O\'tganlar' },
    { key: 'cancelled', label: bk.cancelled ?? 'Bekor qilingan' },
    { key: 'all', label: bk.all ?? 'Barchasi' },
  ]

  const statCards = [
    { key: 'total', label: bk.total ?? 'Jami', value: stats.total, color: 'text-gray-900', ring: 'ring-gray-200', bg: 'bg-white' },
    { key: 'today', label: bk.today ?? 'Bugun', value: stats.today, color: 'text-blue-700', ring: 'ring-blue-200', bg: 'bg-blue-50' },
    { key: 'pending', label: bk.statusPending ?? 'Kutilmoqda', value: stats.pending, color: 'text-amber-700', ring: 'ring-amber-200', bg: 'bg-amber-50' },
    { key: 'confirmed', label: bk.statusConfirmed ?? 'Tasdiqlangan', value: stats.confirmed, color: 'text-indigo-700', ring: 'ring-indigo-200', bg: 'bg-indigo-50' },
    { key: 'completed', label: bk.statusCompleted ?? 'Yakunlangan', value: stats.completed, color: 'text-emerald-700', ring: 'ring-emerald-200', bg: 'bg-emerald-50' },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">{t.sidebar.bookings}</h1>
          <p className="mt-1 text-gray-500">{bk.allBookings ?? 'Barcha shifokorlarning bronlari'}</p>
        </div>
        <Button variant="outline" onClick={() => load()} disabled={loading} className="gap-2">
          <svg className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          {bk.refresh ?? 'Yangilash'}
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {statCards.map((s) => (
          <div key={s.key} className={`rounded-2xl ${s.bg} p-4 ring-1 ${s.ring}`}>
            <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
            <div className="mt-0.5 text-sm font-medium text-gray-500">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2">
          {tabs.map((x) => (
            <button
              key={x.key}
              type="button"
              onClick={() => setTab(x.key)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                tab === x.key ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30' : 'bg-white text-gray-600 ring-1 ring-gray-200 hover:bg-gray-50'
              }`}
            >
              {x.label}
            </button>
          ))}
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative">
            <svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
            </svg>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={bk.searchPlaceholder ?? 'Shifokor yoki xizmat...'}
              className="h-10 w-full rounded-full border border-gray-200 bg-white pl-9 pr-4 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 sm:w-64"
            />
          </div>
          <select
            value={doctorFilter}
            onChange={(e) => setDoctorFilter(e.target.value)}
            className="h-10 rounded-full border border-gray-200 bg-white px-4 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
          >
            <option value="all">{bk.allDoctors ?? 'Barcha shifokorlar'}</option>
            {doctorNames.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-44 animate-pulse rounded-2xl bg-gray-100" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-gray-50/60 py-20 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
            <svg className="h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <p className="font-medium text-gray-700">{bk.noBookings ?? 'Bronlar yo\'q'}</p>
          <p className="mt-1 text-sm text-gray-400">{bk.noBookingsHint ?? 'Tanlangan filtrlar bo\'yicha bron topilmadi'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {filtered.map((b) => {
            const st = statusStyle(b.status)
            const price = formatPrice(b.price ?? b.consultationPrice)
            const isBusy = busyId === b._id
            return (
              <div
                key={b._id}
                className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-gray-200/60"
              >
                <span className={`absolute inset-x-0 top-0 h-1 ${st.accent}`} />
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-sm font-bold text-white">
                        {initials(b.doctorName)}
                      </div>
                      <div className="min-w-0">
                        <div className="truncate font-semibold text-gray-900">{b.doctorName || '—'}</div>
                        <div className="truncate text-sm text-gray-500">{b.serviceTitle || '—'}</div>
                      </div>
                    </div>
                    <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${st.badge}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${st.dot}`} />
                      {statusLabel(b.status)}
                    </span>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2 text-sm">
                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-gray-50 px-2.5 py-1.5 text-gray-600">
                      <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                      {b.scheduledDate}
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-gray-50 px-2.5 py-1.5 text-gray-600">
                      <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      {b.scheduledTime}
                    </span>
                    {b.branchName && (
                      <span className="inline-flex items-center gap-1.5 rounded-lg bg-gray-50 px-2.5 py-1.5 text-gray-600">
                        <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a2 2 0 01-2.828 0l-4.243-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                        {b.branchName}
                      </span>
                    )}
                    {price && (
                      <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2.5 py-1.5 font-medium text-emerald-700">
                        {price} {bk.currency ?? 'so\'m'}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 border-t border-gray-100 p-4">
                  <Button asChild variant="outline" size="sm" className="flex-1 min-w-0">
                    <Link href={`/dashboard/bookings/${b._id}`}>{bk.details ?? 'Batafsil'}</Link>
                  </Button>
                  {b.status === 'pending' && (
                    <Button size="sm" className="flex-1 min-w-0" disabled={isBusy} onClick={() => action(b._id, 'confirm')}>
                      {bk.confirm ?? 'Tasdiqlash'}
                    </Button>
                  )}
                  {b.status === 'confirmed' && (
                    <Button size="sm" variant="secondary" className="flex-1 min-w-0" disabled={isBusy} onClick={() => action(b._id, 'patient-arrived')}>
                      {bk.arrived ?? 'Keldi'}
                    </Button>
                  )}
                  {b.status !== 'cancelled' && b.status !== 'completed' && (
                    <Button size="sm" variant="destructive" className="flex-1 min-w-0" disabled={isBusy} onClick={() => action(b._id, 'cancel')}>
                      {bk.cancel ?? 'Bekor qilish'}
                    </Button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
