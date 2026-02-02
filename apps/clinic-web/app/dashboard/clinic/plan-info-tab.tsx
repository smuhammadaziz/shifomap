'use client'

import { useState, useEffect, useCallback } from 'react'
import { useLanguage } from '@/contexts/language-context'
import { getApiUrl } from '@/lib/api'
import Cookies from 'js-cookie'
import { CreditCard, GitBranch, Briefcase, Users, Calendar, MessageCircle } from 'lucide-react'

const TELEGRAM_USERNAME = 'shifoyol_admin'

interface PlanData {
  type: string
  startedAt: string
  expiresAt: string | null
  limits: {
    maxBranches: number
    maxServices: number
    maxAdmins: number
  }
}

interface ClinicData {
  plan?: PlanData
  stats?: {
    branchesCount?: number
    servicesCount?: number
  }
  owners?: unknown[]
}

function getAuthHeaders(): HeadersInit {
  const token = Cookies.get('clinic_auth_token')
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

export function PlanInfoTab() {
  const { t } = useLanguage()
  const [clinic, setClinic] = useState<ClinicData | null>(null)
  const [loading, setLoading] = useState(true)

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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[320px]">
        <div className="animate-pulse text-gray-500">Loading…</div>
      </div>
    )
  }

  const plan = clinic?.plan
  if (!plan) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-gray-50/50 p-8 text-center text-gray-600">
        {t.clinicPlan.title} — no plan data.
      </div>
    )
  }

  const planTypeLabel = plan.type === 'pro' ? 'Pro' : 'Starter'
  const limits = plan.limits
  const stats = clinic?.stats
  const branchesCount = stats?.branchesCount ?? 0
  const servicesCount = stats?.servicesCount ?? 0
  const adminsCount = clinic?.owners?.length ?? 0

  return (
    <div className="space-y-6">
      {/* Current plan card */}
      <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/80">
          <h2 className="text-lg font-semibold text-gray-900">{t.clinicPlan.currentPlan}</h2>
          <p className="text-sm text-gray-500 mt-0.5">{t.clinicPlan.planType}</p>
        </div>
        <div className="p-6">
          <div className="inline-flex items-center gap-2 rounded-xl bg-blue-50 px-4 py-2.5 border border-blue-100">
            <CreditCard className="h-5 w-5 text-blue-600" />
            <span className="text-lg font-bold text-blue-700 capitalize">{planTypeLabel}</span>
          </div>
          <div className="mt-4 flex flex-wrap gap-4 text-sm text-gray-600">
            <span className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4 text-gray-400" />
              {t.clinicPlan.startedAt}: {plan.startedAt ? new Date(plan.startedAt).toLocaleDateString() : '—'}
            </span>
            {plan.expiresAt ? (
              <span className="flex items-center gap-1.5">
                {t.clinicPlan.expiresAt}: {new Date(plan.expiresAt).toLocaleDateString()}
              </span>
            ) : (
              <span className="text-gray-500">{t.clinicPlan.noExpiry}</span>
            )}
          </div>
        </div>
      </div>

      {/* Limits grid */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">{t.clinicPlan.limits}</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-xl border border-gray-200 bg-white p-5 flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-50">
              <GitBranch className="h-6 w-6 text-emerald-600" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-500">{t.clinicPlan.maxBranches}</p>
              <p className="text-2xl font-bold text-gray-900 mt-0.5">
                {branchesCount} <span className="text-lg font-normal text-gray-400">/ {limits.maxBranches}</span>
              </p>
            </div>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-5 flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-violet-50">
              <Briefcase className="h-6 w-6 text-violet-600" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-500">{t.clinicPlan.maxServices}</p>
              <p className="text-2xl font-bold text-gray-900 mt-0.5">
                {servicesCount} <span className="text-lg font-normal text-gray-400">/ {limits.maxServices}</span>
              </p>
            </div>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-5 flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-50">
              <Users className="h-6 w-6 text-amber-600" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-500">{t.clinicPlan.maxAdmins}</p>
              <p className="text-2xl font-bold text-gray-900 mt-0.5">
                {adminsCount} <span className="text-lg font-normal text-gray-400">/ {limits.maxAdmins}</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Upgrade CTA */}
      <div className="rounded-2xl border-2 border-dashed border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 p-6 sm:p-8">
        <h3 className="text-lg font-semibold text-gray-900">{t.clinicPlan.upgradeCta}</h3>
        <p className="text-sm text-gray-600 mt-1">{t.clinicPlan.contactUs}</p>
        <a
          href={`https://t.me/${TELEGRAM_USERNAME}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 mt-4 px-5 py-2.5 rounded-xl bg-[#0088cc] text-white font-medium text-sm hover:opacity-90 transition-opacity shadow-sm"
        >
          <MessageCircle className="h-5 w-5" />
          {t.clinicPlan.telegramLabel}: @{TELEGRAM_USERNAME}
        </a>
      </div>
    </div>
  )
}
