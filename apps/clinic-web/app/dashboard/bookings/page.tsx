'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Cookies from 'js-cookie'
import Link from 'next/link'
import { getApiUrl } from '@/lib/api'
import { useAuthStore } from '@/store/auth-store'
import { useLanguage } from '@/contexts/language-context'
import { Button } from '@/components/ui/button'

type BookingItem = {
  _id: string
  scheduledAt?: string
  scheduledDate: string
  scheduledTime: string
  status: string
  doctorName?: string
  serviceTitle?: string
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

export default function OwnerBookingsPage() {
  const { t } = useLanguage()
  const user = useAuthStore((s) => s.user)
  const token = useMemo(() => Cookies.get('clinic_auth_token') || null, [])
  const apiUrl = getApiUrl()

  const [loading, setLoading] = useState(true)
  const [list, setList] = useState<BookingItem[]>([])
  const [tab, setTab] = useState<'today' | 'upcoming' | 'past' | 'cancelled' | 'all'>('today')

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
      await fetch(`${apiUrl}/v1/bookings-manage/${id}/${path}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: path === 'cancel' ? JSON.stringify({ reason: null }) : undefined,
      })
      await load()
    },
    [apiUrl, token, load]
  )

  useEffect(() => {
    load()
  }, [load])

  const normalized = useMemo(() => {
    return (list ?? [])
      .map((b) => {
        const dt = b.scheduledAt ? new Date(b.scheduledAt) : new Date(`${b.scheduledDate}T${b.scheduledTime}:00`)
        return { ...b, _dt: dt }
      })
      .sort((a, b) => b._dt.getTime() - a._dt.getTime())
  }, [list])

  const filtered = useMemo(() => {
    const now = new Date()
    if (tab === 'all') return normalized
    if (tab === 'cancelled') return normalized.filter((b) => b.status === 'cancelled')
    if (tab === 'past') return normalized.filter((b) => b._dt.getTime() < now.getTime() && b.status !== 'cancelled')
    if (tab === 'today') return normalized.filter((b) => isSameDay(b._dt, now) && b.status !== 'cancelled')
    return normalized.filter((b) => b._dt.getTime() >= now.getTime() && b.status !== 'cancelled')
  }, [normalized, tab])

  const bk = (t as any).bookings ?? {} as Record<string, string>

  const statusLabel = (status: string) => {
    if (status === 'pending') return bk.statusPending ?? 'Kutilmoqda'
    if (status === 'confirmed') return bk.statusConfirmed ?? 'Tasdiqlangan'
    if (status === 'patient_arrived') return bk.statusArrived ?? 'Keldi'
    if (status === 'in_progress') return bk.statusInProgress ?? 'Jarayonda'
    if (status === 'completed') return bk.statusCompleted ?? 'Yakunlangan'
    if (status === 'cancelled') return bk.statusCancelled ?? 'Bekor qilingan'
    return status
  }

  const statusBadge = (status: string) => {
    const base = 'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold'
    const label = statusLabel(status)
    if (status === 'pending') return <span className={`${base} bg-amber-50 text-amber-700`}>{label}</span>
    if (status === 'confirmed') return <span className={`${base} bg-blue-50 text-blue-700`}>{label}</span>
    if (status === 'patient_arrived') return <span className={`${base} bg-indigo-50 text-indigo-700`}>{label}</span>
    if (status === 'in_progress') return <span className={`${base} bg-purple-50 text-purple-700`}>{label}</span>
    if (status === 'completed') return <span className={`${base} bg-emerald-50 text-emerald-700`}>{label}</span>
    if (status === 'cancelled') return <span className={`${base} bg-rose-50 text-rose-700`}>{label}</span>
    return <span className={`${base} bg-gray-50 text-gray-700`}>{label}</span>
  }

  const canSee = (user as { role?: string })?.role && String((user as any).role).startsWith('clinic_')
  if (!canSee) return <div className="py-16 text-center text-gray-500">{bk.forbidden ?? 'Ruxsat yo\'q'}</div>

  const tabs = [
    { key: 'today' as const, label: bk.today ?? 'Bugun' },
    { key: 'upcoming' as const, label: bk.upcoming ?? 'Kutilmoqda' },
    { key: 'past' as const, label: bk.past ?? 'O\'tganlar' },
    { key: 'cancelled' as const, label: bk.cancelled ?? 'Bekor qilingan' },
    { key: 'all' as const, label: bk.all ?? 'Barchasi' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">{t.sidebar.bookings}</h1>
        <p className="text-gray-600 mt-1">{bk.allBookings ?? 'Barcha bronlar'}</p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        {tabs.map((x) => (
          <button
            key={x.key}
            type="button"
            onClick={() => setTab(x.key)}
            className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
              tab === x.key ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
            }`}
          >
            {x.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="py-16 text-center text-gray-500">{bk.loading ?? 'Yuklanmoqda…'}</div>
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center text-gray-500">{bk.noBookings ?? 'Bronlar yo\'q'}</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
          {filtered.map((b: any) => (
            <div key={b._id} className="rounded-2xl border border-gray-200 bg-white p-5 flex flex-col justify-between hover:shadow-md transition-shadow">
              <div className="mb-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="font-semibold text-gray-900 truncate text-base">{b.doctorName || '—'}</div>
                  {statusBadge(b.status)}
                </div>
                <div className="text-sm text-gray-600 mt-1 truncate">{b.serviceTitle || '—'}</div>
                <div className="flex items-center gap-2 mt-3 text-sm text-gray-500">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  {b.scheduledDate}
                </div>
                <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  {b.scheduledTime}
                </div>
              </div>
              <div className="flex gap-2 flex-wrap border-t border-gray-100 pt-3">
                <Button asChild variant="outline" className="flex-1 min-w-0">
                  <Link href={`/dashboard/bookings/${b._id}`}>{bk.details ?? 'Batafsil'}</Link>
                </Button>
                {b.status === 'pending' && <Button className="flex-1 min-w-0" onClick={() => action(b._id, 'confirm')}>{bk.confirm ?? 'Tasdiqlash'}</Button>}
                {b.status === 'confirmed' && <Button variant="secondary" className="flex-1 min-w-0" onClick={() => action(b._id, 'patient-arrived')}>{bk.arrived ?? 'Keldi'}</Button>}
                {b.status !== 'cancelled' && b.status !== 'completed' && <Button variant="destructive" className="flex-1 min-w-0" onClick={() => action(b._id, 'cancel')}>{bk.cancel ?? 'Bekor qilish'}</Button>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
