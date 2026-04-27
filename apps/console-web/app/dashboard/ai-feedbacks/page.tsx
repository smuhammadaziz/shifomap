"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Cookies from "js-cookie"
import Link from "next/link"
import { getApiUrl } from "@/lib/api"
import { MessageSquare, Star } from "lucide-react"

type ConversationListItem = {
  _id: string
  patientName: string | null
  patientPhone: string | null
  title: string
  updatedAt: string
  feedbackStatus: "none" | "rated" | "dismissed"
  feedbackRating: number | null
  messagesCount: number
  lastMessage: string | null
}

export default function AiFeedbacksPage() {
  const apiUrl = getApiUrl()
  const token = useMemo(() => Cookies.get("console_auth_token") || null, [])
  const [items, setItems] = useState<ConversationListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [feedbackFilter, setFeedbackFilter] = useState<"all" | "rated" | "dismissed" | "none">("all")

  const load = useCallback(async () => {
    if (!token) return
    setLoading(true)
    try {
      const res = await fetch(`${apiUrl}/v1/ai-chat/admin/conversations?limit=80&feedback=${feedbackFilter}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const json = await res.json()
      setItems(res.ok && json?.success ? json.data?.items ?? [] : [])
    } catch {
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [apiUrl, feedbackFilter, token])

  useEffect(() => {
    load()
  }, [load])

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">AI Feedbacks</h1>
          <p className="text-sm text-slate-500 mt-1">All AI conversations + user ratings or dismisses</p>
        </div>
        <select
          value={feedbackFilter}
          onChange={(e) => setFeedbackFilter(e.target.value as "all" | "rated" | "dismissed" | "none")}
          className="h-10 rounded-lg border border-slate-300 px-3 text-sm bg-white"
        >
          <option value="all">All</option>
          <option value="rated">Rated only</option>
          <option value="dismissed">Dismissed only</option>
          <option value="none">No feedback yet</option>
        </select>
      </div>

      {loading ? (
        <div className="text-center text-slate-400 py-16">Loading...</div>
      ) : items.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-16 text-center">
          <MessageSquare className="h-10 w-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-700 font-medium">No AI conversations yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <Link
              key={item._id}
              href={`/dashboard/ai-feedbacks/${item._id}`}
              className="block rounded-2xl border border-slate-200 bg-white p-4 hover:shadow-sm transition-shadow"
            >
              <div className="flex items-start gap-3">
                <div className="h-11 w-11 rounded-full bg-slate-100 text-slate-700 font-semibold flex items-center justify-center shrink-0">
                  {(item.patientName?.[0] ?? "U").toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-slate-900 truncate">{item.patientName || "Unknown user"}</p>
                    <span className="text-xs text-slate-400">{item.patientPhone || "-"}</span>
                  </div>
                  <p className="text-sm text-slate-600 truncate mt-0.5">{item.title}</p>
                  <p className="text-xs text-slate-500 mt-1 truncate">{item.lastMessage || "No messages yet"}</p>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-xs text-slate-500">{new Date(item.updatedAt).toLocaleString()}</span>
                  <div className="mt-2 flex justify-end">
                    {item.feedbackStatus === "rated" ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-medium">
                        <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
                        {item.feedbackRating ?? 0}/5
                      </span>
                    ) : item.feedbackStatus === "dismissed" ? (
                      <span className="px-2 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-medium">
                        Closed by user
                      </span>
                    ) : (
                      <span className="px-2 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-medium">
                        Awaiting feedback
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-1">{item.messagesCount} messages</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
