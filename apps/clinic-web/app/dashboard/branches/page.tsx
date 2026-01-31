'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useLanguage } from '@/contexts/language-context'
import { getApiUrl } from '@/lib/api'
import Cookies from 'js-cookie'
import { Button } from '@/components/ui/button'
import {
  GitBranch,
  Plus,
  MapPin,
  Phone,
  MoreVertical,
  Pencil,
  Trash2,
  Ban,
  Play,
  Eye,
  Clock,
  MapPinned,
} from 'lucide-react'
import { CreateBranchModal, type BranchForEdit } from './create-branch-modal'
import { BranchDetailsModal } from './branch-details-modal'

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
}

const DAY_KEYS = ['dayMon', 'dayTue', 'dayWed', 'dayThu', 'dayFri', 'daySat', 'daySun'] as const

function getAuthHeaders(): HeadersInit {
  const token = Cookies.get('clinic_auth_token')
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

export default function BranchesPage() {
  const { t } = useLanguage()
  const [clinic, setClinic] = useState<ClinicData | null>(null)
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editBranch, setEditBranch] = useState<BranchForEdit | null>(null)
  const [detailsBranch, setDetailsBranch] = useState<Branch | null>(null)
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

  const branches = clinic?.branches ?? []
  const hasBranches = branches.length > 0

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
    setOpenMenuId(null)
  }

  const openDetails = (branch: Branch) => {
    setDetailsBranch(branch)
    setOpenMenuId(null)
  }

  const handleSetStatus = async (branchId: string, isActive: boolean) => {
    setActionLoading(branchId)
    setOpenMenuId(null)
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
    setOpenMenuId(null)
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
          <h1 className="text-3xl font-bold text-gray-900">{t.branches.title}</h1>
          <p className="text-gray-600 mt-1">{t.branches.subtitle}</p>
        </div>
        <Button onClick={openCreate} className="shrink-0">
          <Plus className="h-4 w-4 mr-2" />
          {t.branches.addBranch}
        </Button>
      </div>

      {!hasBranches ? (
        <div className="flex flex-col items-center justify-center py-16 px-4 rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50/50">
          <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mb-6">
            <GitBranch className="h-8 w-8 text-blue-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 text-center mb-2">
            {t.branches.emptyTitle}
          </h2>
          <p className="text-gray-600 text-center max-w-md mb-8">
            {t.branches.emptyDesc}
          </p>
          <Button size="lg" onClick={openCreate}>
            <Plus className="h-5 w-5 mr-2" />
            {t.branches.addBranch}
          </Button>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {branches.map((branch) => (
            <div
              key={branch._id}
              className="group relative rounded-2xl border border-gray-200 bg-white p-6 shadow-sm hover:shadow-lg transition-all duration-200"
            >
              {/* Header with Name and Menu */}
              <div className="flex items-start justify-between gap-3 mb-5">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-sm">
                      <GitBranch className="h-5 w-5 text-white" strokeWidth={2} />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 truncate">{branch.name}</h3>
                  </div>
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
                      branch.isActive
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    {branch.isActive ? t.branches.active : t.branches.inactive}
                  </span>
                </div>
                <div className="relative shrink-0" ref={openMenuId === branch._id ? menuRef : undefined}>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 rounded-lg hover:bg-gray-100"
                    onClick={() => setOpenMenuId(openMenuId === branch._id ? null : branch._id)}
                    disabled={!!actionLoading}
                  >
                    <MoreVertical className="h-5 w-5 text-gray-400" />
                  </Button>
                  {openMenuId === branch._id && (
                    <div className="absolute right-0 top-full mt-1 w-72 rounded-xl border border-gray-200 bg-white py-1.5 shadow-xl z-10">
                      <button
                        type="button"
                        className="flex w-full items-center gap-3 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                        onClick={() => openEdit(branch)}
                      >
                        <Pencil className="h-4 w-4" />
                        {t.branches.edit}
                      </button>
                      {branch.isActive ? (
                        <button
                          type="button"
                          className="flex w-full items-center gap-3 px-4 py-2.5 text-sm font-medium text-amber-700 hover:bg-amber-50 transition-colors"
                          onClick={() => handleSetStatus(branch._id, false)}
                          disabled={actionLoading === branch._id}
                        >
                          <Ban className="h-4 w-4" />
                          {t.branches.setInactive}
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="flex w-full items-center gap-3 px-4 py-2.5 text-sm font-medium text-green-700 hover:bg-green-50 transition-colors"
                          onClick={() => handleSetStatus(branch._id, true)}
                          disabled={actionLoading === branch._id}
                        >
                          <Play className="h-4 w-4" />
                          {t.branches.setActive}
                        </button>
                      )}
                      {deleteConfirmId === branch._id ? (
                        <div className="border-t border-gray-100 px-4 py-3 space-y-2.5">
                          <p className="text-xs font-medium text-gray-700">{t.branches.deleteConfirm}</p>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="destructive"
                              className="flex-1 h-8"
                              onClick={() => handleDelete(branch._id)}
                              disabled={actionLoading === branch._id}
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
                          onClick={() => setDeleteConfirmId(branch._id)}
                          disabled={actionLoading === branch._id}
                        >
                          <Trash2 className="h-4 w-4" />
                          {t.branches.delete}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Contact Info */}
              <div className="space-y-3 mb-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50">
                    <Phone className="h-4 w-4 text-blue-600" strokeWidth={2} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">
                      {t.branches.phone}
                    </p>
                    <p className="text-sm font-semibold text-gray-900">{branch.phone}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50">
                    <MapPin className="h-4 w-4 text-blue-600" strokeWidth={2} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">
                      {t.branches.address}
                    </p>
                    <p className="text-sm font-semibold text-gray-900 line-clamp-2">
                      {branch.address.street}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">{branch.address.city}</p>
                  </div>
                </div>
              </div>

              {/* Working Hours */}
              <div className="border-t border-gray-100 pt-4 mb-5">
                <div className="flex items-center gap-2 mb-3">
                  <Clock className="h-4 w-4 text-gray-400" strokeWidth={2} />
                  <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">
                    {t.branches.workingDays}
                  </p>
                </div>
                {branch.workingHours.length === 0 ? (
                  <p className="text-sm text-gray-400 italic ml-6">{t.branches.noWorkingHours}</p>
                ) : (
                  <div className="space-y-1.5 ml-6">
                    {[1, 2, 3, 4, 5, 6, 7].map((day) => {
                      const wh = branch.workingHours.find((w) => w.day === day)
                      return (
                        <div key={day} className="flex items-center justify-between text-sm">
                          <span className="text-gray-600 font-medium w-24">
                            {t.branches[DAY_KEYS[day - 1]]}
                          </span>
                          {wh ? (
                            <span className="text-gray-900 font-mono text-xs">
                              {wh.from} – {wh.to}
                            </span>
                          ) : (
                            <span className="text-gray-400 italic text-xs">{t.branches.closed}</span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-4 border-t border-gray-100">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openDetails(branch)}
                  className="flex-1"
                >
                  <Eye className="h-4 w-4 mr-1.5" strokeWidth={2} />
                  {t.branches.viewDetails}
                </Button>
                <a
                  href={`https://yandex.com/maps/?pt=${branch.address.geo.lng},${branch.address.geo.lat}&z=16`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1"
                >
                  <Button variant="outline" size="sm" className="w-full">
                    <MapPinned className="h-4 w-4 mr-1.5" strokeWidth={2} />
                    {t.branches.openInMap}
                  </Button>
                </a>
              </div>
            </div>
          ))}
        </div>
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
