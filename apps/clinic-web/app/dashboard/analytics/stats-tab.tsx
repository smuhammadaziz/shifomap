'use client'

import { useState, useEffect, useCallback } from 'react'
import { useLanguage } from '@/contexts/language-context'
import { getApiUrl } from '@/lib/api'
import Cookies from 'js-cookie'
import { GitBranch, Briefcase, Users, UserCheck } from 'lucide-react'

interface ClinicData {
  branches?: { _id: string }[]
  services?: { _id: string }[]
  doctors?: { _id: string }[]
  owners?: { _id: string }[]
  stats?: {
    branchesCount?: number
    servicesCount?: number
    doctorsCount?: number
    adminsCount?: number
    bookingsTotal?: number
    completedBookings?: number
  }
}

function getAuthHeaders(): HeadersInit {
  const token = Cookies.get('clinic_auth_token')
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

// Mock weekly activity for demo (will be replaced with real bookings later)
function getMockWeeklyActivity() {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  return days.map((day) => ({
    day,
    visits: 12 + Math.floor(Math.random() * 20),
    bookings: 3 + Math.floor(Math.random() * 8),
  }))
}

const PAD = { top: 20, right: 20, bottom: 40, left: 40 }

function SimpleLineChart({
  data,
}: {
  data: { day: string; visits: number; bookings: number }[]
}) {
  const width = 600
  const height = 240
  const chartWidth = width - PAD.left - PAD.right
  const chartHeight = height - PAD.top - PAD.bottom

  const maxVal = Math.max(
    ...data.map((d) => d.visits),
    ...data.map((d) => d.bookings),
    1
  )
  const scaleY = (v: number) => chartHeight - (v / maxVal) * chartHeight
  const scaleX = (i: number) => (i / Math.max(data.length - 1, 1)) * chartWidth

  const visitsPath = data
    .map((d, i) => `${PAD.left + scaleX(i)},${PAD.top + scaleY(d.visits)}`)
    .join(' ')
  const bookingsPath = data
    .map((d, i) => `${PAD.left + scaleX(i)},${PAD.top + scaleY(d.bookings)}`)
    .join(' ')

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full h-full min-h-[240px]"
      preserveAspectRatio="xMidYMid meet"
    >
      {/* grid lines */}
      {[0.25, 0.5, 0.75].map((frac) => (
        <line
          key={frac}
          x1={PAD.left}
          y1={PAD.top + frac * chartHeight}
          x2={PAD.left + chartWidth}
          y2={PAD.top + frac * chartHeight}
          stroke="#f0f0f0"
          strokeDasharray="3 3"
          strokeWidth={1}
        />
      ))}
      {/* visits line */}
      <polyline
        points={visitsPath}
        fill="none"
        stroke="#10b981"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {data.map((d, i) => (
        <circle
          key={`v-${i}`}
          cx={PAD.left + scaleX(i)}
          cy={PAD.top + scaleY(d.visits)}
          r={4}
          fill="#10b981"
        />
      ))}
      {/* bookings line */}
      <polyline
        points={bookingsPath}
        fill="none"
        stroke="#3b82f6"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {data.map((d, i) => (
        <circle
          key={`b-${i}`}
          cx={PAD.left + scaleX(i)}
          cy={PAD.top + scaleY(d.bookings)}
          r={4}
          fill="#3b82f6"
        />
      ))}
      {/* x labels */}
      {data.map((d, i) => (
        <text
          key={d.day}
          x={PAD.left + scaleX(i)}
          y={height - 8}
          textAnchor="middle"
          fill="#6b7280"
          fontSize={10}
        >
          {d.day}
        </text>
      ))}
    </svg>
  )
}

export function StatsTab() {
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

  const branchesCount = clinic?.branches?.length ?? clinic?.stats?.branchesCount ?? 0
  const servicesCount = clinic?.services?.length ?? clinic?.stats?.servicesCount ?? 0
  const doctorsCount = clinic?.doctors?.length ?? clinic?.stats?.doctorsCount ?? 0
  const adminsCount = clinic?.owners?.length ?? clinic?.stats?.adminsCount ?? 0

  const barData = [
    { name: t.analytics.branchesLabel, count: branchesCount, fill: '#10b981' },
    { name: t.analytics.servicesLabel, count: servicesCount, fill: '#8b5cf6' },
    { name: t.analytics.doctorsLabel, count: doctorsCount, fill: '#3b82f6' },
    { name: t.analytics.adminsLabel, count: adminsCount, fill: '#f59e0b' },
  ]

  const mockWeekly = getMockWeeklyActivity()

  return (
    <div className="space-y-8">
      {/* Overview cards - real data */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
          {t.analytics.overview}
        </h3>
        <p className="text-sm text-gray-500 mb-4">{t.analytics.overviewDesc}</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-50">
                <GitBranch className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{branchesCount}</p>
                <p className="text-xs font-medium text-gray-500">{t.analytics.branchesLabel}</p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-violet-50">
                <Briefcase className="h-5 w-5 text-violet-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{servicesCount}</p>
                <p className="text-xs font-medium text-gray-500">{t.analytics.servicesLabel}</p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{doctorsCount}</p>
                <p className="text-xs font-medium text-gray-500">{t.analytics.doctorsLabel}</p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-50">
                <UserCheck className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{adminsCount}</p>
                <p className="text-xs font-medium text-gray-500">{t.analytics.adminsLabel}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bar chart - real clinic resources (CSS bars) */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">
          {t.analytics.resourcesCount}
        </h3>
        <div className="h-72 w-full space-y-4">
          {barData.map((entry, index) => {
            const maxCount = Math.max(...barData.map((d) => d.count), 1)
            const pct = maxCount > 0 ? (entry.count / maxCount) * 100 : 0
            return (
              <div key={index} className="flex items-center gap-3">
                <span className="w-20 shrink-0 text-xs font-medium text-gray-600">{entry.name}</span>
                <div className="flex-1 h-8 rounded-md bg-gray-100 overflow-hidden">
                  <div
                    className="h-full rounded-md transition-all duration-500"
                    style={{ width: `${pct}%`, backgroundColor: entry.fill }}
                  />
                </div>
                <span className="w-8 text-right text-sm font-semibold text-gray-700">{entry.count}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Line chart - mock weekly activity (SVG) */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">
          {t.analytics.weeklyActivity}
        </h3>
        <div className="flex gap-4 mb-3">
          <span className="inline-flex items-center gap-1.5 text-xs">
            <span className="h-2 w-4 rounded-sm bg-emerald-500" /> Visits
          </span>
          <span className="inline-flex items-center gap-1.5 text-xs">
            <span className="h-2 w-4 rounded-sm bg-blue-500" /> Bookings
          </span>
        </div>
        <div className="h-72 w-full">
          <SimpleLineChart data={mockWeekly} />
        </div>
      </div>
    </div>
  )
}
