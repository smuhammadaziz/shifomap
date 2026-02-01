'use client'

import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useLanguage } from '@/contexts/language-context'
import { getApiUrl } from '@/lib/api'
import Cookies from 'js-cookie'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, X } from 'lucide-react'

const PANEL_WIDTH = 'min(100%, 28rem)'
const ANIMATION_MS = 300
const OPEN_EASING = 'cubic-bezier(0.32, 0.72, 0, 1)'
const OPEN_DURATION_MS = 380

interface CreateCategoryModalProps {
  open: boolean
  onClose: () => void
  onSuccess: (isEdit: boolean) => void
  editCategory?: { _id: string; name: string } | null
}

function getAuthHeaders(): HeadersInit {
  const token = Cookies.get('clinic_auth_token')
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

export function CreateCategoryModal({
  open,
  onClose,
  onSuccess,
  editCategory,
}: CreateCategoryModalProps) {
  const { t } = useLanguage()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [name, setName] = useState('')
  const [closing, setClosing] = useState(false)

  const isEdit = !!editCategory?._id
  const visible = open || closing

  const closePanel = useCallback(() => {
    setClosing(true)
    const id = setTimeout(() => {
      onClose()
      setClosing(false)
    }, ANIMATION_MS)
    return () => clearTimeout(id)
  }, [onClose])

  useEffect(() => {
    if (!open) {
      setError('')
      return
    }
    if (editCategory) {
      setName(editCategory.name)
    } else {
      setName('')
    }
  }, [open, editCategory])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (isEdit && editCategory?._id) {
        const res = await fetch(
          `${getApiUrl()}/v1/clinics/my-clinic/categories/${editCategory._id}`,
          {
            method: 'PATCH',
            headers: getAuthHeaders(),
            body: JSON.stringify({ name: name.trim() }),
          }
        )
        const data = await res.json()
        if (!res.ok) {
          setError(data.error || 'Failed to update')
          setLoading(false)
          return
        }
      } else {
        const res = await fetch(`${getApiUrl()}/v1/clinics/my-clinic/categories`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({ name: name.trim() }),
        })
        const data = await res.json()
        if (!res.ok) {
          setError(data.error || 'Failed to create')
          setLoading(false)
          return
        }
      }
      onSuccess(isEdit)
      setLoading(false)
    } catch {
      setError('Network error')
      setLoading(false)
    }
  }

  if (!visible) return null

  const panelOpen = open && !closing

  const panelContent = (
    <div
      className="fixed inset-0 z-50 flex justify-end"
      style={{
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        minHeight: '100vh',
      }}
      aria-modal="true"
      role="dialog"
    >
      {/* Overlay - full viewport, no gap */}
      <div
        className="absolute bg-black/50"
        style={{
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          minHeight: '100vh',
          opacity: panelOpen ? 1 : 0,
          pointerEvents: panelOpen ? 'auto' : 'none',
          transition: `opacity ${OPEN_DURATION_MS}ms ${OPEN_EASING}`,
        }}
        onClick={closePanel}
        aria-hidden
      />

      {/* Side panel */}
      <div
        className="relative flex w-full max-w-[28rem] flex-col bg-white shadow-2xl"
        style={{
          width: PANEL_WIDTH,
          top: 0,
          bottom: 0,
          height: '100vh',
          minHeight: '100vh',
          transform: panelOpen ? 'translateX(0)' : 'translateX(100%)',
          opacity: panelOpen ? 1 : 0.97,
          transition: `transform ${OPEN_DURATION_MS}ms ${OPEN_EASING}, opacity ${OPEN_DURATION_MS}ms ${OPEN_EASING}`,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-gray-200 px-6 py-4">
          <h2 className="text-xl font-bold text-gray-900">
            {isEdit ? t.categories.modalEditTitle : t.categories.modalTitle}
          </h2>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={closePanel}
            disabled={loading}
            className="h-9 w-9 rounded-lg shrink-0"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto px-6 py-5">
            {error && (
              <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="category-name" className="text-sm text-gray-600">
                {t.categories.name}
              </Label>
              <Input
                id="category-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t.categories.namePlaceholder}
                required
                disabled={loading}
                className="w-full"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="shrink-0 border-t border-gray-200 px-6 py-4 flex flex-row justify-end gap-3">
            <Button type="button" variant="outline" onClick={closePanel} disabled={loading}>
              {t.categories.cancel}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              {isEdit ? t.categories.save : t.categories.create}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )

  return typeof document !== 'undefined'
    ? createPortal(panelContent, document.body)
    : null
}
