'use client'

import { useLanguage } from '@/contexts/language-context'
import { Button } from '@/components/ui/button'
import { X, Briefcase, FileText, MapPin, Clock, Stethoscope } from 'lucide-react'

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

interface DoctorDetailsModalProps {
  doctor: Doctor | null
  branchNames: Record<string, string>
  serviceNames?: Record<string, string>
  onClose: () => void
}

export function DoctorDetailsModal({ doctor, branchNames, serviceNames = {}, onClose }: DoctorDetailsModalProps) {
  const { t } = useLanguage()

  if (!doctor) return null

  const avatarUrl = doctor.avatarUrl || DEFAULT_AVATAR
  const branchId = doctor.branchIds?.[0]
  const branchName = branchId ? branchNames[branchId] ?? branchId : '—'
  const serviceIds = doctor.serviceIds ?? []
  const assignedServiceNames = serviceIds
    .map((id) => serviceNames[id])
    .filter(Boolean) as string[]
  const hasServices = assignedServiceNames.length > 0

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="min-h-full flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden />
        <div
          className="relative z-10 w-full max-w-2xl rounded-2xl bg-white shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
            <h2 className="text-xl font-bold text-gray-900">{t.doctors.doctorDetails}</h2>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>

          <div className="p-6 space-y-6">
            <div className="flex items-start gap-6">
              <img
                src={avatarUrl}
                alt={doctor.fullName}
                className="h-24 w-24 rounded-2xl object-cover border-2 border-gray-100 shadow-sm"
              />
              <div className="flex-1 min-w-0">
                <h3 className="text-2xl font-bold text-gray-900">{doctor.fullName}</h3>
                <span
                  className={`inline-block mt-2 rounded-full px-3 py-1 text-sm font-medium ${
                    doctor.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  {doctor.isActive ? t.doctors.active : t.doctors.inactive}
                </span>
                <p className="text-sm text-gray-500 mt-2">@{doctor.username}</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
                  <Briefcase className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">{t.doctors.specialty}</p>
                  <p className="text-sm font-medium text-gray-900">{doctor.specialty}</p>
                </div>
              </div>

              {doctor.bio && (
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 shrink-0">
                    <FileText className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide">{t.doctors.bio}</p>
                    <p className="text-sm font-medium text-gray-900">{doctor.bio}</p>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
                  <MapPin className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">{t.doctors.branch}</p>
                  <p className="text-sm font-medium text-gray-900">{branchName}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 shrink-0">
                  <Stethoscope className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">{t.services.title}</p>
                  <p className="text-sm font-medium text-gray-900">
                    {hasServices ? assignedServiceNames.join(', ') : '—'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
                  <Clock className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">{t.doctors.lastLogin}</p>
                  <p className="text-sm font-medium text-gray-900">
                    {doctor.lastLoginAt
                      ? new Date(doctor.lastLoginAt).toLocaleString()
                      : t.doctors.neverLoggedIn}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-200 px-6 py-4 flex justify-end">
            <Button onClick={onClose}>{t.doctors.close}</Button>
          </div>
        </div>
      </div>
    </div>
  )
}
