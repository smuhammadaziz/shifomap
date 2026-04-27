"use client"

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react"
import Cookies from "js-cookie"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart3, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { getApiUrl } from "@/lib/api"

type SeriesItem = { label: string; value: number }
type DayItem = { day: string; value: number }
type AnalyticsData = {
  patientsByDay: DayItem[]
  bookingsByDay: DayItem[]
  bookingStatus: SeriesItem[]
  aiFeedback: SeriesItem[]
  clinicsByPlan: SeriesItem[]
}

export default function AnalyticsPage() {
  const apiUrl = getApiUrl()
  const token = useMemo(() => Cookies.get("console_auth_token") || null, [])
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<AnalyticsData>({
    patientsByDay: [],
    bookingsByDay: [],
    bookingStatus: [],
    aiFeedback: [],
    clinicsByPlan: [],
  })

  const load = useCallback(async () => {
    if (!token) return
    setLoading(true)
    try {
      const res = await fetch(`${apiUrl}/v1/users/analytics`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const json = await res.json()
      if (res.ok && json?.success) setData(json.data)
    } finally {
      setLoading(false)
    }
  }, [apiUrl, token])

  useEffect(() => {
    load()
  }, [load])

  const insights = useMemo(() => {
    const totalUsers14 = data.patientsByDay.reduce((s, x) => s + x.value, 0)
    const totalBookings14 = data.bookingsByDay.reduce((s, x) => s + x.value, 0)
    const peakBookings = data.bookingsByDay.reduce<DayItem | null>(
      (best, item) => (!best || item.value > best.value ? item : best),
      null
    )
    const topBookingStatus = data.bookingStatus.reduce<SeriesItem | null>(
      (best, item) => (!best || item.value > best.value ? item : best),
      null
    )
    const feedbackPending =
      data.aiFeedback.find((x) => x.label.toLowerCase() === "none")?.value ?? 0
    return { totalUsers14, totalBookings14, peakBookings, topBookingStatus, feedbackPending }
  }, [data])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Analytics</h1>
          <p className="text-slate-600 mt-1">Live platform charts from your database</p>
        </div>
        <Button variant="outline" onClick={load}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <AnswerCard question="How many new users?" answer={`${insights.totalUsers14}`} hint="Last 14 days" />
        <AnswerCard question="How many bookings?" answer={`${insights.totalBookings14}`} hint="Last 14 days" />
        <AnswerCard
          question="When peak bookings?"
          answer={insights.peakBookings ? `${insights.peakBookings.day}` : "-"}
          hint={insights.peakBookings ? `${insights.peakBookings.value} bookings` : "No data"}
        />
        <AnswerCard
          question="Which status highest?"
          answer={insights.topBookingStatus ? insights.topBookingStatus.label.replaceAll("_", " ") : "-"}
          hint={insights.topBookingStatus ? `${insights.topBookingStatus.value} bookings` : "No data"}
        />
        <AnswerCard question="What left to review?" answer={`${insights.feedbackPending}`} hint="AI chats without feedback" />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <MiniBarChartCard title="New Users (Last 14 Days)" icon={<BarChart3 className="h-4 w-4" />} data={data.patientsByDay} loading={loading} />
        <MiniBarChartCard title="Bookings (Last 14 Days)" icon={<BarChart3 className="h-4 w-4" />} data={data.bookingsByDay} loading={loading} />
        <HorizontalBarsCard title="Bookings by Status" data={data.bookingStatus} loading={loading} />
        <HorizontalBarsCard title="AI Feedback Status" data={data.aiFeedback} loading={loading} />
        <HorizontalBarsCard title="Clinics by Plan" data={data.clinicsByPlan} loading={loading} />
      </div>
    </div>
  )
}

function AnswerCard({ question, answer, hint }: { question: string; answer: string; hint: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-medium text-slate-500">{question}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold text-slate-900 capitalize">{answer}</p>
        <p className="text-xs text-slate-500 mt-1">{hint}</p>
      </CardContent>
    </Card>
  )
}

function MiniBarChartCard({
  title,
  icon,
  data,
  loading,
}: {
  title: string
  icon: ReactNode
  data: DayItem[]
  loading: boolean
}) {
  const max = Math.max(1, ...data.map((x) => x.value))
  const [hovered, setHovered] = useState<DayItem | null>(null)
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-slate-500">Loading...</p>
        ) : (
          <div className="space-y-2">
            <div className="relative h-44 rounded-xl border border-slate-200 bg-slate-50 p-3 flex items-end gap-1.5">
              {hovered ? (
                <div className="absolute left-3 top-3 rounded-lg border border-slate-200 bg-white px-2 py-1 shadow-sm text-xs">
                  <span className="font-semibold text-slate-900">{hovered.day}</span>
                  <span className="text-slate-600 ml-1">- {hovered.value}</span>
                </div>
              ) : null}
              {data.map((d) => (
                <div
                  key={d.day}
                  className="flex-1 flex flex-col items-center gap-1"
                  onMouseEnter={() => setHovered(d)}
                  onMouseLeave={() => setHovered(null)}
                >
                  <div
                    className={`w-full rounded-sm min-h-[4px] transition-all ${
                      hovered?.day === d.day ? "bg-blue-600" : "bg-slate-900/80"
                    }`}
                    style={{ height: `${Math.max(4, (d.value / max) * 120)}px` }}
                    title={`${d.day}: ${d.value}`}
                  />
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1 text-[10px] text-slate-500">
              {data.slice(-7).map((d) => (
                <span key={`l-${d.day}`} className="text-center">
                  {d.day}
                </span>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function HorizontalBarsCard({ title, data, loading }: { title: string; data: SeriesItem[]; loading: boolean }) {
  const max = Math.max(1, ...data.map((x) => x.value))
  const [hovered, setHovered] = useState<string | null>(null)
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <p className="text-sm text-slate-500">Loading...</p>
        ) : data.length === 0 ? (
          <p className="text-sm text-slate-500">No data</p>
        ) : (
          data.map((item) => (
            <div
              key={item.label}
              className="space-y-1"
              onMouseEnter={() => setHovered(item.label)}
              onMouseLeave={() => setHovered(null)}
            >
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-700 capitalize">{item.label.replaceAll("_", " ")}</span>
                <span className="font-semibold text-slate-900">
                  {item.value} ({Math.round((item.value / max) * 100)}%)
                </span>
              </div>
              <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    hovered === item.label ? "bg-blue-600" : "bg-slate-800"
                  }`}
                  style={{ width: `${(item.value / max) * 100}%` }}
                  title={`${item.label}: ${item.value}`}
                />
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}
