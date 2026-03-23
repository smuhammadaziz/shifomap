'use client'

import { useLanguage } from '@/contexts/language-context'
import { useAuthStore } from '@/store/auth-store'
import Cookies from 'js-cookie'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { getApiUrl } from '@/lib/api'
import { Button } from '@/components/ui/button'

export default function AppointmentsPage() {
  const { t } = useLanguage()
  const user = useAuthStore((s) => s.user)
  const token = useMemo(() => Cookies.get('clinic_auth_token') || null, [])
  const [loading, setLoading] = useState(true)
  const [list, setList] = useState<any[]>([])

  const apiUrl = getApiUrl()
  const bk = (t as any).bookings ?? {} as Record<string, string>

  const load = useCallback(async () => {
    if (!token) return
    setLoading(true)
    try {
      const res = await fetch(`${apiUrl}/v1/bookings-manage/clinic`, {
        headers: { Authorization: `Bearer ${token}` },
      })
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
  if (!canSee) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{t.dashboard.appointmentsTitle}</h1>
          <p className="text-gray-600 mt-2">{bk.forbidden ?? 'Ruxsat yo\'q'}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">{t.dashboard.appointmentsTitle}</h1>
        <p className="text-gray-600 mt-2">{t.dashboard.appointmentsSubtitle}</p>
      </div>

      {loading ? (
        <div className="py-16 text-center text-gray-500">{bk.loading ?? 'Yuklanmoqda…'}</div>
      ) : list.length === 0 ? (
        <div className="py-16 text-center text-gray-500">{bk.noBookings ?? 'Bronlar yo\'q'}</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
          {list.map((b) => (
            <div key={b._id} className="rounded-2xl border border-gray-200 bg-white p-5 flex flex-col justify-between hover:shadow-md transition-shadow">
              <div className="mb-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="font-semibold text-gray-900 truncate text-base">{b.doctorName || '—'}</div>
                  {statusBadge(b.status)}
                </div>
                <div className="text-sm text-gray-600 mt-1 truncate">{b.serviceTitle || '—'}</div>
                <div className="flex items-center gap-2 mt-3 text-sm text-gray-500">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  {b.scheduledDate} {b.scheduledTime}
                </div>
              </div>
              <div className="flex gap-2 flex-wrap border-t border-gray-100 pt-3">
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
