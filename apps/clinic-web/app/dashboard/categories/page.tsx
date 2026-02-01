'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useLanguage } from '@/contexts/language-context'
import { getApiUrl } from '@/lib/api'
import Cookies from 'js-cookie'
import { Button } from '@/components/ui/button'
import { FolderTree, Plus, MoreVertical, Pencil, Trash2 } from 'lucide-react'
import { CreateCategoryModal } from './create-category-modal'
import { useToast } from '@/contexts/toast-context'

interface Category {
  _id: string
  name: string
  createdAt: string
  updatedAt: string
}

interface ClinicData {
  categories?: Category[]
}

function getAuthHeaders(): HeadersInit {
  const token = Cookies.get('clinic_auth_token')
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

export default function CategoriesPage() {
  const { t } = useLanguage()
  const { toast } = useToast()
  const [clinic, setClinic] = useState<ClinicData | null>(null)
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editCategory, setEditCategory] = useState<Category | null>(null)
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

  const categories = clinic?.categories ?? []

  const handleCategoryCreated = (isEditMode: boolean) => {
    setModalOpen(false)
    setEditCategory(null)
    fetchMyClinic()
    toast(isEditMode ? t.categories.updatedSuccess : t.categories.createdSuccess)
  }

  const openCreate = () => {
    setEditCategory(null)
    setModalOpen(true)
  }

  const openEdit = (cat: Category) => {
    setEditCategory(cat)
    setModalOpen(true)
    setOpenMenuId(null)
  }

  const handleDelete = async (categoryId: string) => {
    setActionLoading(categoryId)
    setDeleteConfirmId(null)
    setOpenMenuId(null)
    try {
      const res = await fetch(
        `${getApiUrl()}/v1/clinics/my-clinic/categories/${categoryId}`,
        { method: 'DELETE', headers: getAuthHeaders() }
      )
      if (res.ok) {
        fetchMyClinic()
        toast(t.categories.deletedSuccess)
      }
    } finally {
      setActionLoading(null)
    }
  }

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString(undefined, {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    } catch {
      return iso
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
          <h1 className="text-3xl font-bold text-gray-900">{t.categories.title}</h1>
          <p className="text-gray-600 mt-1">{t.categories.subtitle}</p>
        </div>
        <Button onClick={openCreate} className="shrink-0">
          <Plus className="h-4 w-4 mr-2" />
          {t.categories.addCategory}
        </Button>
      </div>

      {categories.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-4 rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50/50">
          <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mb-6">
            <FolderTree className="h-8 w-8 text-blue-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 text-center mb-2">
            {t.categories.emptyTitle}
          </h2>
          <p className="text-gray-600 text-center max-w-md mb-8">
            {t.categories.emptyDesc}
          </p>
          <Button size="lg" onClick={openCreate}>
            <Plus className="h-5 w-5 mr-2" />
            {t.categories.addCategory}
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {categories.map((cat) => (
            <div
              key={cat._id}
              className="group relative rounded-2xl border border-gray-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50">
                    <FolderTree className="h-5 w-5 text-blue-600" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 truncate">{cat.name}</h3>
                </div>
                <div className="relative shrink-0" ref={openMenuId === cat._id ? menuRef : undefined}>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 rounded-lg hover:bg-gray-100"
                    onClick={() => setOpenMenuId(openMenuId === cat._id ? null : cat._id)}
                    disabled={!!actionLoading}
                  >
                    <MoreVertical className="h-5 w-5 text-gray-400" />
                  </Button>
                  {openMenuId === cat._id && (
                    <div className="absolute right-0 top-full mt-1 w-48 rounded-xl border border-gray-200 bg-white py-1.5 shadow-xl z-10">
                      <button
                        type="button"
                        className="flex w-full items-center gap-3 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                        onClick={() => openEdit(cat)}
                      >
                        <Pencil className="h-4 w-4" />
                        {t.categories.edit}
                      </button>
                      {deleteConfirmId === cat._id ? (
                        <div className="border-t border-gray-100 px-4 py-3 space-y-2">
                          <p className="text-xs font-medium text-gray-700">{t.categories.deleteConfirm}</p>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="destructive"
                              className="flex-1 h-8"
                              onClick={() => handleDelete(cat._id)}
                              disabled={actionLoading === cat._id}
                            >
                              {t.categories.delete}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8"
                              onClick={() => setDeleteConfirmId(null)}
                            >
                              {t.categories.cancel}
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          className="flex w-full items-center gap-3 px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 border-t border-gray-100"
                          onClick={() => setDeleteConfirmId(cat._id)}
                          disabled={actionLoading === cat._id}
                        >
                          <Trash2 className="h-4 w-4" />
                          {t.categories.delete}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div className="text-xs text-gray-500 space-y-1">
                <p>{t.categories.createdAt}: {formatDate(cat.createdAt)}</p>
                <p>{t.categories.updatedAt}: {formatDate(cat.updatedAt)}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full mt-4"
                onClick={() => openEdit(cat)}
              >
                <Pencil className="h-4 w-4 mr-1.5" />
                {t.categories.edit}
              </Button>
            </div>
          ))}
        </div>
      )}

      <CreateCategoryModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false)
          setEditCategory(null)
        }}
        onSuccess={(isEdit) => handleCategoryCreated(isEdit)}
        editCategory={editCategory}
      />
    </div>
  )
}
