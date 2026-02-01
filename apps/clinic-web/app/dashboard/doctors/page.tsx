'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useLanguage } from '@/contexts/language-context'
import { getApiUrl } from '@/lib/api'
import Cookies from 'js-cookie'
import { Button } from '@/components/ui/button'
import {
  Stethoscope,
  Plus,
  MoreVertical,
  Pencil,
  Trash2,
  Ban,
  Play,
  Eye,
} from 'lucide-react'
import { CreateDoctorModal, type DoctorForEdit } from './create-doctor-modal'
import { DoctorDetailsModal } from './doctor-details-modal'

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

export default function DoctorsPage() {
  const { t } = useLanguage()
  const [clinic, setClinic] = useState<ClinicData | null>(null)
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editDoctor, setEditDoctor] = useState<DoctorForEdit | null>(null)
  const [detailsDoctor, setDetailsDoctor] = useState<Doctor | null>(null)
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
  }

  const openDetails = (doctor: Doctor) => {
    setDetailsDoctor(doctor)
    setOpenMenuId(null)
  }

  const handleSetStatus = async (doctorId: string, isActive: boolean) => {
    setActionLoading(doctorId)
    setOpenMenuId(null)
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
    try {
      const res = await fetch(`${getApiUrl()}/v1/clinics/my-clinic/doctors/${doctorId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      })
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
          <h1 className="text-3xl font-bold text-gray-900">{t.doctors.title}</h1>
          <p className="text-gray-600 mt-1">{t.doctors.subtitle}</p>
        </div>
        <Button onClick={openCreate} className="shrink-0">
          <Plus className="h-4 w-4 mr-2" />
          {t.doctors.addDoctor}
        </Button>
      </div>

      {!hasBranches ? (
        <div className="flex flex-col items-center justify-center py-16 px-4 rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50/50">
          <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mb-6">
            <Stethoscope className="h-8 w-8 text-blue-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 text-center mb-2">
            {t.doctors.emptyTitle}
          </h2>
          <p className="text-gray-600 text-center max-w-md mb-4">
            {t.doctors.emptyDesc}
          </p>
          <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800 max-w-md text-center mb-6">
            {t.doctors.noBranchAlert}
          </div>
          <p className="text-sm text-gray-500 mb-6">
            {t.doctors.addDoctor} — {t.doctors.noBranchAlert}
          </p>
        </div>
      ) : doctors.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-4 rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50/50">
          <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mb-6">
            <Stethoscope className="h-8 w-8 text-blue-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 text-center mb-2">
            {t.doctors.emptyTitle}
          </h2>
          <p className="text-gray-600 text-center max-w-md mb-8">
            {t.doctors.emptyDesc}
          </p>
          <Button size="lg" onClick={openCreate}>
            <Plus className="h-5 w-5 mr-2" />
            {t.doctors.addDoctor}
          </Button>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {doctors.map((doctor) => {
            const avatarUrl = doctor.avatarUrl || DEFAULT_AVATAR
            const branchId = doctor.branchIds?.[0]
            const branchName = branchId ? branchNames[branchId] ?? '—' : '—'
            return (
              <div
                key={doctor._id}
                className="group relative rounded-2xl border border-gray-200 bg-white p-6 shadow-sm hover:shadow-lg transition-all duration-200"
              >
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <img
                      src={avatarUrl}
                      alt={doctor.fullName}
                      className="h-14 w-14 rounded-xl object-cover border-2 border-gray-100 shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <h3 className="text-lg font-bold text-gray-900 truncate">{doctor.fullName}</h3>
                      <p className="text-sm text-gray-600 truncate">{doctor.specialty}</p>
                      <span
                        className={`inline-flex mt-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          doctor.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200 text-gray-600'
                        }`}
                      >
                        {doctor.isActive ? t.doctors.active : t.doctors.inactive}
                      </span>
                    </div>
                  </div>
                  <div className="relative shrink-0" ref={openMenuId === doctor._id ? menuRef : undefined}>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 rounded-lg hover:bg-gray-100"
                      onClick={() => setOpenMenuId(openMenuId === doctor._id ? null : doctor._id)}
                      disabled={!!actionLoading}
                    >
                      <MoreVertical className="h-5 w-5 text-gray-400" />
                    </Button>
                    {openMenuId === doctor._id && (
                      <div className="absolute right-0 top-full mt-1 w-72 rounded-xl border border-gray-200 bg-white py-1.5 shadow-xl z-10">
                        <button
                          type="button"
                          className="flex w-full items-center gap-3 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                          onClick={() => openDetails(doctor)}
                        >
                          <Eye className="h-4 w-4" />
                          {t.doctors.viewDetails}
                        </button>
                        <button
                          type="button"
                          className="flex w-full items-center gap-3 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                          onClick={() => openEdit(doctor)}
                        >
                          <Pencil className="h-4 w-4" />
                          {t.doctors.edit}
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
                      </div>
                    )}
                  </div>
                </div>

                {doctor.bio && (
                  <p className="text-sm text-gray-600 line-clamp-2 mb-4">{doctor.bio}</p>
                )}
                <p className="text-xs text-gray-500 mb-4">
                  {t.doctors.branch}: {branchName}
                </p>

                <div className="flex gap-2 pt-4 border-t border-gray-100">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openDetails(doctor)}
                    className="flex-1"
                  >
                    <Eye className="h-4 w-4 mr-1.5" strokeWidth={2} />
                    {t.doctors.viewDetails}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => openEdit(doctor)} className="flex-1">
                    <Pencil className="h-4 w-4 mr-1.5" strokeWidth={2} />
                    {t.doctors.edit}
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      )}

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
