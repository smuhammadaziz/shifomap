'use client'

import { useState, useEffect, useCallback } from 'react'
import { useLanguage } from '@/contexts/language-context'
import { useToast } from '@/contexts/toast-context'
import { getApiUrl } from '@/lib/api'
import Cookies from 'js-cookie'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Phone, Mail, MessageCircle } from 'lucide-react'

const DEFAULT_COVER = 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=1200&h=320&fit=crop'
const DEFAULT_LOGO = 'https://images.unsplash.com/photo-1631217868264-5b4b0275f65f?w=200&h=200&fit=crop'

interface ClinicData {
  clinicDisplayName: string
  branding?: { logoUrl: string | null; coverUrl: string | null }
  contacts?: { phone: string | null; email: string | null; telegram: string | null }
  description?: { short: string | null; full: string | null }
}

function getAuthHeaders(): HeadersInit {
  const token = Cookies.get('clinic_auth_token')
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

export function ClinicInfoTab() {
  const { t } = useLanguage()
  const { toast } = useToast()
  const [clinic, setClinic] = useState<ClinicData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [coverUrl, setCoverUrl] = useState('')
  const [logoUrl, setLogoUrl] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [telegram, setTelegram] = useState('')
  const [shortDesc, setShortDesc] = useState('')
  const [fullDesc, setFullDesc] = useState('')

  const fetchClinic = useCallback(async () => {
    try {
      const res = await fetch(`${getApiUrl()}/v1/clinics/my-clinic`, {
        headers: getAuthHeaders(),
      })
      if (!res.ok) {
        setClinic(null)
        return
      }
      const json = await res.json()
      if (json.success && json.data) {
        const data = json.data
        setClinic(data)
        setCoverUrl(data.branding?.coverUrl ?? '')
        setLogoUrl(data.branding?.logoUrl ?? '')
        setPhone(data.contacts?.phone ?? '')
        setEmail(data.contacts?.email ?? '')
        setTelegram(data.contacts?.telegram ?? '')
        setShortDesc(data.description?.short ?? '')
        setFullDesc(data.description?.full ?? '')
      } else {
        setClinic(null)
      }
    } catch {
      setClinic(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchClinic()
  }, [fetchClinic])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      const body = {
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
      fetchClinic()
      toast(t.clinicInfo.updatedSuccess)
    } catch {
      setError('Network error')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-pulse text-gray-500">Loading…</div>
      </div>
    )
  }

  if (!clinic) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50/50">
        <p className="text-gray-600">Could not load clinic.</p>
      </div>
    )
  }

  const previewCover = coverUrl.trim() || DEFAULT_COVER
  const previewLogo = logoUrl.trim() || DEFAULT_LOGO
  const hasPhone = !!phone.trim()
  const hasEmail = !!email.trim()
  const hasTelegram = !!telegram.trim()

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full">
      {/* Left: 50% — Input fields */}
      <div className="w-full min-w-0">
        <form onSubmit={handleSubmit} className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden h-full">
          <div className="p-4 border-b border-gray-100 bg-gray-50/80">
            <h2 className="text-lg font-bold text-gray-900">{t.clinicInfo.title}</h2>
            <p className="text-sm text-gray-500 mt-0.5">{t.clinicInfo.subtitle}</p>
          </div>
          <div className="p-4 space-y-4 overflow-y-auto max-h-[calc(100vh-280px)]">
            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">{t.clinicInfo.coverImage}</Label>
              <Input
                type="url"
                placeholder={t.clinicInfo.placeholderCover}
                value={coverUrl}
                onChange={(e) => setCoverUrl(e.target.value)}
                className="w-full"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">{t.clinicInfo.logoImage}</Label>
              <Input
                type="url"
                placeholder={t.clinicInfo.placeholderLogo}
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                className="w-full"
              />
            </div>

            <div className="pt-1">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2">
                {t.clinicInfo.contacts}
              </h3>
              <div className="space-y-2">
                <Input
                  type="text"
                  placeholder={t.clinicInfo.placeholderPhone}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full"
                />
                <Input
                  type="email"
                  placeholder={t.clinicInfo.placeholderEmail}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full"
                />
                <Input
                  type="text"
                  placeholder={t.clinicInfo.placeholderTelegram}
                  value={telegram}
                  onChange={(e) => setTelegram(e.target.value)}
                  className="w-full"
                />
              </div>
            </div>

            <div className="pt-1">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2">
                {t.clinicInfo.description}
              </h3>
              <div className="space-y-2">
                <Input
                  type="text"
                  placeholder={t.clinicInfo.placeholderShort}
                  value={shortDesc}
                  onChange={(e) => setShortDesc(e.target.value)}
                  className="w-full"
                />
                <textarea
                  rows={3}
                  placeholder={t.clinicInfo.placeholderFull}
                  value={fullDesc}
                  onChange={(e) => setFullDesc(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <Button type="submit" disabled={saving} className="w-full mt-2">
              {saving ? '...' : t.clinicInfo.save}
            </Button>
          </div>
        </form>
      </div>

      {/* Right: 50% — iPhone frame, full preview with cover, logo, name, short bio, quick links (1 line), full desc */}
      <div className="w-full min-w-0 flex items-start justify-center lg:justify-center">
        <div className="w-full max-w-[300px] mx-auto">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">
            {t.clinicInfo.mobilePreview}
          </p>
          <div className="rounded-[2rem] border-[8px] border-gray-800 bg-gray-800 p-1.5 shadow-2xl w-full">
            <div className="rounded-[1.1rem] overflow-hidden bg-white flex flex-col aspect-[9/19] max-h-[70vh] w-full">
              {/* Status bar */}
              <div className="h-8 bg-white shrink-0 flex items-end justify-center pb-2">
                <div className="w-28 h-2 rounded-full bg-gray-200" />
              </div>
              {/* Scrollable content */}
              <div className="flex-1 overflow-y-auto min-h-0">
                {/* Cover */}
                <div className="relative h-36 flex-shrink-0">
                  <img
                    src={previewCover}
                    alt="Cover"
                    className="w-full h-full object-cover object-center"
                  />
                  <div className="absolute bottom-0 left-0 right-0 h-14 bg-gradient-to-t from-black/50 to-transparent" />
                </div>
                {/* Logo */}
                <div className="relative px-5 -mt-14 pb-2">
                  <div className="w-20 h-20 rounded-2xl border-4 border-white bg-white shadow-lg overflow-hidden shrink-0">
                    <img
                      src={previewLogo}
                      alt={clinic.clinicDisplayName}
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
                {/* Clinic name */}
                <div className="px-5 pb-1">
                  <h2 className="text-xl font-semibold tracking-tight text-gray-900 leading-tight">
                    {clinic.clinicDisplayName}
                  </h2>
                </div>
                {/* Short bio */}
                {shortDesc.trim() && (
                  <div className="px-5 pb-3">
                    <p className="text-sm text-gray-600 leading-relaxed">
                      {shortDesc.trim()}
                    </p>
                  </div>
                )}
                {/* Quick links — 1 line, square with borders */}
                {(hasPhone || hasEmail || hasTelegram) && (
                  <div className="px-5 pb-4 flex flex-nowrap items-center gap-2 overflow-x-auto">
                    {hasPhone && (
                      <a
                        href={`tel:${phone.trim()}`}
                        className="inline-flex items-center justify-center w-11 h-11 rounded-lg bg-blue-50 text-blue-600 border-2 border-blue-200 shadow-sm hover:bg-blue-100 hover:border-blue-300 transition-colors shrink-0"
                        title={phone.trim()}
                      >
                        <Phone className="h-5 w-5 shrink-0" />
                      </a>
                    )}
                    {hasEmail && (
                      <a
                        href={`mailto:${email.trim()}`}
                        className="inline-flex items-center justify-center w-11 h-11 rounded-lg bg-gray-50 text-gray-700 border-2 border-gray-200 shadow-sm hover:bg-gray-100 hover:border-gray-300 transition-colors shrink-0"
                        title={email.trim()}
                      >
                        <Mail className="h-5 w-5 shrink-0" />
                      </a>
                    )}
                    {hasTelegram && (
                      <a
                        href={`https://t.me/${telegram.trim().replace('@', '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center w-11 h-11 rounded-lg bg-[#e3f2fd] text-[#0088cc] border-2 border-[#0088cc]/30 shadow-sm hover:bg-[#0088cc]/10 hover:border-[#0088cc]/50 transition-colors shrink-0"
                        title={telegram.trim()}
                      >
                        <MessageCircle className="h-5 w-5 shrink-0" />
                      </a>
                    )}
                  </div>
                )}
                {/* Full description */}
                {fullDesc.trim() && (
                  <div className="px-5 pb-5">
                    <p className="text-[13px] text-gray-700 leading-relaxed whitespace-pre-wrap">
                      {fullDesc.trim()}
                    </p>
                  </div>
                )}
                {!shortDesc.trim() && !fullDesc.trim() && !hasPhone && !hasEmail && !hasTelegram && (
                  <div className="px-5 pb-5">
                    <p className="text-sm text-gray-400 italic">{t.clinicInfo.addInfoPrompt}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
