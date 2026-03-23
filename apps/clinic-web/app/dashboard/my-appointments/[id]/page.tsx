'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Cookies from 'js-cookie'
import Link from 'next/link'
import { getApiUrl } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuthStore } from '@/store/auth-store'
import { useLanguage } from '@/contexts/language-context'

export default function DoctorBookingDetailPage() {
  const { t } = useLanguage()
  const params = useParams<{ id: string }>()
  const id = params.id
  const router = useRouter()
  const user = useAuthStore((s) => s.user)
  const token = useMemo(() => Cookies.get('clinic_auth_token') || null, [])
  const apiUrl = getApiUrl()

  const [loading, setLoading] = useState(true)
  const [booking, setBooking] = useState<any | null>(null)
  const [rx, setRx] = useState<any | null>(null)
  const [error, setError] = useState(false)

  const bk = (t as any).bookings ?? {} as Record<string, string>

  const load = useCallback(async () => {
    if (!token) return
    setLoading(true)
    setError(false)
    try {
      const res = await fetch(`${apiUrl}/v1/bookings-manage/${id}`, { headers: { Authorization: `Bearer ${token}` } })
      const json = await res.json()
      if (res.ok && json?.success) {
        setBooking(json.data)
      } else {
        setBooking(null)
        setError(true)
      }

      const rxRes = await fetch(`${apiUrl}/v1/prescriptions/booking/${id}`, { headers: { Authorization: `Bearer ${token}` } })
      const rxJson = await rxRes.json()
      setRx(rxRes.ok && rxJson?.success ? rxJson.data : null)
    } catch {
      setBooking(null)
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [apiUrl, id, token])

  const action = useCallback(
    async (path: string) => {
      if (!token) return
      await fetch(`${apiUrl}/v1/bookings-manage/${id}/${path}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: path === 'cancel' ? JSON.stringify({ reason: null }) : undefined,
      })
      await load()
    },
    [apiUrl, id, token, load]
  )

  useEffect(() => {
    const isDoctor = (user as { role?: string })?.role === 'doctor'
    if (!isDoctor) return
    load()
  }, [load, user])

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

  if (loading) return <div className="py-16 text-center text-gray-500">{bk.loading ?? 'Yuklanmoqda…'}</div>
  if (error || !booking) return <div className="py-16 text-center text-gray-500">{bk.notFound ?? 'Topilmadi'}</div>

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{bk.bookingDetails ?? 'Bron tafsilotlari'}</h1>
          <div className="mt-2 flex items-center gap-2 flex-wrap">
            <div className="text-gray-700 font-medium">{booking.serviceTitle || '—'}</div>
            {statusBadge(booking.status)}
          </div>
          <div className="text-gray-600 mt-1">{booking.scheduledDate} {booking.scheduledTime}</div>
        </div>
        <div className="flex gap-2 flex-wrap justify-end">
          <Button variant="outline" onClick={() => router.back()}>{bk.back ?? 'Orqaga'}</Button>
          <Button asChild variant="outline">
            <Link href={`/dashboard/my-appointments/prescription/${booking._id}`}>{bk.prescription ?? 'Retsept'}</Link>
          </Button>
          {booking.status === 'pending' && <Button onClick={() => action('confirm')}>{bk.confirm ?? 'Tasdiqlash'}</Button>}
          {(booking.status === 'confirmed' || booking.status === 'patient_arrived') && <Button onClick={() => action('start')}>{bk.start ?? 'Boshlash'}</Button>}
          {booking.status === 'in_progress' && <Button onClick={() => action('finish')}>{bk.finish ?? 'Tugatish'}</Button>}
          {booking.status !== 'cancelled' && booking.status !== 'completed' && <Button variant="destructive" onClick={() => action('cancel')}>{bk.cancel ?? 'Bekor qilish'}</Button>}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{bk.details ?? 'Batafsil'}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-gray-700">
          <div><span className="text-gray-500">{bk.clinic ?? 'Klinika'}:</span> {booking.clinicDisplayName || '—'}</div>
          <div><span className="text-gray-500">{bk.doctor ?? 'Shifokor'}:</span> {booking.doctorName || '—'}</div>
          <div><span className="text-gray-500">{bk.status ?? 'Holat'}:</span> {statusLabel(booking.status)}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{bk.prescription ?? 'Retsept'}</CardTitle>
        </CardHeader>
        <CardContent>
          {!rx ? (
            <div className="text-gray-500">{bk.noPrescription ?? 'Retsept yo\'q'}</div>
          ) : (
            <div className="space-y-3">
              {rx.medicines?.map((m: any) => (
                <div key={m.key} className="rounded-xl border border-gray-200 p-3">
                  <div className="font-semibold text-gray-900">{m.name} — {m.dosage}</div>
                  <div className="text-sm text-gray-600 mt-1">{m.durationDays} {bk.durationDays ?? 'kun'} · {m.timesPerDay}×/{bk.timesPerDay ?? 'kun'}</div>
                  {m.notes ? <div className="text-sm text-gray-600 mt-1">{m.notes}</div> : null}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
