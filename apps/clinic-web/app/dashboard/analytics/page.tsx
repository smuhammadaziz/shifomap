'use client'

import { useSearchParams } from 'next/navigation'
import { useLanguage } from '@/contexts/language-context'
import { useCallback, useMemo, useState, useEffect } from 'react'
import { BarChart3, Star, BarChart2, CreditCard, MessageCircle } from 'lucide-react'
import Link from 'next/link'
import { StatsTab } from './stats-tab'
import { RankingTab } from './ranking-tab'
import { getApiUrl } from '@/lib/api'
import Cookies from 'js-cookie'

const TABS = [
  { id: 'stats', icon: BarChart3 },
  { id: 'ranking', icon: Star },
] as const

const TELEGRAM_USERNAME = 'shifoyol_admin'

type TabId = (typeof TABS)[number]['id']

function isValidTab(tab: string | null): tab is TabId {
  return tab === 'stats' || tab === 'ranking'
}

interface PlanData {
  type: string
}

interface ClinicResponse {
  success: boolean
  data?: { plan?: PlanData }
}

function getAuthHeaders(): HeadersInit {
  const token = Cookies.get('clinic_auth_token')
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

export default function AnalyticsPage() {
  const searchParams = useSearchParams()
  const { t } = useLanguage()
  const [planType, setPlanType] = useState<string | null>(null)
  const [planLoading, setPlanLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function fetchPlan() {
      try {
        const res = await fetch(`${getApiUrl()}/v1/clinics/my-clinic`, { headers: getAuthHeaders() })
        if (!res.ok) {
          if (!cancelled) setPlanType(null)
          return
        }
        const json: ClinicResponse = await res.json()
        if (!cancelled && json.success && json.data?.plan) {
          setPlanType(json.data.plan.type)
        } else if (!cancelled) {
          setPlanType(null)
        }
      } catch {
        if (!cancelled) setPlanType(null)
      } finally {
        if (!cancelled) setPlanLoading(false)
      }
    }
    fetchPlan()
    return () => {
      cancelled = true
    }
  }, [])

  const activeTab = useMemo(() => {
    const tab = searchParams.get('tab')
    return isValidTab(tab) ? tab : 'stats'
  }, [searchParams])

  const setTab = useCallback(
    (tab: TabId) => {
      const params = new URLSearchParams(searchParams.toString())
      params.set('tab', tab)
      return `?${params.toString()}`
    },
    [searchParams]
  )

  const tabLabels: Record<TabId, string> = useMemo(
    () => ({
      stats: t.analytics.stats,
      ranking: t.analytics.ranking,
    }),
    [t.analytics]
  )

  const isStarter = planType === 'starter'

  const pageContent = (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">{t.analytics.title}</h1>
        <p className="text-gray-600 mt-1">{t.analytics.subtitle}</p>
      </div>

      <div className="border-b border-gray-200">
        <nav className="flex gap-1" aria-label="Analytics sections">
          {TABS.map(({ id, icon: Icon }) => {
            const isActive = activeTab === id
            const href = setTab(id)
            return (
              <Link
                key={id}
                href={href}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium rounded-t-lg transition-colors -mb-px border ${
                  isActive
                    ? 'bg-white text-blue-600 border-gray-200 border-b-2 border-b-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {tabLabels[id]}
              </Link>
            )
          })}
        </nav>
      </div>

      <div className="min-h-[400px]">
        {activeTab === 'stats' && <StatsTab />}
        {activeTab === 'ranking' && <RankingTab />}
      </div>
    </div>
  )

  if (planLoading) {
    return (
      <div className="flex items-center justify-center min-h-[320px]">
        <div className="animate-pulse text-gray-500">Loading…</div>
      </div>
    )
  }

  if (isStarter) {
    return (
      <div className="relative min-h-[calc(100vh-8rem)] overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100">
        {/* Slightly blurred analytics background */}
        <div className="absolute inset-0 blur-[5px] select-none pointer-events-none opacity-30" aria-hidden>
          {pageContent}
        </div>
        {/* Centered upgrade card - integrated design */}
        <div className="relative flex items-center justify-center min-h-[calc(100vh-8rem)] p-8">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="analytics-upgrade-title"
            className="rounded-3xl border border-gray-200 bg-white/95 backdrop-blur-xl shadow-2xl p-12 w-full max-w-xl text-center"
          >
            <div className="flex justify-center mb-6">
              <div className="rounded-2xl bg-gradient-to-br from-blue-50 to-blue-100 p-6">
                <BarChart2 className="h-10 w-10 text-blue-600" />
              </div>
            </div>
            <h2 id="analytics-upgrade-title" className="text-2xl font-bold text-gray-900 mb-2">
              {t.analytics.upgradeGateTitle}
            </h2>
            <p className="text-sm text-gray-600 mb-6 max-w-lg mx-auto">
              {t.analytics.subtitle}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/dashboard/clinic?tab=plan"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700 transition-all shadow-lg hover:shadow-xl"
              >
                <CreditCard className="h-4 w-4" />
                {t.analytics.upgradeGateChangePlan}
              </Link>
              <a
                href={`https://t.me/${TELEGRAM_USERNAME}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-gray-300 bg-white px-6 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-all hover:border-gray-400"
              >
                <MessageCircle className="h-4 w-4" />
                {t.analytics.upgradeGateContactAdmin}
              </a>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return pageContent
}
