'use client'

import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useLanguage } from '@/contexts/language-context'
import { getApiUrl } from '@/lib/api'
import Cookies from 'js-cookie'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { MapPin, Loader2, X } from 'lucide-react'

const DAY_KEYS = ['dayMon', 'dayTue', 'dayWed', 'dayThu', 'dayFri', 'daySat', 'daySun'] as const
const PANEL_WIDTH = 'min(100%, 42rem)' // ~672px, wide side panel
const ANIMATION_MS = 300
const OPEN_EASING = 'cubic-bezier(0.32, 0.72, 0, 1)' // smooth deceleration
const OPEN_DURATION_MS = 380

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
  const [closing, setClosing] = useState(false)

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
  const visible = open || closing

  const closePanel = useCallback(() => {
    setClosing(true)
    const id = setTimeout(() => {
      onClose()
      setClosing(false)
    }, ANIMATION_MS)
    return () => clearTimeout(id)
  }, [onClose])

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

  if (!visible) return null

  const panelOpen = open && !closing

  const panelContent = (
    <div
      className="fixed inset-0 z-50 flex justify-end"
      style={{
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        minHeight: '100vh',
      }}
      aria-modal="true"
      role="dialog"
    >
      {/* Overlay - fade in/out */}
      <div
        className="absolute bg-black/50"
        style={{
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          minHeight: '100vh',
          opacity: panelOpen ? 1 : 0,
          pointerEvents: panelOpen ? 'auto' : 'none',
          transition: `opacity ${OPEN_DURATION_MS}ms ${OPEN_EASING}`,
        }}
        onClick={closePanel}
        aria-hidden
      />

      {/* Side panel - slide in from right with easing + subtle opacity */}
      <div
        className="relative flex w-full max-w-[42rem] flex-col bg-white shadow-2xl"
        style={{
          width: PANEL_WIDTH,
          top: 0,
          bottom: 0,
          height: '100vh',
          minHeight: '100vh',
          transform: panelOpen ? 'translateX(0)' : 'translateX(100%)',
          opacity: panelOpen ? 1 : 0.97,
          transition: `transform ${OPEN_DURATION_MS}ms ${OPEN_EASING}, opacity ${OPEN_DURATION_MS}ms ${OPEN_EASING}`,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-gray-200 px-6 py-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              {isEdit ? t.branches.modalEditTitle : t.branches.modalTitle}
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">{t.branches.modalDesc}</p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={closePanel}
            disabled={loading}
            className="h-9 w-9 rounded-lg shrink-0"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Scrollable body */}
        <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto px-6 py-5">
            {error && (
              <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="space-y-6">
              <section>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">{t.branches.name}</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="branch-name" className="text-sm text-gray-600">{t.branches.name}</Label>
                    <Input
                      id="branch-name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder={t.branches.namePlaceholder}
                      required
                      className="w-full"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="branch-phone" className="text-sm text-gray-600">{t.branches.phone}</Label>
                    <Input
                      id="branch-phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder={t.branches.phonePlaceholder}
                      required
                      className="w-full"
                    />
                  </div>
                </div>
              </section>

              <section>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">{t.branches.address}</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="branch-city" className="text-sm text-gray-600">{t.branches.city}</Label>
                    <Input
                      id="branch-city"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder={t.branches.cityPlaceholder}
                      required
                      className="w-full"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="branch-street" className="text-sm text-gray-600">{t.branches.street}</Label>
                    <Input
                      id="branch-street"
                      value={street}
                      onChange={(e) => setStreet(e.target.value)}
                      placeholder={t.branches.streetPlaceholder}
                      required
                      className="w-full"
                    />
                  </div>
                </div>
              </section>

              <section>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">{t.branches.mapLabel}</h3>
                <div className="space-y-3">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={useCurrentLocation}
                    disabled={locLoading}
                    className="w-full sm:w-auto"
                  >
                    {locLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <MapPin className="h-4 w-4 mr-2" />
                    )}
                    {t.branches.useCurrentLocation}
                  </Button>
                  {locationError && (
                    <p className="text-sm text-amber-700">{locationError}</p>
                  )}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label htmlFor="branch-lat" className="text-xs text-gray-500">Latitude</Label>
                      <Input
                        id="branch-lat"
                        type="number"
                        step="any"
                        value={lat}
                        onChange={(e) => { setLat(Number(e.target.value)); setLocationError('') }}
                      />
                    </div>
                    <div className="space-y-1">
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
              </section>

              <section>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">{t.branches.workingHours}</h3>
                <div className="rounded-lg border border-gray-200 divide-y divide-gray-200 overflow-hidden">
                  {workingHours.map((wh, index) => (
                    <div
                      key={wh.day}
                      className={`flex flex-wrap items-center gap-2 px-4 py-3 sm:flex-nowrap ${
                        wh.isWorking ? 'bg-gray-50/50' : 'bg-gray-100/80'
                      }`}
                    >
                      <span className="w-24 text-sm font-medium text-gray-700 shrink-0">
                        {t.branches[DAY_KEYS[wh.day - 1]]}
                      </span>
                      {wh.isWorking ? (
                        <>
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <Input
                              type="time"
                              value={wh.from}
                              onChange={(e) => setWorkingHour(index, 'from', e.target.value)}
                              className="w-24 shrink-0"
                            />
                            <span className="text-gray-400 shrink-0">–</span>
                            <Input
                              type="time"
                              value={wh.to}
                              onChange={(e) => setWorkingHour(index, 'to', e.target.value)}
                              className="w-24 shrink-0"
                            />
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setDayWorking(index, false)}
                            className="shrink-0 text-amber-700 border-amber-200 hover:bg-amber-50 text-xs"
                          >
                            {t.branches.notWorking}
                          </Button>
                        </>
                      ) : (
                        <>
                          <span className="flex-1 text-sm text-gray-500 italic">{t.branches.closed}</span>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setDayWorking(index, true)}
                            className="shrink-0 text-green-700 border-green-200 hover:bg-green-50 text-xs"
                          >
                            {t.branches.working}
                          </Button>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </div>

          {/* Footer – actions at bottom right */}
          <div className="shrink-0 border-t border-gray-200 px-6 py-4 flex flex-row justify-end gap-3">
            <Button type="button" variant="outline" onClick={closePanel} disabled={loading}>
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
  )

  return typeof document !== 'undefined'
    ? createPortal(panelContent, document.body)
    : null
}
