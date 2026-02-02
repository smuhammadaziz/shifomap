'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useLanguage } from '@/contexts/language-context'
import { getApiUrl } from '@/lib/api'
import Cookies from 'js-cookie'
import { Button } from '@/components/ui/button'
import {
  Search,
  MoreVertical,
  Pencil,
  Trash2,
  Ban,
  Play,
  Eye,
  Plus,
} from 'lucide-react'
import { CreateDoctorModal, type DoctorForEdit } from '../doctors/create-doctor-modal'
import { DoctorDetailsModal } from '../doctors/doctor-details-modal'

const DEFAULT_AVATAR = 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=200&h=200&fit=crop'

interface Doctor {
  _id: string
  fullName: string
  username: string
  specialty: string
  bio: string
  avatarUrl: string | null
  branchIds: string[]
  serviceIds?: string[]
  isActive: boolean
  lastLoginAt?: string | null
  createdAt?: string
  updatedAt?: string
}

interface Branch {
  _id: string
  name: string
}

interface Service {
  _id: string
  title: string
}

interface ClinicData {
  branches?: Branch[]
  doctors?: Doctor[]
  services?: Service[]
}

function getAuthHeaders(): HeadersInit {
  const token = Cookies.get('clinic_auth_token')
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

export function DoctorsTab() {
  const { t } = useLanguage()
  const [clinic, setClinic] = useState<ClinicData | null>(null)
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editDoctor, setEditDoctor] = useState<DoctorForEdit | null>(null)
  const [detailsDoctor, setDetailsDoctor] = useState<Doctor | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [menuAnchor, setMenuAnchor] = useState<{ top: number; right: number } | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)

  const fetchMyClinic = useCallback(async () => {
    try {
      const res = await fetch(`${getApiUrl()}/v1/clinics/my-clinic`, { headers: getAuthHeaders() })
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
      if (!menuRef.current?.contains(target) && !popoverRef.current?.contains(target)) {
        setOpenMenuId(null)
        setMenuAnchor(null)
        setDeleteConfirmId(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const doctors = clinic?.doctors ?? []
  const branches = clinic?.branches ?? []
  const hasBranches = branches.length > 0
  const branchNames: Record<string, string> = (clinic?.branches ?? []).reduce(
    (acc, b) => ({ ...acc, [b._id]: b.name }),
    {}
  )
  const serviceNames: Record<string, string> = (clinic?.services ?? []).reduce(
    (acc, s) => ({ ...acc, [s._id]: s.title }),
    {}
  )

  const filteredDoctors = doctors.filter((d) => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return true
    return (
      (d.fullName ?? '').toLowerCase().includes(q) ||
      (d.username ?? '').toLowerCase().includes(q) ||
      (d.specialty ?? '').toLowerCase().includes(q)
    )
  })

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredDoctors.length) setSelectedIds(new Set())
    else setSelectedIds(new Set(filteredDoctors.map((d) => d._id)))
  }

  const handleDoctorCreated = () => {
    setModalOpen(false)
    setEditDoctor(null)
    fetchMyClinic()
  }

  const openCreate = () => {
    setEditDoctor(null)
    setModalOpen(true)
  }

  const openEdit = (doctor: Doctor) => {
    setEditDoctor({
      _id: doctor._id,
      fullName: doctor.fullName,
      username: doctor.username,
      specialty: doctor.specialty,
      bio: doctor.bio ?? '',
      branchIds: doctor.branchIds ?? [],
      isActive: doctor.isActive,
    })
    setModalOpen(true)
    setOpenMenuId(null)
    setMenuAnchor(null)
  }

  const openDetails = (doctor: Doctor) => {
    setDetailsDoctor(doctor)
    setOpenMenuId(null)
    setMenuAnchor(null)
  }

  const handleSetStatus = async (doctorId: string, isActive: boolean) => {
    setActionLoading(doctorId)
    setOpenMenuId(null)
    setMenuAnchor(null)
    try {
      const res = await fetch(
        `${getApiUrl()}/v1/clinics/my-clinic/doctors/${doctorId}/status`,
        { method: 'PATCH', headers: getAuthHeaders(), body: JSON.stringify({ isActive }) }
      )
      if (res.ok) fetchMyClinic()
    } finally {
      setActionLoading(null)
    }
  }

  const handleDelete = async (doctorId: string) => {
    setActionLoading(doctorId)
    setDeleteConfirmId(null)
    setOpenMenuId(null)
    setMenuAnchor(null)
    try {
      const res = await fetch(`${getApiUrl()}/v1/clinics/my-clinic/doctors/${doctorId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      })
      if (res.ok) {
        fetchMyClinic()
        setSelectedIds((prev) => {
          const next = new Set(prev)
          next.delete(doctorId)
          return next
        })
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

  if (!hasBranches) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50/50">
        <h2 className="text-xl font-semibold text-gray-900 text-center mb-2">{t.doctors.emptyTitle}</h2>
        <p className="text-gray-600 text-center max-w-md mb-6">{t.doctors.noBranchAlert}</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header: title + count, search, add button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h2 className="text-xl font-bold text-gray-900">
          {t.accounts.doctors} <span className="text-gray-500 font-normal">{filteredDoctors.length}</span>
        </h2>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder={t.accounts.searchPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <Button onClick={openCreate} className="shrink-0 gap-2">
            <Plus className="h-4 w-4" />
            {t.accounts.addDoctor}
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px]">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50/80">
                <th className="w-12 px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={filteredDoctors.length > 0 && selectedIds.size === filteredDoctors.length}
                    onChange={toggleSelectAll}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  {t.accounts.name}
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  {t.doctors.specialty}
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  {t.doctors.branch}
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  {t.accounts.status}
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider w-16">
                  {t.accounts.actions}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredDoctors.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-gray-500">
                    {t.doctors.emptyDesc}
                  </td>
                </tr>
              ) : (
                filteredDoctors.map((doctor) => {
                  const avatarUrl = doctor.avatarUrl || DEFAULT_AVATAR
                  const branchId = doctor.branchIds?.[0]
                  const branchName = branchId ? branchNames[branchId] ?? '—' : '—'
                  return (
                    <tr key={doctor._id} className="group hover:bg-blue-50/50 transition-colors">
                      <td className="w-12 px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(doctor._id)}
                          onChange={() => toggleSelect(doctor._id)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <img
                            src={avatarUrl}
                            alt={doctor.fullName}
                            className="h-10 w-10 rounded-lg object-cover border border-gray-200 shrink-0"
                          />
                          <div>
                            <p className="font-medium text-gray-900">{doctor.fullName}</p>
                            <p className="text-sm text-gray-500">@{doctor.username}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{doctor.specialty || '—'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{branchName}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
                            doctor.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'
                          }`}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full ${doctor.isActive ? 'bg-green-500' : 'bg-gray-500'}`} />
                          {doctor.isActive ? t.accounts.active : t.accounts.inactive}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-block" ref={openMenuId === doctor._id ? menuRef : undefined}>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 rounded-lg border border-gray-200 bg-white hover:bg-gray-50"
                            onClick={(e) => {
                              if (openMenuId === doctor._id) {
                                setOpenMenuId(null)
                                setMenuAnchor(null)
                              } else {
                                const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
                                setMenuAnchor({ top: rect.bottom + 4, right: window.innerWidth - rect.right })
                                setOpenMenuId(doctor._id)
                              }
                            }}
                            disabled={!!actionLoading}
                          >
                            <MoreVertical className="h-4 w-4 text-gray-500" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Sticky footer */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-0 left-0 right-0 lg:left-64 z-30 flex items-center justify-between gap-4 px-4 sm:px-6 py-3 border-t border-gray-200 bg-white shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
          <p className="text-sm text-gray-600">
            {t.accounts.selected}: <span className="font-medium text-gray-900">{selectedIds.size}</span>
          </p>
          <Button variant="outline" size="sm" onClick={() => setSelectedIds(new Set())}>
            {t.doctors.cancel}
          </Button>
        </div>
      )}

      {/* Popover menu */}
      {typeof document !== 'undefined' &&
        openMenuId &&
        menuAnchor &&
        (() => {
          const doctor = doctors.find((d) => d._id === openMenuId)
          if (!doctor) return null
          return createPortal(
            <div
              ref={popoverRef}
              className="fixed w-56 rounded-xl border border-gray-200 bg-white py-1.5 shadow-xl z-[9999]"
              style={{ top: menuAnchor.top, right: menuAnchor.right, left: 'auto' }}
            >
              <button
                type="button"
                className="flex w-full items-center gap-3 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                onClick={() => openDetails(doctor)}
              >
                <Eye className="h-4 w-4" />
                {t.accounts.viewDetails}
              </button>
              <button
                type="button"
                className="flex w-full items-center gap-3 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                onClick={() => openEdit(doctor)}
              >
                <Pencil className="h-4 w-4" />
                {t.accounts.edit}
              </button>
              {doctor.isActive ? (
                <button
                  type="button"
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-sm font-medium text-amber-700 hover:bg-amber-50 transition-colors"
                  onClick={() => handleSetStatus(doctor._id, false)}
                  disabled={actionLoading === doctor._id}
                >
                  <Ban className="h-4 w-4" />
                  {t.doctors.setInactive}
                </button>
              ) : (
                <button
                  type="button"
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-sm font-medium text-green-700 hover:bg-green-50 transition-colors"
                  onClick={() => handleSetStatus(doctor._id, true)}
                  disabled={actionLoading === doctor._id}
                >
                  <Play className="h-4 w-4" />
                  {t.doctors.setActive}
                </button>
              )}
              {deleteConfirmId === doctor._id ? (
                <div className="border-t border-gray-100 px-4 py-3 space-y-2.5">
                  <p className="text-xs font-medium text-gray-700">{t.doctors.deleteConfirm}</p>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="destructive"
                      className="flex-1 h-8"
                      onClick={() => handleDelete(doctor._id)}
                      disabled={actionLoading === doctor._id}
                    >
                      {t.doctors.delete}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8"
                      onClick={() => setDeleteConfirmId(null)}
                    >
                      {t.doctors.cancel}
                    </Button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 border-t border-gray-100 transition-colors"
                  onClick={() => setDeleteConfirmId(doctor._id)}
                  disabled={actionLoading === doctor._id}
                >
                  <Trash2 className="h-4 w-4" />
                  {t.doctors.delete}
                </button>
              )}
            </div>,
            document.body
          )
        })()}

      <CreateDoctorModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false)
          setEditDoctor(null)
        }}
        onSuccess={handleDoctorCreated}
        branches={branches}
        editDoctor={editDoctor}
      />

      <DoctorDetailsModal
        doctor={detailsDoctor}
        branchNames={branchNames}
        serviceNames={serviceNames}
        onClose={() => setDetailsDoctor(null)}
      />
    </div>
  )
}
