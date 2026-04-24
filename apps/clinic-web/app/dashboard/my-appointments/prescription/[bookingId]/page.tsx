'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Cookies from 'js-cookie'
import { getApiUrl } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useLanguage } from '@/contexts/language-context'
import MedicalHistoryPanel from '@/components/medical-history-panel'

type Med = {
  key: string
  name: string
  dosage: string
  durationDays: number
  timesPerDay: number
  foodRelation: 'before_food' | 'after_food' | 'no_relation'
  foodTiming: string
  notes: string
}

function newMed(): Med {
  return {
    key: String(Date.now()) + Math.random().toString(16).slice(2),
    name: '',
    dosage: '',
    durationDays: 7,
    timesPerDay: 3,
    foodRelation: 'after_food',
    foodTiming: '',
    notes: '',
  }
}

export default function PrescriptionForBookingPage() {
  const { t } = useLanguage()
  const router = useRouter()
  const params = useParams<{ bookingId: string }>()
  const bookingId = params.bookingId
  const token = useMemo(() => Cookies.get('clinic_auth_token') || null, [])
  const apiUrl = getApiUrl()

  const [saving, setSaving] = useState(false)
  const [loadingExisting, setLoadingExisting] = useState(true)
  const [meds, setMeds] = useState<Med[]>([newMed()])
  const [patientId, setPatientId] = useState<string | null>(null)

  useEffect(() => {
    if (!token || !bookingId) return
    fetch(`${apiUrl}/v1/bookings-manage/${bookingId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((j) => {
        if (j?.success && j.data?.patientId) setPatientId(j.data.patientId)
      })
      .catch(() => {})
  }, [apiUrl, bookingId, token])

  const bk = (t as any).bookings ?? {} as Record<string, string>

  // Load existing prescription if one exists
  const loadExisting = useCallback(async () => {
    if (!token || !bookingId) {
      setLoadingExisting(false)
      return
    }
    try {
      const res = await fetch(`${apiUrl}/v1/prescriptions/booking/${bookingId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const json = await res.json()
      if (res.ok && json?.success && json.data?.medicines?.length) {
        setMeds(
          json.data.medicines.map((m: any) => ({
            key: m.key || String(Date.now()) + Math.random().toString(16).slice(2),
            name: m.name || '',
            dosage: m.dosage || '',
            durationDays: m.durationDays || 7,
            timesPerDay: m.timesPerDay || 3,
            foodRelation: m.foodRelation || 'after_food',
            foodTiming: m.foodTiming || '',
            notes: m.notes || '',
          }))
        )
      }
    } catch {
      // no existing prescription, keep blank form
    } finally {
      setLoadingExisting(false)
    }
  }, [apiUrl, bookingId, token])

  useEffect(() => {
    loadExisting()
  }, [loadExisting])

  const save = async () => {
    if (!token) return
    const cleaned = meds
      .map((m) => ({
        key: m.key,
        name: m.name.trim(),
        dosage: m.dosage.trim(),
        durationDays: Number(m.durationDays) || 1,
        timesPerDay: Number(m.timesPerDay) || 1,
        foodRelation: m.foodRelation,
        foodTiming: m.foodTiming.trim() || null,
        notes: m.notes.trim() || null,
      }))
      .filter((m) => m.name && m.dosage)

    if (!cleaned.length) return

    setSaving(true)
    try {
      const res = await fetch(`${apiUrl}/v1/prescriptions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ bookingId, medicines: cleaned }),
      })
      if (!res.ok) throw new Error('Failed')
      router.back()
    } finally {
      setSaving(false)
    }
  }

  if (loadingExisting) {
    return <div className="py-16 text-center text-gray-500">{bk.loading ?? 'Yuklanmoqda…'}</div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">{bk.prescription ?? 'Retsept'}</h1>
        <p className="text-gray-600 mt-1">{bk.booking ?? 'Bron'}: {bookingId}</p>
      </div>

      <MedicalHistoryPanel patientId={patientId} />

      <Card>
        <CardHeader>
          <CardTitle>{bk.medicines ?? 'Dorilar'}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {meds.map((m, idx) => (
            <div key={m.key} className="rounded-xl border border-gray-200 p-4 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div className="font-semibold text-gray-900">{bk.medicine ?? 'Dori'} #{idx + 1}</div>
                {meds.length > 1 ? (
                  <Button variant="destructive" size="sm" onClick={() => setMeds((arr) => arr.filter((x) => x.key !== m.key))}>
                    {bk.remove ?? 'O\'chirish'}
                  </Button>
                ) : null}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Input placeholder={bk.medicineName ?? 'Dori nomi'} value={m.name} onChange={(e) => setMeds((arr) => arr.map((x) => (x.key === m.key ? { ...x, name: e.target.value } : x)))} />
                <Input placeholder={bk.dosage ?? 'Doza (masalan: 500mg)'} value={m.dosage} onChange={(e) => setMeds((arr) => arr.map((x) => (x.key === m.key ? { ...x, dosage: e.target.value } : x)))} />
                <Input type="number" placeholder={bk.durationDays ?? 'Davomiyligi (kun)'} value={String(m.durationDays)} onChange={(e) => setMeds((arr) => arr.map((x) => (x.key === m.key ? { ...x, durationDays: Number(e.target.value) } : x)))} />
                <Input type="number" placeholder={bk.timesPerDay ?? 'Kuniga marta'} value={String(m.timesPerDay)} onChange={(e) => setMeds((arr) => arr.map((x) => (x.key === m.key ? { ...x, timesPerDay: Number(e.target.value) } : x)))} />
                <select
                  className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  value={m.foodRelation}
                  onChange={(e) => setMeds((arr) => arr.map((x) => (x.key === m.key ? { ...x, foodRelation: e.target.value as any } : x)))}
                >
                  <option value="before_food">{bk.beforeFood ?? 'Ovqatdan oldin'}</option>
                  <option value="after_food">{bk.afterFood ?? 'Ovqatdan keyin'}</option>
                  <option value="no_relation">{bk.noRelation ?? 'Bog\'liq emas'}</option>
                </select>
                <Input placeholder={bk.foodTiming ?? 'Ovqat vaqti (ixtiyoriy)'} value={m.foodTiming} onChange={(e) => setMeds((arr) => arr.map((x) => (x.key === m.key ? { ...x, foodTiming: e.target.value } : x)))} />
              </div>
              <textarea
                placeholder={bk.notes ?? 'Izohlar (ixtiyoriy)'}
                className="w-full min-h-[90px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                value={m.notes}
                onChange={(e) => setMeds((arr) => arr.map((x) => (x.key === m.key ? { ...x, notes: e.target.value } : x)))}
              />
            </div>
          ))}

          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setMeds((arr) => [...arr, newMed()])}>{bk.addMedicine ?? 'Dori qo\'shish'}</Button>
            <Button onClick={save} disabled={saving}>{saving ? (bk.saving ?? 'Saqlanmoqda…') : (bk.save ?? 'Saqlash')}</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
