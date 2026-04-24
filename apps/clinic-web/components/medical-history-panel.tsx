'use client'

import { useEffect, useMemo, useState } from 'react'
import Cookies from 'js-cookie'
import { getApiUrl } from '@/lib/api'
import { useLanguage } from '@/contexts/language-context'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Stethoscope } from 'lucide-react'

type Entry = {
  _id: string
  name: string
  description: string
  durationDays: number
  createdAt: string
}

export default function MedicalHistoryPanel({ patientId }: { patientId: string | null | undefined }) {
  const { language } = useLanguage()
  const token = useMemo(() => Cookies.get('clinic_auth_token') || null, [])
  const apiUrl = getApiUrl()
  const [items, setItems] = useState<Entry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!patientId || !token) {
      setLoading(false)
      return
    }
    const run = async () => {
      try {
        const res = await fetch(`${apiUrl}/v1/medical-history/patient/${patientId}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        const json = await res.json()
        if (res.ok && json?.success) {
          setItems(json.data ?? [])
        } else {
          setError(json?.error ?? 'Failed to load history')
        }
      } catch (e) {
        setError((e as Error).message)
      } finally {
        setLoading(false)
      }
    }
    run()
  }, [apiUrl, patientId, token])

  const title = language === 'uz' ? 'Kasallik tarixi' : language === 'ru' ? 'История болезней' : 'Medical history'
  const dayLabel = language === 'uz' ? 'kun' : language === 'ru' ? 'дней' : 'days'

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Stethoscope className="h-5 w-5 text-blue-600" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-sm text-gray-400">Loading...</div>
        ) : error ? (
          <div className="text-sm text-gray-500">
            {language === 'uz' ? 'Kirish yo‘q yoki bo‘sh' : 'Нет доступа или пусто'}
          </div>
        ) : items.length === 0 ? (
          <div className="text-sm text-gray-500">
            {language === 'uz' ? 'Bemor hozircha tarix kiritmagan' : 'Пациент пока не заполнил историю'}
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((it) => (
              <div key={it._id} className="rounded-xl border border-gray-200 p-3 bg-gray-50/50">
                <div className="flex items-start justify-between gap-3">
                  <p className="font-semibold text-gray-900">{it.name}</p>
                  <span className="text-xs text-gray-500 whitespace-nowrap">
                    {it.durationDays} {dayLabel}
                  </span>
                </div>
                {it.description ? (
                  <p className="text-sm text-gray-600 mt-1 whitespace-pre-wrap">{it.description}</p>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
