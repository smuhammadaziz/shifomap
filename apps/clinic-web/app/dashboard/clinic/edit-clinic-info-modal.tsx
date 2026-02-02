'use client'

import { useState, useEffect } from 'react'
import { useLanguage } from '@/contexts/language-context'
import { getApiUrl } from '@/lib/api'
import Cookies from 'js-cookie'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { X } from 'lucide-react'

interface ClinicInfoData {
  branding?: { logoUrl: string | null; coverUrl: string | null }
  contacts?: { phone: string | null; email: string | null; telegram: string | null }
  description?: { short: string | null; full: string | null }
}

interface EditClinicInfoModalProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  initial: ClinicInfoData | null
}

function getAuthHeaders(): HeadersInit {
  const token = Cookies.get('clinic_auth_token')
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

export function EditClinicInfoModal({
  open,
  onClose,
  onSuccess,
  initial,
}: EditClinicInfoModalProps) {
  const { t } = useLanguage()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [coverUrl, setCoverUrl] = useState('')
  const [logoUrl, setLogoUrl] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [telegram, setTelegram] = useState('')
  const [shortDesc, setShortDesc] = useState('')
  const [fullDesc, setFullDesc] = useState('')

  useEffect(() => {
    if (!open) return
    setError('')
    setCoverUrl(initial?.branding?.coverUrl ?? '')
    setLogoUrl(initial?.branding?.logoUrl ?? '')
    setPhone(initial?.contacts?.phone ?? '')
    setEmail(initial?.contacts?.email ?? '')
    setTelegram(initial?.contacts?.telegram ?? '')
    setShortDesc(initial?.description?.short ?? '')
    setFullDesc(initial?.description?.full ?? '')
  }, [open, initial])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const body: {
        branding?: { logoUrl: string | null; coverUrl: string | null }
        contacts?: { phone: string | null; email: string | null; telegram: string | null }
        description?: { short: string | null; full: string | null }
      } = {
        branding: {
          coverUrl: coverUrl.trim() || null,
          logoUrl: logoUrl.trim() || null,
        },
        contacts: {
          phone: phone.trim() || null,
          email: email.trim() || null,
          telegram: telegram.trim() || null,
        },
        description: {
          short: shortDesc.trim() || null,
          full: fullDesc.trim() || null,
        },
      }
      const res = await fetch(`${getApiUrl()}/v1/clinics/my-clinic`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to update')
        return
      }
      onSuccess()
      onClose()
    } catch {
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="min-h-full flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden />
        <div
          className="relative z-10 w-full max-w-lg rounded-2xl bg-white shadow-xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
            <h2 className="text-xl font-bold text-gray-900">{t.clinicInfo.title}</h2>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                {t.clinicInfo.coverImage}
              </h3>
              <div>
                <Label htmlFor="coverUrl" className="sr-only">
                  {t.clinicInfo.coverImage}
                </Label>
                <Input
                  id="coverUrl"
                  type="url"
                  placeholder={t.clinicInfo.placeholderCover}
                  value={coverUrl}
                  onChange={(e) => setCoverUrl(e.target.value)}
                  className="w-full"
                />
              </div>
              <div>
                <Label htmlFor="logoUrl" className="sr-only">
                  {t.clinicInfo.logoImage}
                </Label>
                <Input
                  id="logoUrl"
                  type="url"
                  placeholder={t.clinicInfo.placeholderLogo}
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  className="w-full"
                />
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                {t.clinicInfo.contacts}
              </h3>
              <div>
                <Label htmlFor="phone" className="sr-only">
                  {t.clinicInfo.phone}
                </Label>
                <Input
                  id="phone"
                  type="text"
                  placeholder={t.clinicInfo.placeholderPhone}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full"
                />
              </div>
              <div>
                <Label htmlFor="email" className="sr-only">
                  {t.clinicInfo.email}
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder={t.clinicInfo.placeholderEmail}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full"
                />
              </div>
              <div>
                <Label htmlFor="telegram" className="sr-only">
                  {t.clinicInfo.telegram}
                </Label>
                <Input
                  id="telegram"
                  type="text"
                  placeholder={t.clinicInfo.placeholderTelegram}
                  value={telegram}
                  onChange={(e) => setTelegram(e.target.value)}
                  className="w-full"
                />
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                {t.clinicInfo.description}
              </h3>
              <div>
                <Label htmlFor="shortDesc" className="sr-only">
                  {t.clinicInfo.shortDescription}
                </Label>
                <Input
                  id="shortDesc"
                  type="text"
                  placeholder={t.clinicInfo.placeholderShort}
                  value={shortDesc}
                  onChange={(e) => setShortDesc(e.target.value)}
                  className="w-full"
                />
              </div>
              <div>
                <Label htmlFor="fullDesc" className="sr-only">
                  {t.clinicInfo.fullDescription}
                </Label>
                <textarea
                  id="fullDesc"
                  rows={4}
                  placeholder={t.clinicInfo.placeholderFull}
                  value={fullDesc}
                  onChange={(e) => setFullDesc(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" onClick={onClose} className="flex-1">
                {t.clinicInfo.cancel}
              </Button>
              <Button type="submit" disabled={loading} className="flex-1">
                {loading ? '...' : t.clinicInfo.save}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
