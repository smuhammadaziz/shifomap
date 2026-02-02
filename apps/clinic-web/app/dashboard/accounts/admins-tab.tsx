'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useLanguage } from '@/contexts/language-context'
import { useToast } from '@/contexts/toast-context'
import { getApiUrl } from '@/lib/api'
import Cookies from 'js-cookie'
import { Button } from '@/components/ui/button'
import { Search, MoreVertical, Eye, Plus, Ban, Play, Trash2 } from 'lucide-react'
import { AdminDetailsModal, type Admin } from './admin-details-modal'
import { CreateAdminModal } from './create-admin-modal'

interface ClinicData {
  owners?: Array<{
    _id: string
    role: string
    userName: string
    displayName: string
    addedAt: string
    isActive: boolean
    lastLoginAt: string | null
  }>
  plan?: { limits: { maxAdmins: number } }
}

function getAuthHeaders(): HeadersInit {
  const token = Cookies.get('clinic_auth_token')
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

export function AdminsTab() {
  const { t } = useLanguage()
  const { toast } = useToast()
  const [clinic, setClinic] = useState<ClinicData | null>(null)
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [menuAnchor, setMenuAnchor] = useState<{ top: number; right: number } | null>(null)
  const [detailsAdmin, setDetailsAdmin] = useState<Admin | null>(null)
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

  const rawAdmins = clinic?.owners ?? []
  const maxAdmins = clinic?.plan?.limits?.maxAdmins ?? 1
  const isLimitReached = rawAdmins.length >= maxAdmins

  const filteredAdmins = rawAdmins.filter((a) => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return true
    return (
      (a.displayName ?? '').toLowerCase().includes(q) ||
      (a.userName ?? '').toLowerCase().includes(q)
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
    if (selectedIds.size === filteredAdmins.length) setSelectedIds(new Set())
    else setSelectedIds(new Set(filteredAdmins.map((a) => a._id)))
  }

  const openDetails = (admin: Admin) => {
    setDetailsAdmin(admin)
    setOpenMenuId(null)
    setMenuAnchor(null)
  }

  const handleAdminCreated = () => {
    setModalOpen(false)
    fetchMyClinic()
    toast(t.accounts.createSuccess)
  }

  const handleSetStatus = async (ownerId: string, isActive: boolean) => {
    setActionLoading(ownerId)
    setOpenMenuId(null)
    setMenuAnchor(null)
    try {
      const res = await fetch(
        `${getApiUrl()}/v1/clinics/my-clinic/owners/${ownerId}/status`,
        { method: 'PATCH', headers: getAuthHeaders(), body: JSON.stringify({ isActive }) }
      )
      const data = await res.json()
      if (res.ok) {
        fetchMyClinic()
        toast(isActive ? t.accounts.setActive : t.accounts.setInactive)
      } else {
        toast(data.error || 'Failed')
      }
    } finally {
      setActionLoading(null)
    }
  }

  const handleDelete = async (ownerId: string) => {
    setActionLoading(ownerId)
    setDeleteConfirmId(null)
    setOpenMenuId(null)
    setMenuAnchor(null)
    try {
      const res = await fetch(`${getApiUrl()}/v1/clinics/my-clinic/owners/${ownerId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      })
      const data = await res.json()
      if (res.ok) {
        fetchMyClinic()
        setSelectedIds((prev) => {
          const next = new Set(prev)
          next.delete(ownerId)
          return next
        })
        toast(t.accounts.deleteSuccess)
      } else {
        toast(data.error || 'Failed')
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
    <div className="space-y-4">
      {/* Header: title + count, search, add admin button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h2 className="text-xl font-bold text-gray-900">
          {t.accounts.admins} <span className="text-gray-500 font-normal">{filteredAdmins.length}</span>
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
          <Button
            onClick={() => setModalOpen(true)}
            disabled={isLimitReached}
            className="shrink-0 gap-2"
          >
            <Plus className="h-4 w-4" />
            {t.accounts.addAdmin}
          </Button>
        </div>
      </div>

      {/* Plan limit / Add admin (no API to add - show info) */}
      {isLimitReached && (
        <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
          {t.accounts.planLimitAdmins.replace('{max}', String(maxAdmins))}{' '}
          <a
            href="https://t.me/shifoyol_admin"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-blue-600 hover:underline"
          >
            {t.accounts.contactAdminToAdd}
          </a>
        </div>
      )}

      {/* Table */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px]">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50/80">
                <th className="w-12 px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={filteredAdmins.length > 0 && selectedIds.size === filteredAdmins.length}
                    onChange={toggleSelectAll}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  {t.accounts.name}
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  {t.accounts.role}
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  {t.accounts.lastLogin}
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
              {filteredAdmins.map((admin) => (
                <tr key={admin._id} className="group hover:bg-blue-50/50 transition-colors">
                  <td className="w-12 px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(admin._id)}
                      onChange={() => toggleSelect(admin._id)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-700 font-semibold text-sm">
                        {(admin.displayName || admin.userName)?.charAt(0)?.toUpperCase() ?? 'A'}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{admin.displayName || admin.userName}</p>
                        <p className="text-sm text-gray-500">@{admin.userName}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {admin.role === 'owner'
                      ? t.accounts.roleOwner
                      : admin.role === 'super_admin'
                        ? t.accounts.roleSuperAdmin
                        : t.accounts.admins}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {admin.lastLoginAt
                      ? new Date(admin.lastLoginAt).toLocaleString()
                      : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
                        admin.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'
                      }`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${admin.isActive ? 'bg-green-500' : 'bg-gray-500'}`} />
                      {admin.isActive ? t.accounts.active : t.accounts.inactive}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-block" ref={openMenuId === admin._id ? menuRef : undefined}>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 rounded-lg border border-gray-200 bg-white hover:bg-gray-50"
                        onClick={(e) => {
                          if (openMenuId === admin._id) {
                            setOpenMenuId(null)
                            setMenuAnchor(null)
                          } else {
                            const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
                            setMenuAnchor({ top: rect.bottom + 4, right: window.innerWidth - rect.right })
                            setOpenMenuId(admin._id)
                          }
                        }}
                        disabled={!!actionLoading}
                      >
                        <MoreVertical className="h-4 w-4 text-gray-500" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Sticky footer - bulk actions */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-0 left-0 right-0 lg:left-64 z-30 flex items-center justify-between gap-4 px-4 sm:px-6 py-3 border-t border-gray-200 bg-white shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
          <p className="text-sm text-gray-600">
            {t.accounts.selected}: <span className="font-medium text-gray-900">{selectedIds.size}</span>
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setSelectedIds(new Set())}>
              {t.doctors.cancel}
            </Button>
          </div>
        </div>
      )}

      {/* Popover menu */}
      {typeof document !== 'undefined' &&
        openMenuId &&
        menuAnchor &&
        (() => {
          const admin = rawAdmins.find((a) => a._id === openMenuId)
          if (!admin) return null
          const isOwner = admin.role === 'owner'
          return createPortal(
            <div
              ref={popoverRef}
              className="fixed w-56 rounded-xl border border-gray-200 bg-white py-1.5 shadow-xl z-[9999]"
              style={{ top: menuAnchor.top, right: menuAnchor.right, left: 'auto' }}
            >
              <button
                type="button"
                className="flex w-full items-center gap-3 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                onClick={() => openDetails(admin)}
              >
                <Eye className="h-4 w-4" />
                {t.accounts.viewDetails}
              </button>
              {!isOwner && (
                <>
                  {admin.isActive ? (
                    <button
                      type="button"
                      className="flex w-full items-center gap-3 px-4 py-2.5 text-sm font-medium text-amber-700 hover:bg-amber-50 transition-colors"
                      onClick={() => handleSetStatus(admin._id, false)}
                      disabled={actionLoading === admin._id}
                    >
                      <Ban className="h-4 w-4" />
                      {t.accounts.setInactive}
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="flex w-full items-center gap-3 px-4 py-2.5 text-sm font-medium text-green-700 hover:bg-green-50 transition-colors"
                      onClick={() => handleSetStatus(admin._id, true)}
                      disabled={actionLoading === admin._id}
                    >
                      <Play className="h-4 w-4" />
                      {t.accounts.setActive}
                    </button>
                  )}
                  {deleteConfirmId === admin._id ? (
                    <div className="border-t border-gray-100 px-4 py-3 space-y-2.5">
                      <p className="text-xs font-medium text-gray-700">{t.accounts.deleteConfirm}</p>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="destructive"
                          className="flex-1 h-8"
                          onClick={() => handleDelete(admin._id)}
                          disabled={actionLoading === admin._id}
                        >
                          {t.accounts.delete}
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
                      onClick={() => setDeleteConfirmId(admin._id)}
                      disabled={actionLoading === admin._id}
                    >
                      <Trash2 className="h-4 w-4" />
                      {t.accounts.delete}
                    </button>
                  )}
                </>
              )}
            </div>,
            document.body
          )
        })()}

      <AdminDetailsModal admin={detailsAdmin} onClose={() => setDetailsAdmin(null)} />

      <CreateAdminModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={handleAdminCreated}
      />
    </div>
  )
}
