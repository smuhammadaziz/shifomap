"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Cookies from "js-cookie"
import { ArrowLeft, Star } from "lucide-react"
import { getApiUrl } from "@/lib/api"
import { Button } from "@/components/ui/button"

type Conversation = {
  _id: string
  patientName: string | null
  patientPhone: string | null
  title: string
  feedbackStatus: "none" | "rated" | "dismissed"
  feedbackRating: number | null
  feedbackText: string | null
  feedbackAt: string | null
  updatedAt: string
}

type Message = {
  _id: string
  role: "user" | "assistant"
  text: string
  createdAt: string
}

export default function AiFeedbackDetailPage() {
  const apiUrl = getApiUrl()
  const token = useMemo(() => Cookies.get("console_auth_token") || null, [])
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [conversation, setConversation] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])

  const load = useCallback(async () => {
    if (!params.id || !token) return
    setLoading(true)
    try {
      const res = await fetch(`${apiUrl}/v1/ai-chat/admin/conversations/${params.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const json = await res.json()
      if (res.ok && json?.success) {
        setConversation(json.data.conversation ?? null)
        setMessages(json.data.messages ?? [])
      } else {
        setConversation(null)
        setMessages([])
      }
    } catch {
      setConversation(null)
      setMessages([])
    } finally {
      setLoading(false)
    }
  }, [apiUrl, params.id, token])

  useEffect(() => {
    load()
  }, [load])

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="flex items-center justify-between mb-5">
        <Button variant="outline" onClick={() => router.push("/dashboard/ai-feedbacks")}>
          <ArrowLeft className="h-4 w-4 mr-1.5" />
          Back
        </Button>
        <Button variant="outline" onClick={load}>
          Refresh
        </Button>
      </div>

      {loading ? (
        <div className="text-center text-slate-400 py-16">Loading...</div>
      ) : !conversation ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center text-slate-500">Conversation not found</div>
      ) : (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-xl font-bold text-slate-900">{conversation.title}</h1>
                <p className="text-sm text-slate-600 mt-1">
                  {conversation.patientName || "Unknown"} · {conversation.patientPhone || "-"}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Last activity: {new Date(conversation.updatedAt).toLocaleString()}
                </p>
              </div>
              <div className="text-right">
                {conversation.feedbackStatus === "rated" ? (
                  <div className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-medium">
                    <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
                    {conversation.feedbackRating ?? 0}/5
                  </div>
                ) : conversation.feedbackStatus === "dismissed" ? (
                  <div className="inline-flex items-center px-2 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-medium">
                    Closed by user
                  </div>
                ) : (
                  <div className="inline-flex items-center px-2 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-medium">
                    No feedback yet
                  </div>
                )}
                {conversation.feedbackText ? (
                  <p className="text-sm text-slate-600 mt-2 max-w-xs">{conversation.feedbackText}</p>
                ) : null}
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-4 md:p-5 space-y-3">
            {messages.map((msg) => (
              <div key={msg._id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-6 ${
                    msg.role === "user"
                      ? "bg-slate-900 text-white rounded-br-md"
                      : "bg-slate-100 text-slate-900 border border-slate-200 rounded-bl-md"
                  }`}
                >
                  <p>{msg.text}</p>
                  <p className={`mt-1 text-[11px] ${msg.role === "user" ? "text-slate-300" : "text-slate-400"}`}>
                    {new Date(msg.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
            {messages.length === 0 ? <p className="text-slate-400 text-center py-8">No messages</p> : null}
          </div>
        </div>
      )}
    </div>
  )
}
