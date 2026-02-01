'use client'

import { useLanguage } from '@/contexts/language-context'
import { Button } from '@/components/ui/button'
import { X, Briefcase, FileText, MapPin, Users, Clock, DollarSign } from 'lucide-react'

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

interface ServiceDetailsModalProps {
  service: Service | null
  categoryNames: Record<string, string>
  branchNames: Record<string, string>
  doctorNames: Record<string, string>
  onClose: () => void
}

function formatPrice(price: ServicePrice): string {
  if (price.amount != null) return `${price.amount.toLocaleString()} ${price.currency}`
  if (price.minAmount != null && price.maxAmount != null)
    return `${price.minAmount.toLocaleString()} – ${price.maxAmount.toLocaleString()} ${price.currency}`
  return '—'
}

export function ServiceDetailsModal({
  service,
  categoryNames,
  branchNames,
  doctorNames,
  onClose,
}: ServiceDetailsModalProps) {
  const { t } = useLanguage()

  if (!service) return null

  const imageUrl = service.serviceImage || DEFAULT_IMAGE
  const categoryName = categoryNames[service.categoryId] ?? service.categoryId ?? '—'
  const branchNamesList = (service.branchIds ?? []).map((id) => branchNames[id] ?? id)
  const doctorNamesList = (service.doctorIds ?? []).map((id) => doctorNames[id] ?? id)

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="min-h-full flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden />
        <div
          className="relative z-10 w-full max-w-2xl rounded-2xl bg-white shadow-xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
            <h2 className="text-xl font-bold text-gray-900">{t.services.serviceDetails}</h2>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>

          <div className="max-h-[70vh] overflow-y-auto">
            <div className="aspect-video w-full bg-gray-100">
              <img
                src={imageUrl}
                alt={service.title}
                className="w-full h-full object-cover"
              />
            </div>

            <div className="p-6 space-y-6">
              <div>
                <h3 className="text-2xl font-bold text-gray-900">{service.title}</h3>
                <span
                  className={`inline-block mt-2 rounded-full px-3 py-1 text-sm font-medium ${
                    service.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  {service.isActive ? t.services.active : t.services.inactive}
                </span>
              </div>

              {service.description && (
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 shrink-0">
                    <FileText className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide">{t.services.description}</p>
                    <p className="text-sm font-medium text-gray-900 whitespace-pre-wrap">{service.description}</p>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
                  <Briefcase className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">{t.services.category}</p>
                  <p className="text-sm font-medium text-gray-900">{categoryName}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
                  <Clock className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">{t.services.durationMin}</p>
                  <p className="text-sm font-medium text-gray-900">{service.durationMin} min</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
                  <DollarSign className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">{t.services.price}</p>
                  <p className="text-sm font-medium text-gray-900">{formatPrice(service.price)}</p>
                </div>
              </div>

              {branchNamesList.length > 0 && (
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 shrink-0">
                    <MapPin className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide">{t.services.branches}</p>
                    <p className="text-sm font-medium text-gray-900">{branchNamesList.join(', ')}</p>
                  </div>
                </div>
              )}

              {doctorNamesList.length > 0 && (
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 shrink-0">
                    <Users className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide">{t.services.doctors}</p>
                    <p className="text-sm font-medium text-gray-900">{doctorNamesList.join(', ')}</p>
                  </div>
                </div>
              )}

              {(service.createdAt || service.updatedAt) && (
                <div className="flex flex-wrap gap-4 pt-2 text-xs text-gray-500">
                  {service.createdAt && (
                    <span>{t.services.createdAt}: {new Date(service.createdAt).toLocaleString()}</span>
                  )}
                  {service.updatedAt && (
                    <span>{t.services.updatedAt}: {new Date(service.updatedAt).toLocaleString()}</span>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="border-t border-gray-200 px-6 py-4 flex justify-end">
            <Button onClick={onClose}>{t.services.close}</Button>
          </div>
        </div>
      </div>
    </div>
  )
}
