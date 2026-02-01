'use client'

import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useLanguage } from '@/contexts/language-context'
import { getApiUrl } from '@/lib/api'
import Cookies from 'js-cookie'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, X } from 'lucide-react'

const PANEL_WIDTH = 'min(100%, 42rem)'
const ANIMATION_MS = 300
const OPEN_EASING = 'cubic-bezier(0.32, 0.72, 0, 1)'
const OPEN_DURATION_MS = 380

export interface BranchOption {
  _id: string
  name: string
}

export interface DoctorOption {
  _id: string
  fullName: string
}

export interface CategoryOption {
  _id: string
  name: string
}

export interface ServicePrice {
  amount?: number
  minAmount?: number
  maxAmount?: number
  currency: string
}

export interface ServiceForEdit {
  _id: string
  title: string
  description: string
  serviceImage: string
  categoryId: string
  durationMin: number
  price: ServicePrice
  branchIds: string[]
  doctorIds: string[]
  isActive: boolean
}

interface CreateServiceModalProps {
  open: boolean
  onClose: () => void
  onSuccess: (isEdit: boolean) => void
  branches: BranchOption[]
  doctors: DoctorOption[]
  categories: CategoryOption[]
  editService?: ServiceForEdit | null
}

function getAuthHeaders(): HeadersInit {
  const token = Cookies.get('clinic_auth_token')
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

export function CreateServiceModal({
  open,
  onClose,
  onSuccess,
  branches,
  doctors,
  categories,
  editService,
}: CreateServiceModalProps) {
  const { t } = useLanguage()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [closing, setClosing] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [serviceImage, setServiceImage] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [durationMin, setDurationMin] = useState('30')
  const [priceType, setPriceType] = useState<'fixed' | 'range'>('fixed')
  const [priceAmount, setPriceAmount] = useState('')
  const [priceMin, setPriceMin] = useState('')
  const [priceMax, setPriceMax] = useState('')
  const [branchIds, setBranchIds] = useState<string[]>([])
  const [doctorIds, setDoctorIds] = useState<string[]>([])

  const isEdit = !!editService?._id
  const hasBranches = branches.length > 0
  const hasDoctors = doctors.length > 0
  const hasCategories = categories.length > 0
  const canSubmit = hasBranches && hasDoctors && hasCategories
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
      return
    }
    if (editService) {
      setTitle(editService.title)
      setDescription(editService.description ?? '')
      setServiceImage(editService.serviceImage ?? '')
      setCategoryId(editService.categoryId)
      setDurationMin(String(editService.durationMin))
      const p = editService.price
      if (p.amount != null) {
        setPriceType('fixed')
        setPriceAmount(String(p.amount))
        setPriceMin('')
        setPriceMax('')
      } else {
        setPriceType('range')
        setPriceAmount('')
        setPriceMin(String(p.minAmount ?? ''))
        setPriceMax(String(p.maxAmount ?? ''))
      }
      setBranchIds(editService.branchIds ?? [])
      setDoctorIds(editService.doctorIds ?? [])
    } else {
      setTitle('')
      setDescription('')
      setServiceImage('')
      setCategoryId(categories[0]?._id ?? '')
      setDurationMin('30')
      setPriceType('fixed')
      setPriceAmount('')
      setPriceMin('')
      setPriceMax('')
      setBranchIds([])
      setDoctorIds([])
    }
  }, [open, editService, categories])

  const toggleBranch = (id: string) => {
    setBranchIds((prev) => (prev.includes(id) ? prev.filter((b) => b !== id) : [...prev, id]))
  }

  const toggleDoctor = (id: string) => {
    setDoctorIds((prev) => (prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!canSubmit && !isEdit) {
      setError(t.services.noPrereqAlert)
      return
    }
    const catId = categoryId || categories[0]?._id
    if (!catId) {
      setError(t.services.selectCategory)
      return
    }
    const dur = parseInt(durationMin, 10)
    if (isNaN(dur) || dur < 1 || dur > 480) {
      setError('Duration must be between 1 and 480 minutes')
      return
    }
    let price: { amount?: number; minAmount?: number; maxAmount?: number; currency: string }
    if (priceType === 'fixed') {
      const amt = parseFloat(priceAmount)
      if (isNaN(amt) || amt < 0) {
        setError('Enter a valid price')
        return
      }
      price = { amount: amt, currency: 'UZS' }
    } else {
      const min = parseFloat(priceMin)
      const max = parseFloat(priceMax)
      if (isNaN(min) || isNaN(max) || min < 0 || max < min) {
        setError('Enter valid min and max price (min ≤ max)')
        return
      }
      price = { minAmount: min, maxAmount: max, currency: 'UZS' }
    }
    if (branchIds.length === 0 || doctorIds.length === 0) {
      setError(t.services.noPrereqAlert)
      return
    }

    setLoading(true)
    try {
      if (isEdit && editService?._id) {
        const payload: Record<string, unknown> = {
          title: title.trim(),
          description: description.trim(),
          serviceImage: serviceImage.trim() || null,
          categoryId: catId,
          durationMin: dur,
          price,
          branchIds,
          doctorIds,
        }
        const res = await fetch(
          `${getApiUrl()}/v1/clinics/my-clinic/services/${editService._id}`,
          { method: 'PATCH', headers: getAuthHeaders(), body: JSON.stringify(payload) }
        )
        const data = await res.json()
        if (!res.ok) {
          setError(data.error || 'Failed to update service')
          setLoading(false)
          return
        }
      } else {
        const payload = {
          title: title.trim(),
          description: description.trim(),
          serviceImage: serviceImage.trim() || null,
          categoryId: catId,
          durationMin: dur,
          price,
          branchIds,
          doctorIds,
        }
        const res = await fetch(`${getApiUrl()}/v1/clinics/my-clinic/services`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify(payload),
        })
        const data = await res.json()
        if (!res.ok) {
          setError(data.error || 'Failed to create service')
          setLoading(false)
          return
        }
      }
      onSuccess(!!isEdit)
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
      {/* Overlay - full viewport, no gap */}
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

      {/* Side panel */}
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
              {isEdit ? t.services.modalEditTitle : t.services.modalTitle}
            </h2>
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

        <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto px-6 py-5">
            {!canSubmit && !isEdit && (
              <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800 mb-5">
                {t.services.noPrereqAlert}
              </div>
            )}

            {error && (
              <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="service-title" className="text-sm text-gray-600">{t.services.titleLabel}</Label>
                  <Input
                    id="service-title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder={t.services.titlePlaceholder}
                    required
                    disabled={loading}
                    className="w-full"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="service-duration" className="text-sm text-gray-600">{t.services.durationMin}</Label>
                  <Input
                    id="service-duration"
                    type="number"
                    min={1}
                    max={480}
                    value={durationMin}
                    onChange={(e) => setDurationMin(e.target.value)}
                    placeholder={t.services.durationPlaceholder}
                    required
                    disabled={loading}
                    className="w-full"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="service-desc" className="text-sm text-gray-600">{t.services.description}</Label>
                <textarea
                  id="service-desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={t.services.descriptionPlaceholder}
                  rows={3}
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="service-image" className="text-sm text-gray-600">{t.services.serviceImage}</Label>
                <Input
                  id="service-image"
                  type="url"
                  value={serviceImage}
                  onChange={(e) => setServiceImage(e.target.value)}
                  placeholder={t.services.serviceImagePlaceholder}
                  disabled={loading}
                  className="w-full"
                />
              </div>

              {hasCategories && (
                <div className="space-y-2">
                  <Label htmlFor="service-category" className="text-sm text-gray-600">{t.services.category}</Label>
                  <select
                    id="service-category"
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    required
                    disabled={loading}
                  >
                    <option value="">{t.services.selectCategory}</option>
                    {categories.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="space-y-3">
                <Label className="text-sm text-gray-600">{t.services.price}</Label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={priceType === 'fixed'}
                      onChange={() => setPriceType('fixed')}
                      disabled={loading}
                    />
                    <span className="text-sm">{t.services.priceFixed}</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={priceType === 'range'}
                      onChange={() => setPriceType('range')}
                      disabled={loading}
                    />
                    <span className="text-sm">{t.services.priceRange}</span>
                  </label>
                </div>
                {priceType === 'fixed' ? (
                  <Input
                    type="number"
                    min={0}
                    step={1}
                    value={priceAmount}
                    onChange={(e) => setPriceAmount(e.target.value)}
                    placeholder="0"
                    disabled={loading}
                  />
                ) : (
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={0}
                      step={1}
                      value={priceMin}
                      onChange={(e) => setPriceMin(e.target.value)}
                      placeholder="0"
                      disabled={loading}
                    />
                    <span className="text-sm text-gray-500">{t.services.priceTo}</span>
                    <Input
                      type="number"
                      min={0}
                      step={1}
                      value={priceMax}
                      onChange={(e) => setPriceMax(e.target.value)}
                      placeholder="0"
                      disabled={loading}
                    />
                  </div>
                )}
                <p className="text-xs text-gray-500">{t.services.currency}</p>
              </div>

              {hasBranches && (
                <div className="space-y-2">
                  <Label className="text-sm text-gray-600">{t.services.branches}</Label>
                  <p className="text-xs text-gray-500">{t.services.selectBranches}</p>
                  <div className="flex flex-wrap gap-3 border rounded-lg p-3 bg-gray-50/50">
                    {branches.map((b) => (
                      <label key={b._id} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={branchIds.includes(b._id)}
                          onChange={() => toggleBranch(b._id)}
                          disabled={loading}
                        />
                        <span className="text-sm">{b.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {hasDoctors && (
                <div className="space-y-2">
                  <Label className="text-sm text-gray-600">{t.services.doctors}</Label>
                  <p className="text-xs text-gray-500">{t.services.selectDoctors}</p>
                  <div className="flex flex-wrap gap-3 border rounded-lg p-3 bg-gray-50/50 max-h-40 overflow-y-auto">
                    {doctors.map((d) => (
                      <label key={d._id} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={doctorIds.includes(d._id)}
                          onChange={() => toggleDoctor(d._id)}
                          disabled={loading}
                        />
                        <span className="text-sm">{d.fullName}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="shrink-0 border-t border-gray-200 px-6 py-4 flex flex-row justify-end gap-3">
            <Button type="button" variant="outline" onClick={closePanel} disabled={loading}>
              {t.services.cancel}
            </Button>
            <Button type="submit" disabled={loading || (!canSubmit && !isEdit)}>
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              {isEdit ? t.services.save : t.services.create}
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
