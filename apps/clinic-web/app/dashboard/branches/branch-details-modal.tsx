'use client'

import { useLanguage } from '@/contexts/language-context'
import { Button } from '@/components/ui/button'
import { MapPin, Phone, Clock, X } from 'lucide-react'

const DAY_KEYS = ['dayMon', 'dayTue', 'dayWed', 'dayThu', 'dayFri', 'daySat', 'daySun'] as const

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

interface BranchDetailsModalProps {
  branch: Branch | null
  onClose: () => void
}

export function BranchDetailsModal({ branch, onClose }: BranchDetailsModalProps) {
  const { t } = useLanguage()

  if (!branch) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="min-h-full flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden />
        <div
          className="relative z-10 w-full max-w-2xl rounded-2xl bg-white shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
            <h2 className="text-xl font-bold text-gray-900">{t.branches.branchDetails}</h2>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>

          <div className="p-6 space-y-6">
            {/* Name and Status */}
            <div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">{branch.name}</h3>
              <span
                className={`inline-block rounded-full px-3 py-1 text-sm font-medium ${
                  branch.isActive
                    ? 'bg-green-100 text-green-800'
                    : 'bg-gray-200 text-gray-700'
                }`}
              >
                {branch.isActive ? t.branches.active : t.branches.inactive}
              </span>
            </div>

            {/* Contact */}
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
                  <Phone className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">{t.branches.phone}</p>
                  <p className="text-sm font-medium text-gray-900">{branch.phone}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
                  <MapPin className="h-5 w-5 text-blue-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-gray-500 uppercase tracking-wide">{t.branches.address}</p>
                  <p className="text-sm font-medium text-gray-900">
                    {branch.address.street}, {branch.address.city}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {t.branches.coordinates}: {branch.address.geo.lat.toFixed(6)}, {branch.address.geo.lng.toFixed(6)}
                  </p>
                  <a
                    href={`https://yandex.com/maps/?pt=${branch.address.geo.lng},${branch.address.geo.lat}&z=16`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700"
                  >
                    <MapPin className="h-4 w-4" />
                    {t.branches.openInMap}
                  </a>
                </div>
              </div>
            </div>

            {/* Working Hours */}
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
                  <Clock className="h-5 w-5 text-blue-600" />
                </div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">{t.branches.workingHours}</p>
              </div>
              {branch.workingHours.length === 0 ? (
                <p className="text-sm text-gray-500 italic ml-13">{t.branches.noWorkingHours}</p>
              ) : (
                <div className="ml-13 space-y-2">
                  {[1, 2, 3, 4, 5, 6, 7].map((day) => {
                    const wh = branch.workingHours.find((w) => w.day === day)
                    return (
                      <div key={day} className="flex items-center justify-between py-1.5">
                        <span className="text-sm font-medium text-gray-700 w-32">
                          {t.branches[DAY_KEYS[day - 1]]}
                        </span>
                        {wh ? (
                          <span className="text-sm text-gray-900">
                            {wh.from} – {wh.to}
                          </span>
                        ) : (
                          <span className="text-sm text-gray-400 italic">
                            {t.branches.notWorking}
                          </span>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="border-t border-gray-200 px-6 py-4 flex justify-end">
            <Button onClick={onClose}>{t.branches.close}</Button>
          </div>
        </div>
      </div>
    </div>
  )
}
