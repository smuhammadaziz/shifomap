'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useLanguage } from '@/contexts/language-context'
import { getApiUrl } from '@/lib/api'
import Cookies from 'js-cookie'
import { Button } from '@/components/ui/button'
import {
  Briefcase,
  Plus,
  MoreVertical,
  Pencil,
  Trash2,
  Ban,
  Play,
  Eye,
} from 'lucide-react'
import { CreateServiceModal, type ServiceForEdit } from './create-service-modal'
import { ServiceDetailsModal } from './service-details-modal'
import { useToast } from '@/contexts/toast-context'

const DEFAULT_IMAGE = 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=400&h=300&fit=crop'

interface ServicePrice {
  amount?: number
  minAmount?: number
  maxAmount?: number
  currency: string
}

interface Service {
  _id: string
  title: string
  description: string
  serviceImage: string | null
  categoryId: string
  durationMin: number
  price: ServicePrice
  branchIds: string[]
  doctorIds: string[]
  isActive: boolean
  createdAt?: string
  updatedAt?: string
}

interface Branch {
  _id: string
  name: string
}

interface Doctor {
  _id: string
  fullName: string
  specialty?: string
}

interface Category {
  _id: string
  name: string
}

interface ClinicData {
  branches?: Branch[]
  doctors?: Doctor[]
  categories?: Category[]
  services?: Service[]
  plan?: {
    type: string
    limits: {
      maxBranches: number
      maxServices: number
      maxAdmins: number
    }
  }
}

function getAuthHeaders(): HeadersInit {
  const token = Cookies.get('clinic_auth_token')
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

export default function ServicesPage() {
  const { t } = useLanguage()
  const { toast } = useToast()
  const [clinic, setClinic] = useState<ClinicData | null>(null)
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editService, setEditService] = useState<ServiceForEdit | null>(null)
  const [detailsService, setDetailsService] = useState<Service | null>(null)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const fetchMyClinic = useCallback(async () => {
    try {
      const res = await fetch(`${getApiUrl()}/v1/clinics/my-clinic`, {
        headers: getAuthHeaders(),
      })
      if (!res.ok) {
        setClinic(null)
        return
      }
      const json = await res.json()
      if (json.success && json.data) setClinic(json.data)
      else setClinic(null)
    } catch {
      setClinic(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchMyClinic()
  }, [fetchMyClinic])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuId(null)
        setDeleteConfirmId(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const services = clinic?.services ?? []
  const branches = clinic?.branches ?? []
  const doctors = clinic?.doctors ?? []
  const categories = clinic?.categories ?? []
  const hasBranches = branches.length > 0
  const hasDoctors = doctors.length > 0
  const hasCategories = categories.length > 0
  const maxServices = clinic?.plan?.limits?.maxServices ?? 5
  const isLimitReached = services.length >= maxServices
  const canCreateService = hasBranches && hasDoctors && hasCategories && !isLimitReached

  const categoryNames: Record<string, string> = categories.reduce(
    (acc, c) => ({ ...acc, [c._id]: c.name }),
    {}
  )
  const branchNames: Record<string, string> = branches.reduce(
    (acc, b) => ({ ...acc, [b._id]: b.name }),
    {}
  )
  const doctorNames: Record<string, string> = doctors.reduce(
    (acc, d) => ({ ...acc, [d._id]: d.fullName }),
    {}
  )

  const handleServiceCreated = (isEdit: boolean) => {
    setModalOpen(false)
    setEditService(null)
    fetchMyClinic()
    toast(isEdit ? t.services.updatedSuccess : t.services.createdSuccess)
  }

  const openCreate = () => {
    setEditService(null)
    setModalOpen(true)
  }

  const openEdit = (service: Service) => {
    setEditService({
      _id: service._id,
      title: service.title,
      description: service.description ?? '',
      serviceImage: service.serviceImage ?? '',
      categoryId: service.categoryId,
      durationMin: service.durationMin,
      price: service.price,
      branchIds: service.branchIds ?? [],
      doctorIds: service.doctorIds ?? [],
      isActive: service.isActive,
    })
    setModalOpen(true)
    setOpenMenuId(null)
  }

  const openDetails = (service: Service) => {
    setDetailsService(service)
    setOpenMenuId(null)
  }

  const handleSetStatus = async (serviceId: string, isActive: boolean) => {
    setActionLoading(serviceId)
    setOpenMenuId(null)
    try {
      const res = await fetch(
        `${getApiUrl()}/v1/clinics/my-clinic/services/${serviceId}/status`,
        { method: 'PATCH', headers: getAuthHeaders(), body: JSON.stringify({ isActive }) }
      )
      if (res.ok) {
        fetchMyClinic()
        toast(isActive ? t.services.statusSetActive : t.services.statusSetInactive)
      }
    } finally {
      setActionLoading(null)
    }
  }

  const handleDelete = async (serviceId: string) => {
    setActionLoading(serviceId)
    setDeleteConfirmId(null)
    setOpenMenuId(null)
    try {
      const res = await fetch(`${getApiUrl()}/v1/clinics/my-clinic/services/${serviceId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      })
      if (res.ok) {
        fetchMyClinic()
        toast(t.services.deletedSuccess)
      }
    } finally {
      setActionLoading(null)
    }
  }

  const formatPrice = (price: ServicePrice) => {
    if (price.amount != null) return `${price.amount.toLocaleString()} ${price.currency}`
    if (price.minAmount != null && price.maxAmount != null)
      return `${price.minAmount.toLocaleString()} – ${price.maxAmount.toLocaleString()} ${price.currency}`
    return '—'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-pulse text-gray-500">Loading…</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{t.services.title}</h1>
          <p className="text-gray-600 mt-1">{t.services.subtitle}</p>
        </div>
        <Button onClick={openCreate} className="shrink-0" disabled={!canCreateService}>
          <Plus className="h-4 w-4 mr-2" />
          {t.services.addService}
        </Button>
      </div>

      {isLimitReached && (
        <div className="rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-amber-900 mb-1">
                {t.services.planLimitReached.replace('{max}', String(maxServices))}
              </h3>
              <p className="text-sm text-amber-700">
                {t.services.planLimitMessage
                  .replace('{current}', String(services.length))
                  .replace('{max}', String(maxServices))}
              </p>
            </div>
            <a
              href="https://t.me/shifoyol_admin"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors shrink-0"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.14.18-.357.295-.6.295-.002 0-.003 0-.005 0l.213-3.054 5.56-5.022c.24-.213-.054-.334-.373-.121l-6.869 4.326-2.96-.924c-.64-.203-.658-.64.135-.954l11.566-4.458c.538-.196 1.006.128.832.941z"/>
              </svg>
              {t.services.contactAdmin}
            </a>
          </div>
        </div>
      )}

      {!hasBranches || !hasDoctors || !hasCategories ? (
        <div className="flex flex-col items-center justify-center py-16 px-4 rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50/50">
          <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mb-6">
            <Briefcase className="h-8 w-8 text-blue-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 text-center mb-2">
            {t.services.emptyTitle}
          </h2>
          <p className="text-gray-600 text-center max-w-md mb-4">
            {t.services.emptyDesc}
          </p>
          <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800 max-w-md text-center mb-6">
            {t.services.noPrereqAlert}
          </div>
          <p className="text-sm text-gray-500 mb-6">
            {t.services.addService} — {t.services.noPrereqAlert}
          </p>
        </div>
      ) : services.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-4 rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50/50">
          <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mb-6">
            <Briefcase className="h-8 w-8 text-blue-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 text-center mb-2">
            {t.services.emptyTitle}
          </h2>
          <p className="text-gray-600 text-center max-w-md mb-8">
            {t.services.emptyDesc}
          </p>
          <Button size="lg" onClick={openCreate}>
            <Plus className="h-5 w-5 mr-2" />
            {t.services.addService}
          </Button>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {services.map((service) => {
            const imageUrl = service.serviceImage || DEFAULT_IMAGE
            const categoryName = categoryNames[service.categoryId] ?? '—'
            return (
              <div
                key={service._id}
                className="group relative rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-sm hover:shadow-lg transition-all duration-200"
              >
                <div className="h-36 bg-gray-100">
                  <img
                    src={imageUrl}
                    alt={service.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-4">
                  <h3 className="text-lg font-bold text-gray-900 truncate">{service.title}</h3>
                  <p className="text-sm text-gray-600 mt-0.5">{categoryName}</p>
                  <p className="text-sm font-medium text-gray-800 mt-2">
                    {formatPrice(service.price)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {service.durationMin} min
                  </p>
                  <span
                    className={`inline-flex mt-2 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      service.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    {service.isActive ? t.services.active : t.services.inactive}
                  </span>
                </div>
                <div className="absolute top-2 right-2 z-10" ref={openMenuId === service._id ? menuRef : undefined}>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 rounded-lg bg-white/90 hover:bg-white shadow"
                    onClick={() => setOpenMenuId(openMenuId === service._id ? null : service._id)}
                    disabled={!!actionLoading}
                  >
                    <MoreVertical className="h-5 w-5 text-gray-600" />
                  </Button>
                  {openMenuId === service._id && (
                    <div className="absolute right-0 top-full mt-1 w-72 rounded-xl border border-gray-200 bg-white py-1.5 shadow-xl z-20">
                      <button
                        type="button"
                        className="flex w-full items-center gap-3 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                        onClick={() => openDetails(service)}
                      >
                        <Eye className="h-4 w-4" />
                        {t.services.viewDetails}
                      </button>
                      <button
                        type="button"
                        className="flex w-full items-center gap-3 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                        onClick={() => openEdit(service)}
                      >
                        <Pencil className="h-4 w-4" />
                        {t.services.edit}
                      </button>
                      {service.isActive ? (
                        <button
                          type="button"
                          className="flex w-full items-center gap-3 px-4 py-2.5 text-sm font-medium text-amber-700 hover:bg-amber-50 transition-colors"
                          onClick={() => handleSetStatus(service._id, false)}
                          disabled={actionLoading === service._id}
                        >
                          <Ban className="h-4 w-4" />
                          {t.services.setInactive}
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="flex w-full items-center gap-3 px-4 py-2.5 text-sm font-medium text-green-700 hover:bg-green-50 transition-colors"
                          onClick={() => handleSetStatus(service._id, true)}
                          disabled={actionLoading === service._id}
                        >
                          <Play className="h-4 w-4" />
                          {t.services.setActive}
                        </button>
                      )}
                      {deleteConfirmId === service._id ? (
                        <div className="border-t border-gray-100 px-4 py-3 space-y-2.5">
                          <p className="text-xs font-medium text-gray-700">{t.services.deleteConfirm}</p>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="destructive"
                              className="flex-1 h-8"
                              onClick={() => handleDelete(service._id)}
                              disabled={actionLoading === service._id}
                            >
                              {t.services.delete}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8"
                              onClick={() => setDeleteConfirmId(null)}
                            >
                              {t.services.cancel}
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          className="flex w-full items-center gap-3 px-4 py-2.5 text-sm font-medium text-red-700 hover:bg-red-50 transition-colors"
                          onClick={() => setDeleteConfirmId(service._id)}
                        >
                          <Trash2 className="h-4 w-4" />
                          {t.services.delete}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <CreateServiceModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditService(null) }}
        onSuccess={handleServiceCreated}
        branches={branches}
        doctors={doctors}
        categories={categories}
        editService={editService}
      />

      <ServiceDetailsModal
        service={detailsService}
        categoryNames={categoryNames}
        branchNames={branchNames}
        doctorNames={doctorNames}
        onClose={() => setDetailsService(null)}
      />
    </div>
  )
}
