'use client'

import { useCallback, useEffect, useMemo, useState } from "react"
import Cookies from "js-cookie"
import { useAuthStore } from "@/store/auth-store"
import { useLanguage } from "@/contexts/language-context"
import { getApiUrl } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { MapPin, Phone, User, Stethoscope, Building2, Clock, CheckCircle2, XCircle, Home, MessageSquareText } from "lucide-react"

type HomeVisitItem = {
  _id: string
  patientName: string
  patientPhone: string
  doctorName: string
  doctorSpecialty: string
  clinicName: string
  addressFormatted: string
  symptoms: string[]
  notes: string
  status: "pending" | "confirmed" | "completed" | "cancelled"
  createdAt: string
}

type TabKey = "pending" | "confirmed" | "completed" | "cancelled" | "all"

export default function InvitationsPage() {
  const { language } = useLanguage()
  const user = useAuthStore((s) => s.user)
  const isDoctor = (user as { role?: string })?.role === "doctor"
  const apiUrl = getApiUrl()
  const token = Cookies.get("clinic_auth_token")

  const [loading, setLoading] = useState(true)
  const [list, setList] = useState<HomeVisitItem[]>([])
  const [tab, setTab] = useState<TabKey>("pending")
  const [actingId, setActingId] = useState<string | null>(null)

  const labels = useMemo(() => ({
    title: language === "ru" ? "Приглашения на дом" : "Uyga chaqirishlar",
    subtitle: language === "ru" ? "Заявки пациентов на вызов врача на дом" : "Bemorlarning uyga shifokor chaqirish so'rovlari",
    empty: language === "ru" ? "Заявок пока нет" : "Hozircha so'rovlar yo'q",
    address: language === "ru" ? "Адрес" : "Manzil",
    symptoms: language === "ru" ? "Симптомы" : "Alomatlar",
    notes: language === "ru" ? "Комментарий" : "Izoh",
    confirm: language === "ru" ? "Подтвердить" : "Tasdiqlash",
    complete: language === "ru" ? "Завершить" : "Yakunlash",
    cancel: language === "ru" ? "Отклонить" : "Bekor qilish",
    pending: language === "ru" ? "Новые" : "Yangi",
    confirmed: language === "ru" ? "Подтверждены" : "Tasdiqlangan",
    completed: language === "ru" ? "Завершены" : "Yakunlangan",
    cancelled: language === "ru" ? "Отклонены" : "Bekor",
    all: language === "ru" ? "Все" : "Barchasi",
    loading: language === "ru" ? "Загрузка..." : "Yuklanmoqda...",
  }), [language])

  const load = useCallback(async () => {
    if (!token) return
    setLoading(true)
    try {
      const path = isDoctor ? "/v1/home-visits-manage/doctor" : "/v1/home-visits-manage/clinic"
      const res = await fetch(apiUrl + path, { headers: { Authorization: "Bearer " + token } })
      const json = await res.json()
      setList(res.ok && json?.success ? (json.data ?? []) : [])
    } catch { setList([]) } finally { setLoading(false) }
  }, [apiUrl, token, isDoctor])

  useEffect(() => { load() }, [load])

  const action = async (id: string, path: "confirm" | "complete" | "cancel") => {
    if (!token) return
    setActingId(id)
    try {
      await fetch(apiUrl + "/v1/home-visits-manage/" + id + "/" + path, {
        method: "PATCH",
        headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
        body: path === "cancel" ? JSON.stringify({ reason: null }) : undefined,
      })
      await load()
    } finally { setActingId(null) }
  }

  const filtered = useMemo(() => tab === "all" ? list : list.filter((x) => x.status === tab), [list, tab])
  const tabs: { key: TabKey; label: string }[] = [
    { key: "pending", label: labels.pending },
    { key: "confirmed", label: labels.confirmed },
    { key: "completed", label: labels.completed },
    { key: "cancelled", label: labels.cancelled },
    { key: "all", label: labels.all },
  ]

  const statusBadge = (status: HomeVisitItem["status"]) => {
    const base = "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold"
    if (status === "pending") return <span className={base + " bg-amber-50 text-amber-800"}>{labels.pending}</span>
    if (status === "confirmed") return <span className={base + " bg-blue-50 text-blue-800"}>{labels.confirmed}</span>
    if (status === "completed") return <span className={base + " bg-emerald-50 text-emerald-800"}>{labels.completed}</span>
    return <span className={base + " bg-zinc-100 text-zinc-600"}>{labels.cancelled}</span>
  }

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleString(language === "ru" ? "ru-RU" : "uz-UZ", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })
    } catch { return iso }
  }

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-teal-50 text-teal-700">
          <Home className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight">{labels.title}</h1>
          <p className="text-sm text-gray-500 mt-1">{labels.subtitle}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {tabs.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setTab(item.key)}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
              tab === item.key ? 'bg-teal-600 text-white shadow-sm' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {item.label}
            {item.key !== 'all' ? (
              <span className="ml-1.5 opacity-80">({list.filter((x) => x.status === item.key).length})</span>
            ) : null}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-gray-500 text-sm py-12 text-center">{labels.loading}</p>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-12 text-center">
          <Home className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-600 font-medium">{labels.empty}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((item) => (
            <article key={item._id} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                <div>
                  <div className="flex items-center gap-2 text-gray-900 font-semibold text-lg">
                    <User className="h-4 w-4 text-teal-600" />
                    {item.patientName}
                  </div>
                  <a href={`tel:${item.patientPhone}`} className="inline-flex items-center gap-1.5 text-sm text-teal-700 font-medium mt-1 hover:underline">
                    <Phone className="h-3.5 w-3.5" />
                    {item.patientPhone}
                  </a>
                </div>
                <div className="flex flex-col items-end gap-2">
                  {statusBadge(item.status)}
                  <span className="text-xs text-gray-400 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatDate(item.createdAt)}
                  </span>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 text-sm">
                <div className="flex gap-2 text-gray-700">
                  <Stethoscope className="h-4 w-4 text-gray-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-gray-900">{item.doctorName}</p>
                    <p className="text-gray-500">{item.doctorSpecialty}</p>
                  </div>
                </div>
                {!isDoctor ? (
                  <div className="flex gap-2 text-gray-700">
                    <Building2 className="h-4 w-4 text-gray-400 shrink-0 mt-0.5" />
                    <p>{item.clinicName}</p>
                  </div>
                ) : null}
                <div className="sm:col-span-2 flex gap-2 text-gray-700">
                  <MapPin className="h-4 w-4 text-gray-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-0.5">{labels.address}</p>
                    <p className="font-medium text-gray-900">{item.addressFormatted}</p>
                  </div>
                </div>
              </div>
              {item.symptoms?.length > 0 ? (
                <div className="mt-4">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{labels.symptoms}</p>
                  <div className="flex flex-wrap gap-2">
                    {item.symptoms.map((s) => (
                      <span key={s} className="rounded-full bg-teal-50 text-teal-800 px-3 py-1 text-xs font-medium">{s}</span>
                    ))}
                  </div>
                </div>
              ) : null}
              {item.notes?.trim() ? (
                <div className="mt-4 rounded-xl bg-gray-50 p-3 text-sm text-gray-700 flex gap-2">
                  <MessageSquareText className="h-4 w-4 text-gray-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-gray-500 mb-1">{labels.notes}</p>
                    <p className="leading-relaxed">{item.notes}</p>
                  </div>
                </div>
              ) : null}
              {(item.status === 'pending' || item.status === 'confirmed') && (
                <div className="mt-5 flex flex-wrap gap-2 pt-4 border-t border-gray-100">
                  {item.status === 'pending' ? (
                    <Button size="sm" className="bg-teal-600 hover:bg-teal-700" disabled={actingId === item._id} onClick={() => action(item._id, 'confirm')}>
                      <CheckCircle2 className="h-4 w-4 mr-1.5" />
                      {labels.confirm}
                    </Button>
                  ) : null}
                  {item.status === 'confirmed' ? (
                    <Button size="sm" variant="outline" disabled={actingId === item._id} onClick={() => action(item._id, 'complete')}>
                      <CheckCircle2 className="h-4 w-4 mr-1.5" />
                      {labels.complete}
                    </Button>
                  ) : null}
                  <Button size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50" disabled={actingId === item._id} onClick={() => action(item._id, 'cancel')}>
                    <XCircle className="h-4 w-4 mr-1.5" />
                    {labels.cancel}
                  </Button>
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
