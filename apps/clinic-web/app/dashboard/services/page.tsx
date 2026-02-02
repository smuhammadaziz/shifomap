'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useLanguage } from '@/contexts/language-context'
import { getApiUrl } from '@/lib/api'
import Cookies from 'js-cookie'
import { Button } from '@/components/ui/button'
import {
  Briefcase,
  Plus,
  Pencil,
  Trash2,
  Ban,
  Play,
  FileText,
  MapPin,
  Clock,
  DollarSign,
  Stethoscope,
  User,
  Search,
  SlidersHorizontal,
} from 'lucide-react'
import { CreateServiceModal, type ServiceForEdit } from './create-service-modal'
import { useToast } from '@/contexts/toast-context'

const DEFAULT_IMAGE = 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=400&h=300&fit=crop'
const DEFAULT_AVATAR = 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=200&h=200&fit=crop'

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
  username?: string
  specialty?: string
  bio?: string
  avatarUrl?: string | null
  branchIds?: string[]
  isActive?: boolean
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

function formatPrice(price: ServicePrice): string {
  if (price.amount != null) return `${price.amount.toLocaleString()} ${price.currency}`
  if (price.minAmount != null && price.maxAmount != null)
    return `${price.minAmount.toLocaleString()} – ${price.maxAmount.toLocaleString()} ${price.currency}`
  return '—'
}

interface ServicesPageProps {
  embedded?: boolean
}

export default function ServicesPage({ embedded }: ServicesPageProps) {
  const { t } = useLanguage()
  const { toast } = useToast()
  const [clinic, setClinic] = useState<ClinicData | null>(null)
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editService, setEditService] = useState<ServiceForEdit | null>(null)
  const [selectedService, setSelectedService] = useState<Service | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [statusTab, setStatusTab] = useState<'all' | 'active' | 'inactive'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('')
  const [filtersOpen, setFiltersOpen] = useState(false)
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
    const list = clinic?.services ?? []
    if (list.length === 0) return
    if (!selectedService) {
      setSelectedService(list[0])
      return
    }
    const fresh = list.find((s) => s._id === selectedService._id)
    if (!fresh) setSelectedService(list[0])
    else if (fresh !== selectedService) setSelectedService(fresh)
  }, [clinic?.services, selectedService])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
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
  const doctorsMap: Record<string, Doctor> = doctors.reduce(
    (acc, d) => ({ ...acc, [d._id]: d }),
    {}
  )

  const filteredServices = useMemo(() => {
    let list = services
    if (statusTab === 'active') list = list.filter((s) => s.isActive)
    if (statusTab === 'inactive') list = list.filter((s) => !s.isActive)
    const q = searchQuery.trim().toLowerCase()
    if (q) {
      list = list.filter((s) => {
        const catName = categoryNames[s.categoryId] ?? ''
        return (
          s.title.toLowerCase().includes(q) ||
          (s.description ?? '').toLowerCase().includes(q) ||
          catName.toLowerCase().includes(q)
        )
      })
    }
    if (categoryFilter) {
      list = list.filter((s) => s.categoryId === categoryFilter)
    }
    return list
  }, [services, statusTab, searchQuery, categoryFilter, categoryNames])

  useEffect(() => {
    if (filteredServices.length > 0 && selectedService) {
      const stillInList = filteredServices.some((s) => s._id === selectedService._id)
      if (!stillInList) setSelectedService(filteredServices[0])
    } else if (filteredServices.length === 0) {
      setSelectedService(null)
    }
  }, [filteredServices, selectedService])

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
  }

  const handleSetStatus = async (serviceId: string, isActive: boolean) => {
    setActionLoading(serviceId)
    try {
      const res = await fetch(
        `${getApiUrl()}/v1/clinics/my-clinic/services/${serviceId}/status`,
        { method: 'PATCH', headers: getAuthHeaders(), body: JSON.stringify({ isActive }) }
      )
      if (res.ok) {
        fetchMyClinic()
        setSelectedService((prev) =>
          prev?._id === serviceId ? { ...prev, isActive } : prev
        )
        toast(isActive ? t.services.statusSetActive : t.services.statusSetInactive)
      }
    } finally {
      setActionLoading(null)
    }
  }

  const handleDelete = async (serviceId: string) => {
    setActionLoading(serviceId)
    setDeleteConfirmId(null)
    try {
      const res = await fetch(`${getApiUrl()}/v1/clinics/my-clinic/services/${serviceId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      })
      if (res.ok) {
        if (selectedService?._id === serviceId) setSelectedService(null)
        fetchMyClinic()
        toast(t.services.deletedSuccess)
      }
    } finally {
      setActionLoading(null)
    }
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
      {!embedded && (
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{t.services.title}</h1>
          <p className="text-gray-600 mt-1">{t.services.subtitle}</p>
        </div>
      )}

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
        <>
          {/* Tabs, Search, Filters, and Add Button */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex rounded-lg border border-gray-200 p-0.5 bg-gray-50/50 w-fit">
              <button
                type="button"
                onClick={() => setStatusTab('all')}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  statusTab === 'all'
                    ? 'bg-white text-blue-600 shadow-sm border border-gray-200'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {t.services.viewAll} {services.length}
              </button>
              <button
                type="button"
                onClick={() => setStatusTab('active')}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  statusTab === 'active'
                    ? 'bg-white text-blue-600 shadow-sm border border-gray-200'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {t.services.active} {services.filter((s) => s.isActive).length}
              </button>
              <button
                type="button"
                onClick={() => setStatusTab('inactive')}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  statusTab === 'inactive'
                    ? 'bg-white text-blue-600 shadow-sm border border-gray-200'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {t.services.inactive} {services.filter((s) => !s.isActive).length}
              </button>
            </div>

            <div className="flex items-center gap-2 flex-1 lg:flex-initial">
              <div className="relative flex-1 lg:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder={t.services.searchPlaceholder}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="relative">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setFiltersOpen(!filtersOpen)}
                  className={`gap-2 h-10 ${categoryFilter ? 'border-blue-300 bg-blue-50/50' : ''}`}
                >
                  <SlidersHorizontal className="h-4 w-4" />
                  {t.services.filters}
                </Button>
                {filtersOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      aria-hidden
                      onClick={() => setFiltersOpen(false)}
                    />
                    <div className="absolute right-0 top-full mt-1 z-20 w-56 rounded-xl border border-gray-200 bg-white py-3 px-3 shadow-lg">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                        {t.services.category}
                      </p>
                      <select
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">{t.services.viewAll}</option>
                        {categories.map((cat) => (
                          <option key={cat._id} value={cat._id}>
                            {cat.name}
                          </option>
                        ))}
                      </select>
                      {categoryFilter && (
                        <button
                          type="button"
                          onClick={() => setCategoryFilter('')}
                          className="mt-2 text-sm text-blue-600 hover:underline"
                        >
                          {t.services.cancel}
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
              <Button
                onClick={openCreate}
                className="shrink-0 h-10 gap-2 shadow-sm"
                disabled={!canCreateService}
              >
                <Plus className="h-4 w-4" />
                {t.services.addService}
              </Button>
            </div>
          </div>

          <div className="flex flex-col lg:flex-row gap-6 min-h-[600px]">
            {/* Left panel - Service list */}
            <div className="lg:w-[380px] shrink-0 flex flex-col rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
              <div className="p-5 border-b border-gray-100 bg-gradient-to-br from-slate-50 to-gray-50">
                <h2 className="text-xl font-bold text-gray-900">{t.services.title}</h2>
                <p className="text-sm text-gray-500 mt-0.5">
                  {filteredServices.length === services.length
                    ? t.services.subtitle
                    : `${filteredServices.length} / ${services.length}`
                  }
                </p>
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {filteredServices.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                    <p className="text-sm text-gray-500">{t.services.noResults}</p>
                  </div>
                ) : (
                filteredServices.map((service) => {
                  const categoryName = categoryNames[service.categoryId] ?? '—'
                  const isSelected = selectedService?._id === service._id
                  return (
                    <button
                      key={service._id}
                      type="button"
                      onClick={() => setSelectedService(service)}
                      className={`w-full text-left p-4 rounded-xl border-2 transition-all duration-200 ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50/80 shadow-md'
                          : 'border-gray-100 bg-white hover:border-gray-200 hover:shadow-sm'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-100">
                            <Briefcase className="h-5 w-5 text-blue-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-gray-900 truncate">{service.title}</p>
                            <p className="text-xs text-gray-500 mt-0.5">{categoryName}</p>
                            <p className="text-sm font-medium text-gray-700 mt-1">
                              {formatPrice(service.price)}
                            </p>
                            {service.createdAt && (
                              <p className="text-xs text-gray-400 mt-2">
                                {t.services.createdAt}: {new Date(service.createdAt).toLocaleDateString()}
                              </p>
                            )}
                          </div>
                        </div>
                        <span
                          className={`shrink-0 inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            service.isActive
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-amber-100 text-amber-700'
                          }`}
                        >
                          {service.isActive ? t.services.active : t.services.inactive}
                        </span>
                      </div>
                    </button>
                  )
                }) )}
            </div>
          </div>

          {/* Right panel - Service details */}
          <div className="flex-1 flex flex-col rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden min-h-[500px]">
            {selectedService ? (
              <>
                {/* Header with action buttons - top right, bigger */}
                <div className="flex items-start justify-between gap-4 p-5 border-b border-gray-100 bg-gradient-to-br from-slate-50 to-gray-50">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">{t.services.serviceDetails}</h2>
                    <p className="text-sm text-gray-500 mt-0.5">{selectedService.title}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0" ref={deleteConfirmId === selectedService._id ? menuRef : undefined}>
                    <Button
                      size="default"
                      variant="outline"
                      className="h-10 px-4 gap-2"
                      onClick={() => openEdit(selectedService)}
                      disabled={!!actionLoading}
                    >
                      <Pencil className="h-4 w-4" />
                      {t.services.edit}
                    </Button>
                    {selectedService.isActive ? (
                      <Button
                        size="default"
                        variant="outline"
                        className="h-10 px-4 gap-2 text-amber-700 border-amber-200 hover:bg-amber-50 hover:border-amber-300"
                        onClick={() => handleSetStatus(selectedService._id, false)}
                        disabled={actionLoading === selectedService._id}
                      >
                        <Ban className="h-4 w-4" />
                        {t.services.setInactive}
                      </Button>
                    ) : (
                      <Button
                        size="default"
                        variant="outline"
                        className="h-10 px-4 gap-2 text-emerald-700 border-emerald-200 hover:bg-emerald-50 hover:border-emerald-300"
                        onClick={() => handleSetStatus(selectedService._id, true)}
                        disabled={actionLoading === selectedService._id}
                      >
                        <Play className="h-4 w-4" />
                        {t.services.setActive}
                      </Button>
                    )}
                    {deleteConfirmId === selectedService._id ? (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-600 whitespace-nowrap">{t.services.deleteConfirm}</span>
                        <Button
                          size="sm"
                          variant="destructive"
                          className="h-10 px-4"
                          onClick={() => handleDelete(selectedService._id)}
                          disabled={actionLoading === selectedService._id}
                        >
                          {t.services.delete}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-10 px-4"
                          onClick={() => setDeleteConfirmId(null)}
                        >
                          {t.services.cancel}
                        </Button>
                      </div>
                    ) : (
                      <Button
                        size="default"
                        variant="outline"
                        className="h-10 px-4 gap-2 text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300"
                        onClick={() => setDeleteConfirmId(selectedService._id)}
                      >
                        <Trash2 className="h-4 w-4" />
                        {t.services.delete}
                      </Button>
                    )}
                  </div>
                </div>

                {/* Image and details */}
                <div className="flex-1 overflow-y-auto">
                  <div className="w-full h-40 sm:h-44 bg-gray-50 overflow-hidden shrink-0">
                    <img
                      src={selectedService.serviceImage || DEFAULT_IMAGE}
                      alt={selectedService.title}
                      className="w-full h-full object-cover object-center"
                    />
                  </div>

                  <div className="p-6 space-y-6">
                    <div className="flex items-center gap-3">
                      <h3 className="text-2xl font-bold text-gray-900">{selectedService.title}</h3>
                      <span
                        className={`rounded-full px-3 py-1 text-sm font-medium ${
                          selectedService.isActive
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-gray-200 text-gray-700'
                        }`}
                      >
                        {selectedService.isActive ? t.services.active : t.services.inactive}
                      </span>
                    </div>

                    {selectedService.description && (
                      <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50">
                          <FileText className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 uppercase tracking-wide">{t.services.description}</p>
                          <p className="text-sm font-medium text-gray-900 whitespace-pre-wrap mt-0.5">
                            {selectedService.description}
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-100">
                          <Briefcase className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 uppercase tracking-wide">{t.services.category}</p>
                          <p className="text-sm font-semibold text-gray-900">
                            {categoryNames[selectedService.categoryId] ?? '—'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-100">
                          <Clock className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 uppercase tracking-wide">{t.services.durationMin}</p>
                          <p className="text-sm font-semibold text-gray-900">{selectedService.durationMin} min</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-100">
                          <DollarSign className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 uppercase tracking-wide">{t.services.price}</p>
                          <p className="text-sm font-semibold text-gray-900">{formatPrice(selectedService.price)}</p>
                        </div>
                      </div>
                    </div>

                    {(selectedService.branchIds ?? []).length > 0 && (
                      <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50">
                          <MapPin className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 uppercase tracking-wide">{t.services.branches}</p>
                          <p className="text-sm font-medium text-gray-900">
                            {(selectedService.branchIds ?? [])
                              .map((id) => branchNames[id] ?? id)
                              .join(', ')}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Doctor details - full info from backend */}
                    {(selectedService.doctorIds ?? []).length > 0 && (
                      <div className="space-y-4">
                        <div className="flex items-center gap-2">
                          <Stethoscope className="h-5 w-5 text-blue-600" />
                          <p className="text-sm font-semibold text-gray-900">{t.services.doctors}</p>
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2">
                          {(selectedService.doctorIds ?? []).map((doctorId) => {
                            const doctor = doctorsMap[doctorId]
                            if (!doctor) return null
                            const avatarUrl = doctor.avatarUrl || DEFAULT_AVATAR
                            return (
                              <div
                                key={doctor._id}
                                className="flex gap-4 p-4 rounded-xl border border-gray-200 bg-gradient-to-br from-slate-50 to-white"
                              >
                                <img
                                  src={avatarUrl}
                                  alt={doctor.fullName}
                                  className="h-14 w-14 rounded-xl object-cover border-2 border-gray-100 shrink-0"
                                />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <User className="h-4 w-4 text-gray-400 shrink-0" />
                                    <p className="font-semibold text-gray-900">{doctor.fullName}</p>
                                  </div>
                                  {doctor.specialty && (
                                    <p className="text-sm text-blue-600 font-medium mt-0.5">
                                      {doctor.specialty}
                                    </p>
                                  )}
                                  {doctor.username && (
                                    <p className="text-xs text-gray-500 mt-1">@{doctor.username}</p>
                                  )}
                                  {doctor.bio && (
                                    <p className="text-xs text-gray-600 mt-1 line-clamp-2">{doctor.bio}</p>
                                  )}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    {(selectedService.createdAt || selectedService.updatedAt) && (
                      <div className="flex flex-wrap gap-4 pt-2 text-xs text-gray-500 border-t border-gray-100">
                        {selectedService.createdAt && (
                          <span>
                            {t.services.createdAt}: {new Date(selectedService.createdAt).toLocaleString()}
                          </span>
                        )}
                        {selectedService.updatedAt && (
                          <span>
                            {t.services.updatedAt}: {new Date(selectedService.updatedAt).toLocaleString()}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
                <div className="w-20 h-20 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
                  <Briefcase className="h-10 w-10 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">{t.services.serviceDetails}</h3>
                <p className="text-sm text-gray-500 max-w-sm">
                  {t.services.selectServicePrompt}
                </p>
              </div>
            )}
          </div>
        </div>
        </>
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
    </div>
  )
}
