'use client'

import { useLanguage } from '@/contexts/language-context'
import { Button } from '@/components/ui/button'
import { X, User, Mail, Calendar, Shield } from 'lucide-react'

export interface Admin {
  _id: string
  role: string
  userName: string
  displayName: string
  addedAt: string
  isActive: boolean
  lastLoginAt: string | null
}

interface AdminDetailsModalProps {
  admin: Admin | null
  onClose: () => void
}

export function AdminDetailsModal({ admin, onClose }: AdminDetailsModalProps) {
  const { t } = useLanguage()

  if (!admin) return null

  const roleValue =
    admin.role === 'owner'
      ? t.accounts.roleOwner
      : admin.role === 'super_admin'
        ? t.accounts.roleSuperAdmin
        : t.accounts.admins

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="min-h-full flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden />
        <div
          className="relative z-10 w-full max-w-2xl rounded-2xl bg-white shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
            <h2 className="text-xl font-bold text-gray-900">{t.accounts.adminDetails}</h2>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>

          <div className="p-6 space-y-6">
            <div className="flex items-start gap-6">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-blue-100 text-blue-700 text-2xl font-bold">
                {admin.displayName?.charAt(0)?.toUpperCase() ?? admin.userName?.charAt(0)?.toUpperCase() ?? 'A'}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-2xl font-bold text-gray-900">{admin.displayName || admin.userName}</h3>
                <span
                  className={`inline-block mt-2 rounded-full px-3 py-1 text-sm font-medium ${
                    admin.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  {admin.isActive ? t.accounts.active : t.accounts.inactive}
                </span>
                <p className="text-sm text-gray-500 mt-2">@{admin.userName}</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-100">
                  <Shield className="h-5 w-5 text-gray-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">{t.accounts.role}</p>
                  <p className="text-sm font-medium text-gray-900">{roleValue}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-100">
                  <Mail className="h-5 w-5 text-gray-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">{t.accounts.userName}</p>
                  <p className="text-sm font-medium text-gray-900">{admin.userName}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-100">
                  <Calendar className="h-5 w-5 text-gray-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">{t.accounts.addedAt}</p>
                  <p className="text-sm font-medium text-gray-900">
                    {admin.addedAt ? new Date(admin.addedAt).toLocaleDateString() : '—'}
                  </p>
                </div>
              </div>
              {admin.lastLoginAt && (
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-100">
                    <User className="h-5 w-5 text-gray-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide">{t.accounts.lastLogin}</p>
                    <p className="text-sm font-medium text-gray-900">
                      {new Date(admin.lastLoginAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
