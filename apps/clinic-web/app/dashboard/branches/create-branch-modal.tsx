'use client'

import { useState, useEffect } from 'react'
import { useLanguage } from '@/contexts/language-context'
import { getApiUrl } from '@/lib/api'
import Cookies from 'js-cookie'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { MapPin, Loader2 } from 'lucide-react'

const DAY_KEYS = ['dayMon', 'dayTue', 'dayWed', 'dayThu', 'dayFri', 'daySat', 'daySun'] as const

export interface BranchForEdit {
  _id: string
  name: string
  phone: string
  address: { city: string; street: string; geo: { lat: number; lng: number } }
  workingHours: Array<{ day: number; from: string; to: string }>
  isActive: boolean
}

interface CreateBranchModalProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  editBranch?: BranchForEdit | null
}

function getAuthHeaders(): HeadersInit {
  const token = Cookies.get('clinic_auth_token')
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

const GEOLOCATION_TIMEOUT_MS = 15000

export function CreateBranchModal({ open, onClose, onSuccess, editBranch }: CreateBranchModalProps) {
  const { t } = useLanguage()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [locationError, setLocationError] = useState('')

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [city, setCity] = useState('')
  const [street, setStreet] = useState('')
  const [lat, setLat] = useState<number>(41.311081)
  const [lng, setLng] = useState<number>(69.240562)
  const [locLoading, setLocLoading] = useState(false)
  const [workingHours, setWorkingHours] = useState(
    [1, 2, 3, 4, 5, 6, 7].map((day) => ({ day, from: '09:00', to: '18:00', isWorking: true }))
  )

  const isEdit = !!editBranch?._id

  useEffect(() => {
    if (!open) {
      setError('')
      setLocationError('')
      return
    }
    if (editBranch) {
      setName(editBranch.name)
      setPhone(editBranch.phone)
      setCity(editBranch.address.city)
      setStreet(editBranch.address.street)
      setLat(editBranch.address.geo.lat)
      setLng(editBranch.address.geo.lng)
      const days = [1, 2, 3, 4, 5, 6, 7].map((day) => {
        const wh = editBranch.workingHours.find((w) => w.day === day)
        return wh
          ? { day, from: wh.from, to: wh.to, isWorking: true }
          : { day, from: '09:00', to: '18:00', isWorking: false }
      })
      setWorkingHours(days)
    } else {
      setName('')
      setPhone('')
      setCity('')
      setStreet('')
      setLat(41.311081)
      setLng(69.240562)
      setWorkingHours([1, 2, 3, 4, 5, 6, 7].map((day) => ({ day, from: '09:00', to: '18:00', isWorking: true })))
    }
  }, [open, editBranch])

  const setWorkingHour = (index: number, field: 'from' | 'to', value: string) => {
    setWorkingHours((prev) => {
      const next = [...prev]
      next[index] = { ...next[index], [field]: value }
      return next
    })
  }

  const setDayWorking = (index: number, isWorking: boolean) => {
    setWorkingHours((prev) => {
      const next = [...prev]
      next[index] = { ...next[index], isWorking }
      return next
    })
  }

  const useCurrentLocation = () => {
    setLocLoading(true)
    setLocationError('')
    setError('')
    if (!navigator.geolocation) {
      setLocationError(t.branches.locationError)
      setLocLoading(false)
      return
    }
    const timeoutId = setTimeout(() => {
      setLocLoading(false)
      setLocationError(t.branches.locationError)
    }, GEOLOCATION_TIMEOUT_MS)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        clearTimeout(timeoutId)
        setLat(Number(pos.coords.latitude.toFixed(6)))
        setLng(Number(pos.coords.longitude.toFixed(6)))
        setLocationError('')
        setLocLoading(false)
      },
      (err) => {
        clearTimeout(timeoutId)
        setLocLoading(false)
        setLocationError(t.branches.locationError)
      },
      { enableHighAccuracy: false, timeout: GEOLOCATION_TIMEOUT_MS - 1000, maximumAge: 60000 }
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const payload = {
        name: name.trim(),
        phone: phone.trim(),
        address: {
          city: city.trim(),
          street: street.trim(),
          geo: { lat, lng },
        },
        workingHours: workingHours
          .filter((wh) => wh.isWorking)
          .map(({ day, from, to }) => ({ day, from, to })),
      }
      if (isEdit && editBranch?._id) {
        const res = await fetch(
          `${getApiUrl()}/v1/clinics/my-clinic/branches/${editBranch._id}`,
          { method: 'PATCH', headers: getAuthHeaders(), body: JSON.stringify(payload) }
        )
        const data = await res.json()
        if (!res.ok) {
          setError(data.error || 'Failed to update branch')
          setLoading(false)
          return
        }
      } else {
        const res = await fetch(`${getApiUrl()}/v1/clinics/my-clinic/branches`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify(payload),
        })
        const data = await res.json()
        if (!res.ok) {
          setError(data.error || 'Failed to create branch')
          setLoading(false)
          return
        }
      }
      onSuccess()
      setLoading(false)
    } catch {
      setError('Network error')
      setLoading(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="min-h-full flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden />
        <div
          className="relative z-10 w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-6 sm:p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-1">
              {isEdit ? t.branches.modalEditTitle : t.branches.modalTitle}
            </h2>
            <p className="text-gray-600 mb-6">{t.branches.modalDesc}</p>

            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="branch-name">{t.branches.name}</Label>
                  <Input
                    id="branch-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={t.branches.namePlaceholder}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="branch-phone">{t.branches.phone}</Label>
                  <Input
                    id="branch-phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder={t.branches.phonePlaceholder}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="branch-city">{t.branches.city}</Label>
                <Input
                  id="branch-city"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder={t.branches.cityPlaceholder}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="branch-street">{t.branches.street}</Label>
                <Input
                  id="branch-street"
                  value={street}
                  onChange={(e) => setStreet(e.target.value)}
                  placeholder={t.branches.streetPlaceholder}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>{t.branches.mapLabel}</Label>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={useCurrentLocation}
                    disabled={locLoading}
                  >
                    {locLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <MapPin className="h-4 w-4 mr-2" />
                    )}
                    {t.branches.useCurrentLocation}
                  </Button>
                </div>
                {locationError && (
                  <p className="text-sm text-amber-700">{locationError}</p>
                )}
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <div>
                    <Label htmlFor="branch-lat" className="text-xs text-gray-500">Latitude</Label>
                    <Input
                      id="branch-lat"
                      type="number"
                      step="any"
                      value={lat}
                      onChange={(e) => { setLat(Number(e.target.value)); setLocationError('') }}
                    />
                  </div>
                  <div>
                    <Label htmlFor="branch-lng" className="text-xs text-gray-500">Longitude</Label>
                    <Input
                      id="branch-lng"
                      type="number"
                      step="any"
                      value={lng}
                      onChange={(e) => { setLng(Number(e.target.value)); setLocationError('') }}
                    />
                  </div>
                </div>
                <a
                  href={`https://yandex.com/maps/?pt=${lng},${lat}&z=16`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700"
                >
                  <MapPin className="h-4 w-4" />
                  {t.branches.openInMap} (Yandex)
                </a>
              </div>

              <div className="space-y-3">
                <Label>{t.branches.workingHours}</Label>
                <div className="rounded-lg border border-gray-200 divide-y divide-gray-200 overflow-hidden">
                  {workingHours.map((wh, index) => (
                    <div
                      key={wh.day}
                      className={`flex flex-wrap items-center gap-2 sm:gap-4 px-4 py-3 sm:flex-nowrap ${
                        wh.isWorking ? 'bg-gray-50/50' : 'bg-gray-100/80'
                      }`}
                    >
                      <span className="w-28 text-sm font-medium text-gray-700 shrink-0">
                        {t.branches[DAY_KEYS[wh.day - 1]]}
                      </span>
                      {wh.isWorking ? (
                        <>
                          <div className="flex items-center gap-2 flex-1">
                            <Input
                              type="time"
                              value={wh.from}
                              onChange={(e) => setWorkingHour(index, 'from', e.target.value)}
                              className="w-28"
                            />
                            <span className="text-gray-400">–</span>
                            <Input
                              type="time"
                              value={wh.to}
                              onChange={(e) => setWorkingHour(index, 'to', e.target.value)}
                              className="w-28"
                            />
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setDayWorking(index, false)}
                            className="shrink-0 text-amber-700 border-amber-200 hover:bg-amber-50"
                          >
                            {t.branches.notWorking}
                          </Button>
                        </>
                      ) : (
                        <>
                          <span className="flex-1 text-sm text-gray-500 italic">
                            {t.branches.notWorking}
                          </span>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setDayWorking(index, true)}
                            className="shrink-0 text-green-700 border-green-200 hover:bg-green-50"
                          >
                            {t.branches.working}
                          </Button>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end pt-4">
                <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
                  {t.branches.cancel}
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  {isEdit ? t.branches.edit : t.branches.create}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
