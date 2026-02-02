'use client'

import { useState, useEffect } from 'react'
import { useLanguage } from '@/contexts/language-context'
import { getApiUrl } from '@/lib/api'
import Cookies from 'js-cookie'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { X } from 'lucide-react'

function getAuthHeaders(): HeadersInit {
  const token = Cookies.get('clinic_auth_token')
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

interface CreateAdminModalProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

export function CreateAdminModal({ open, onClose, onSuccess }: CreateAdminModalProps) {
  const { t } = useLanguage()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [userName, setUserName] = useState('')
  const [password, setPassword] = useState('')

  useEffect(() => {
    if (!open) {
      setError('')
      setDisplayName('')
      setUserName('')
      setPassword('')
      return
    }
  }, [open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!displayName.trim()) {
      setError('Display name is required')
      return
    }
    if (!userName.trim()) {
      setError('Username is required')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }
    setLoading(true)
    try {
      const res = await fetch(`${getApiUrl()}/v1/clinics/my-clinic/owners`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          displayName: displayName.trim(),
          userName: userName.trim(),
          password,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to add admin')
        setLoading(false)
        return
      }
      onSuccess()
      onClose()
      setLoading(false)
    } catch {
      setError('Network error')
      setLoading(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="min-h-full flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden />
        <div
          className="relative z-10 w-full max-w-md rounded-2xl bg-white shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
            <h2 className="text-xl font-bold text-gray-900">{t.accounts.modalTitle}</h2>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>
          <p className="px-6 pt-4 text-sm text-gray-500">{t.accounts.modalDesc}</p>
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">{t.accounts.displayName}</Label>
              <Input
                type="text"
                placeholder={t.accounts.displayNamePlaceholder}
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full"
                autoComplete="name"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">{t.accounts.userName}</Label>
              <Input
                type="text"
                placeholder={t.accounts.userNamePlaceholder}
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                className="w-full"
                autoComplete="username"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">{t.accounts.password}</Label>
              <Input
                type="password"
                placeholder={t.accounts.passwordPlaceholder}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full"
                autoComplete="new-password"
                minLength={8}
              />
              <p className="text-xs text-gray-500">Min 8 characters</p>
            </div>
            <div className="flex gap-2 pt-2">
              <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
                {t.doctors.cancel}
              </Button>
              <Button type="submit" className="flex-1" disabled={loading}>
                {loading ? '...' : t.accounts.create}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
