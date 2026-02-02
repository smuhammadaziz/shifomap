'use client'

import dynamic from 'next/dynamic'
import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useLanguage } from '@/contexts/language-context'
import { getApiUrl } from '@/lib/api'
import Cookies from 'js-cookie'
import { Button } from '@/components/ui/button'
import {
  GitBranch,
  Plus,
  Search,
  SlidersHorizontal,
  Pencil,
  Trash2,
  Play,
  Eye,
  MapPinned,
  MoreVertical,
  Ban,
  Phone,
  MapPin,
  Clock,
} from 'lucide-react'
import { CreateBranchModal, type BranchForEdit } from './create-branch-modal'
import { BranchDetailsModal } from './branch-details-modal'

const DAY_KEYS = ['dayMon', 'dayTue', 'dayWed', 'dayThu', 'dayFri', 'daySat', 'daySun'] as const

const BranchesMap = dynamic(() => import('./branches-map').then((m) => ({ default: m.BranchesMap })), {
  ssr: false,
  loading: () => (
    <div className="rounded-2xl border border-gray-200 bg-gray-100 min-h-[400px] flex items-center justify-center text-gray-500">
      Map loading…
    </div>
  ),
})

interface Branch {
  _id: string
  name: string
  phone: string
  address: {
    city: string
    street: string
    geo: { lat: number; lng: number }
  }
  workingHours: Array<{ day: number; from: string; to: string }>
  isActive: boolean
}

interface ClinicData {
  branches?: Branch[]
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

type StatusTab = 'all' | 'active' | 'inactive'

interface BranchesPageProps {
  embedded?: boolean
}

export default function BranchesPage({ embedded }: BranchesPageProps) {
  const { t } = useLanguage()
  const [clinic, setClinic] = useState<ClinicData | null>(null)
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editBranch, setEditBranch] = useState<BranchForEdit | null>(null)
  const [detailsBranch, setDetailsBranch] = useState<Branch | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  const [statusTab, setStatusTab] = useState<StatusTab>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [cityFilter, setCityFilter] = useState<string>('')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [menuAnchor, setMenuAnchor] = useState<{ top: number; right: number } | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)

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
      const target = e.target as Node
      const inTrigger = menuRef.current?.contains(target)
      const inPopover = popoverRef.current?.contains(target)
      if (!inTrigger && !inPopover) {
        setOpenMenuId(null)
        setMenuAnchor(null)
        setDeleteConfirmId(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const rawBranches = clinic?.branches ?? []
  const maxBranches = clinic?.plan?.limits?.maxBranches ?? 1
  const isLimitReached = rawBranches.length >= maxBranches

  const cities = useMemo(
    () => Array.from(new Set(rawBranches.map((b) => b.address.city).filter(Boolean))).sort(),
    [rawBranches]
  )

  const filteredBranches = useMemo(() => {
    let list = rawBranches

    if (statusTab === 'active') list = list.filter((b) => b.isActive)
    if (statusTab === 'inactive') list = list.filter((b) => !b.isActive)

    const q = searchQuery.trim().toLowerCase()
    if (q) {
      list = list.filter(
        (b) =>
          b.name.toLowerCase().includes(q) ||
          b.phone.toLowerCase().includes(q) ||
          b.address.city.toLowerCase().includes(q) ||
          b.address.street.toLowerCase().includes(q)
      )
    }

    if (cityFilter) {
      list = list.filter((b) => b.address.city === cityFilter)
    }

    return list
  }, [rawBranches, statusTab, searchQuery, cityFilter])

  const handleBranchCreated = () => {
    setModalOpen(false)
    setEditBranch(null)
    fetchMyClinic()
  }

  const openCreate = () => {
    setEditBranch(null)
    setModalOpen(true)
  }

  const openEdit = (branch: Branch) => {
    setEditBranch(branch)
    setModalOpen(true)
  }

  const openDetails = (branch: Branch) => {
    setDetailsBranch(branch)
  }

  const handleSetStatus = async (branchId: string, isActive: boolean) => {
    setActionLoading(branchId)
    try {
      const res = await fetch(
        `${getApiUrl()}/v1/clinics/my-clinic/branches/${branchId}/status`,
        {
          method: 'PATCH',
          headers: getAuthHeaders(),
          body: JSON.stringify({ isActive }),
        }
      )
      if (res.ok) fetchMyClinic()
    } finally {
      setActionLoading(null)
    }
  }

  const handleDelete = async (branchId: string) => {
    setActionLoading(branchId)
    setDeleteConfirmId(null)
    try {
      const res = await fetch(
        `${getApiUrl()}/v1/clinics/my-clinic/branches/${branchId}`,
        { method: 'DELETE', headers: getAuthHeaders() }
      )
      if (res.ok) fetchMyClinic()
    } finally {
      setActionLoading(null)
    }
  }

  const hasBranches = rawBranches.length > 0

  const menuBranch = useMemo(
    () => (openMenuId ? rawBranches.find((b) => b._id === openMenuId) ?? null : null),
    [openMenuId, rawBranches]
  )

  const closeMenu = useCallback(() => {
    setOpenMenuId(null)
    setMenuAnchor(null)
  }, [])

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
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-md">
            <GitBranch className="h-6 w-6 text-white" strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{t.branches.title}</h1>
            <p className="text-sm text-gray-500 mt-0.5">{t.branches.subtitle}</p>
          </div>
        </div>
      )}

      {isLimitReached && (
        <div className="rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-amber-900 mb-1">
                {t.branches.planLimitReached.replace('{max}', String(maxBranches))}
              </h3>
              <p className="text-sm text-amber-700">
                {t.branches.planLimitMessage
                  .replace('{current}', String(rawBranches.length))
                  .replace('{max}', String(maxBranches))}
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
              {t.branches.contactAdmin}
            </a>
          </div>
        </div>
      )}

      {/* Two-column: left = list + add box, right = map */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-[500px]">
        {/* Left column: branch list + add box */}
        <div className="flex flex-col min-h-0">
          {hasBranches && (
            <>
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4 shrink-0">
                <div className="flex rounded-lg border border-gray-200 p-0.5 bg-gray-50/50 w-fit">
                  <button
                    type="button"
                    onClick={() => setStatusTab('all')}
                    className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      statusTab === 'all' ? 'bg-white text-blue-600 shadow-sm border border-gray-200' : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    {t.branches.viewAll} {rawBranches.length}
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatusTab('active')}
                    className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      statusTab === 'active' ? 'bg-white text-blue-600 shadow-sm border border-gray-200' : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    {t.branches.active} {rawBranches.filter((b) => b.isActive).length}
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatusTab('inactive')}
                    className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      statusTab === 'inactive' ? 'bg-white text-blue-600 shadow-sm border border-gray-200' : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    {t.branches.inactive} {rawBranches.filter((b) => !b.isActive).length}
                  </button>
                </div>
                <div className="flex items-center gap-2 flex-1">
                  <div className="relative flex-1 min-w-0">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder={t.branches.searchPlaceholder}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div className="relative">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setFiltersOpen(!filtersOpen)}
                      className={`gap-1.5 h-9 ${cityFilter ? 'border-blue-300 bg-blue-50/50' : ''}`}
                    >
                      <SlidersHorizontal className="h-4 w-4" />
                      {t.branches.filters}
                    </Button>
                    {filtersOpen && (
                      <>
                        <div className="fixed inset-0 z-10" aria-hidden onClick={() => setFiltersOpen(false)} />
                        <div className="absolute right-0 top-full mt-1 z-20 w-52 rounded-xl border border-gray-200 bg-white py-3 px-3 shadow-lg">
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{t.branches.city}</p>
                          <select
                            value={cityFilter}
                            onChange={(e) => setCityFilter(e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="">{t.branches.viewAll}</option>
                            {cities.map((city) => (
                              <option key={city} value={city}>{city}</option>
                            ))}
                          </select>
                          {cityFilter && (
                            <button type="button" onClick={() => setCityFilter('')} className="mt-2 text-sm text-blue-600 hover:underline">
                              {t.branches.cancel}
                            </button>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}

          <div className="flex-1 overflow-y-auto min-h-0 space-y-4 pr-1">
            {!hasBranches && (
              <div className="flex flex-col items-center justify-center py-12 px-4 rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50/50">
                <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center mb-4">
                  <GitBranch className="h-7 w-7 text-blue-600" />
                </div>
                <h2 className="text-lg font-semibold text-gray-900 text-center mb-1">{t.branches.emptyTitle}</h2>
                <p className="text-gray-600 text-center text-sm max-w-sm mb-2">{t.branches.emptyDesc}</p>
              </div>
            )}

            {filteredBranches.map((branch, index) => {
              const accentColors = [
                'from-blue-50 to-indigo-50 border-blue-100',
                'from-emerald-50 to-teal-50 border-emerald-100',
                'from-amber-50 to-orange-50 border-amber-100',
                'from-violet-50 to-purple-50 border-violet-100',
              ]
              const accent = accentColors[index % accentColors.length]
              return (
                <div
                  key={branch._id}
                  className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden hover:shadow-md transition-shadow"
                >
                  <div className={`relative px-4 pt-3 pb-2 border-b ${accent}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/80 border border-gray-200/80 shadow-sm">
                          <GitBranch className="h-5 w-5 text-blue-600" />
                        </div>
                        <h3 className="font-semibold text-gray-900 truncate">{branch.name}</h3>
                      </div>
                      <span
                        className={`shrink-0 inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold ${
                          branch.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'
                        }`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${branch.isActive ? 'bg-green-500' : 'bg-gray-500'}`} />
                        {branch.isActive ? t.branches.active : t.branches.inactive}
                      </span>
                    </div>
                  </div>
                  <div className="p-4 space-y-3">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Phone className="h-4 w-4 shrink-0 text-gray-400" />
                      <a href={`tel:${branch.phone}`} className="hover:text-blue-600">{branch.phone}</a>
                    </div>
                    <div className="flex items-start gap-2 text-sm text-gray-600">
                      <MapPin className="h-4 w-4 shrink-0 text-gray-400 mt-0.5" />
                      <span>{branch.address.street}, {branch.address.city}</span>
                    </div>
                    {branch.workingHours && branch.workingHours.length > 0 && (
                      <div className="pt-2 border-t border-gray-100">
                        <div className="flex items-center gap-2 mb-2">
                          <Clock className="h-4 w-4 text-gray-400" />
                          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{t.branches.workingHours}</span>
                        </div>
                        <div className="grid grid-cols-1 gap-1.5">
                          {[1, 2, 3, 4, 5, 6, 7].map((day) => {
                            const wh = branch.workingHours.find((w) => w.day === day)
                            return (
                              <div key={day} className="flex items-center justify-between text-sm">
                                <span className="text-gray-600 w-28">{t.branches[DAY_KEYS[day - 1]]}</span>
                                {wh ? (
                                  <span className="font-medium text-gray-900 tabular-nums">{wh.from} – {wh.to}</span>
                                ) : (
                                  <span className="text-gray-400 italic">{t.branches.closed}</span>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                    <div className="flex justify-end pt-1">
                      <div className="inline-block" ref={openMenuId === branch._id ? menuRef : undefined}>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-lg hover:bg-gray-100"
                          onClick={(e) => {
                            if (openMenuId === branch._id) {
                              setOpenMenuId(null)
                              setMenuAnchor(null)
                            } else {
                              const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
                              setMenuAnchor({ top: rect.bottom + 4, right: window.innerWidth - rect.right })
                              setOpenMenuId(branch._id)
                            }
                          }}
                          disabled={!!actionLoading}
                        >
                          <MoreVertical className="h-4 w-4 text-gray-500" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}

            {/* Add new branch box */}
            <button
              type="button"
              onClick={openCreate}
              disabled={isLimitReached}
              className="w-full flex flex-col items-center justify-center py-10 px-4 rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50/50 hover:border-blue-300 hover:bg-blue-50/30 transition-colors disabled:opacity-50 disabled:pointer-events-none"
            >
              <div className="w-14 h-14 rounded-full bg-white border-2 border-gray-200 flex items-center justify-center mb-3 shadow-sm">
                <Plus className="h-7 w-7 text-gray-500" />
              </div>
              <span className="text-sm font-medium text-gray-600">{t.branches.addNew}</span>
            </button>
          </div>
        </div>

        {/* Right column: map */}
        <div className="flex flex-col min-h-[400px] lg:min-h-0 lg:sticky lg:top-6">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">{t.branches.mapTitle}</p>
          <BranchesMap branches={rawBranches} className="flex-1 max-h-[700px] lg:min-h-0 lg:h-full" />
        </div>
      </div>

      {/* Popover menu - rendered in portal so it appears above fixed footer */}
      {typeof document !== 'undefined' &&
        openMenuId &&
        menuAnchor &&
        menuBranch &&
        createPortal(
          <div
            ref={popoverRef}
            className="fixed w-56 rounded-xl border border-gray-200 bg-white py-1.5 shadow-xl z-[9999]"
            style={{
              top: menuAnchor.top,
              right: menuAnchor.right,
              left: 'auto',
            }}
          >
            <button
              type="button"
              className="flex w-full items-center gap-3 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              onClick={() => {
                openDetails(menuBranch)
                closeMenu()
              }}
            >
              <Eye className="h-4 w-4" />
              {t.branches.viewDetails}
            </button>
            <a
              href={`https://yandex.com/maps/?pt=${menuBranch.address.geo.lng},${menuBranch.address.geo.lat}&z=16`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-full items-center gap-3 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              onClick={closeMenu}
            >
              <MapPinned className="h-4 w-4" />
              {t.branches.openInMap}
            </a>
            <button
              type="button"
              className="flex w-full items-center gap-3 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              onClick={() => {
                openEdit(menuBranch)
                closeMenu()
              }}
            >
              <Pencil className="h-4 w-4" />
              {t.branches.edit}
            </button>
            {menuBranch.isActive ? (
              <button
                type="button"
                className="flex w-full items-center gap-3 px-4 py-2.5 text-sm font-medium text-amber-700 hover:bg-amber-50 transition-colors"
                onClick={() => handleSetStatus(menuBranch._id, false)}
                disabled={actionLoading === menuBranch._id}
              >
                <Ban className="h-4 w-4" />
                {t.branches.setInactive}
              </button>
            ) : (
              <button
                type="button"
                className="flex w-full items-center gap-3 px-4 py-2.5 text-sm font-medium text-green-700 hover:bg-green-50 transition-colors"
                onClick={() => handleSetStatus(menuBranch._id, true)}
                disabled={actionLoading === menuBranch._id}
              >
                <Play className="h-4 w-4" />
                {t.branches.setActive}
              </button>
            )}
            {deleteConfirmId === menuBranch._id ? (
              <div className="border-t border-gray-100 px-4 py-3 space-y-2.5">
                <p className="text-xs font-medium text-gray-700">{t.branches.deleteConfirm}</p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="destructive"
                    className="flex-1 h-8"
                    onClick={() => handleDelete(menuBranch._id)}
                    disabled={actionLoading === menuBranch._id}
                  >
                    {t.branches.delete}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8"
                    onClick={() => setDeleteConfirmId(null)}
                  >
                    {t.branches.cancel}
                  </Button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                className="flex w-full items-center gap-3 px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 border-t border-gray-100 transition-colors"
                onClick={() => setDeleteConfirmId(menuBranch._id)}
                disabled={actionLoading === menuBranch._id}
              >
                <Trash2 className="h-4 w-4" />
                {t.branches.delete}
              </button>
            )}
          </div>,
          document.body
        )}

      <CreateBranchModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false)
          setEditBranch(null)
        }}
        onSuccess={handleBranchCreated}
        editBranch={editBranch}
      />

      <BranchDetailsModal
        branch={detailsBranch}
        onClose={() => setDetailsBranch(null)}
      />
    </div>
  )
}
