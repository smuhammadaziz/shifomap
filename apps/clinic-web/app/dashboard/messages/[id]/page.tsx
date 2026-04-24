'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Cookies from 'js-cookie'
import { useParams, useRouter } from 'next/navigation'
import { ChevronLeft, Send, FileText } from 'lucide-react'
import { getApiUrl } from '@/lib/api'
import { useLanguage } from '@/contexts/language-context'
import Link from 'next/link'

type Message = {
  _id: string
  conversationId: string
  senderRole: 'patient' | 'doctor'
  text: string
  attachments?: string[]
  createdAt: string
}

type Conversation = {
  _id: string
  patientId: string
  patientName?: string | null
  patientAvatar?: string | null
}

export default function ChatThreadPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const id = params?.id
  const { language } = useLanguage()
  const token = useMemo(() => Cookies.get('clinic_auth_token') || null, [])
  const apiUrl = getApiUrl()

  const [conv, setConv] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  const load = useCallback(async () => {
    if (!token || !id) return
    try {
      const res = await fetch(`${apiUrl}/v1/chat/doctor/conversations/${id}/messages`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const json = await res.json()
      if (res.ok && json?.success) {
        setConv(json.data.conversation)
        setMessages(json.data.messages ?? [])
      }
    } catch {
      // noop
    }
  }, [apiUrl, token, id])

  useEffect(() => {
    load()
    const i = setInterval(load, 5000)
    return () => clearInterval(i)
  }, [load])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  const send = async () => {
    if (!token || !id || !text.trim()) return
    setSending(true)
    try {
      const res = await fetch(`${apiUrl}/v1/chat/doctor/conversations/${id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ text: text.trim() }),
      })
      const json = await res.json()
      if (res.ok && json?.success) {
        setMessages((m) => [...m, json.data])
        setText('')
      }
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-0px)] bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
        <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-full">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-semibold overflow-hidden">
          {conv?.patientAvatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={conv.patientAvatar} alt="" className="w-full h-full object-cover" />
          ) : (
            (conv?.patientName ?? '?').charAt(0).toUpperCase()
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 truncate">{conv?.patientName ?? 'Patient'}</p>
          <p className="text-xs text-gray-500">{language === 'uz' ? 'Bemor' : 'Пациент'}</p>
        </div>
        {conv?.patientId ? (
          <Link
            href={`/dashboard/my-clients`}
            className="text-sm inline-flex items-center gap-1 text-blue-600 hover:text-blue-700"
          >
            <FileText className="h-4 w-4" />
            {language === 'uz' ? 'Tarix' : 'История'}
          </Link>
        ) : null}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((m) => {
          const mine = m.senderRole === 'doctor'
          return (
            <div key={m._id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[70%] rounded-2xl px-4 py-2 shadow-sm ${
                  mine
                    ? 'bg-blue-600 text-white rounded-br-md'
                    : 'bg-white text-gray-900 rounded-bl-md border border-gray-200'
                }`}
              >
                <p className="text-sm leading-snug whitespace-pre-wrap break-words">{m.text}</p>
                <p className={`text-[10px] mt-1 text-right ${mine ? 'text-white/70' : 'text-gray-400'}`}>
                  {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      <div className="bg-white border-t border-gray-200 px-4 py-3 flex items-center gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              send()
            }
          }}
          placeholder={language === 'uz' ? 'Xabar yozing...' : 'Написать сообщение...'}
          className="flex-1 h-11 rounded-full bg-gray-100 px-4 text-sm outline-none focus:ring-2 focus:ring-blue-500"
          disabled={sending}
        />
        <button
          onClick={send}
          disabled={!text.trim() || sending}
          className="w-11 h-11 rounded-full bg-blue-600 text-white flex items-center justify-center disabled:opacity-50"
        >
          <Send className="h-5 w-5" />
        </button>
      </div>
    </div>
  )
}
