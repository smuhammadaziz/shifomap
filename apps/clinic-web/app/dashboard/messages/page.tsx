'use client'

import { useEffect, useMemo, useState } from 'react'
import Cookies from 'js-cookie'
import Link from 'next/link'
import { getApiUrl } from '@/lib/api'
import { useLanguage } from '@/contexts/language-context'

type Conversation = {
  _id: string
  patientId: string
  patientName?: string | null
  patientAvatar?: string | null
  lastMessage?: string | null
  lastMessageAt?: string | null
  unread: number
}

export default function MessagesListPage() {
  const { language } = useLanguage()
  const token = useMemo(() => Cookies.get('clinic_auth_token') || null, [])
  const apiUrl = getApiUrl()
  const [items, setItems] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!token) return
    const load = async () => {
      try {
        const res = await fetch(`${apiUrl}/v1/chat/doctor/conversations`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        const json = await res.json()
        setItems(res.ok && json?.success ? json.data ?? [] : [])
      } catch {
        setItems([])
      } finally {
        setLoading(false)
      }
    }
    load()
    const id = setInterval(load, 10000)
    return () => clearInterval(id)
  }, [apiUrl, token])

  const title = language === 'uz' ? 'Xabarlar' : language === 'ru' ? 'Сообщения' : 'Messages'

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        <p className="text-sm text-gray-500 mt-1">
          {language === 'uz' ? 'Bemorlar bilan yozishmalar' : 'Чаты с пациентами'}
        </p>
      </div>

      {loading ? (
        <div className="text-gray-400">Loading...</div>
      ) : items.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center text-gray-500">
          {language === 'uz' ? 'Hozircha yozishmalar yo‘q' : 'Пока нет сообщений'}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 divide-y divide-gray-100 overflow-hidden">
          {items.map((c) => (
            <Link
              key={c._id}
              href={`/dashboard/messages/${c._id}`}
              className="flex items-center gap-3 p-4 hover:bg-gray-50 transition-colors"
            >
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-semibold overflow-hidden">
                {c.patientAvatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={c.patientAvatar} alt="" className="w-full h-full object-cover" />
                ) : (
                  (c.patientName ?? '?').charAt(0).toUpperCase()
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-gray-900 truncate">{c.patientName ?? 'Patient'}</p>
                  {c.lastMessageAt ? (
                    <span className="text-xs text-gray-400">
                      {new Date(c.lastMessageAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  ) : null}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <p className={`text-sm truncate flex-1 ${c.unread > 0 ? 'text-gray-900 font-medium' : 'text-gray-500'}`}>
                    {c.lastMessage ?? (language === 'uz' ? 'Yangi yozishma' : 'Новый чат')}
                  </p>
                  {c.unread > 0 ? (
                    <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-blue-600 text-white text-[11px] font-bold">
                      {c.unread}
                    </span>
                  ) : null}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
