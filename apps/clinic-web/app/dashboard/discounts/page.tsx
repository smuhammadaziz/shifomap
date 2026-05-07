'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Cookies from 'js-cookie'
import { getApiUrl } from '@/lib/api'
import { useLanguage } from '@/contexts/language-context'
import { Button } from '@/components/ui/button'
import { useToast } from '@/contexts/toast-context'
import { Tags, Trash2, Plus } from 'lucide-react'

interface Service {
  _id: string
  title: string
  price: { amount?: number; minAmount?: number; maxAmount?: number; currency: string }
  isActive?: boolean
}

function priceLabel(p: Service['price'], lang: 'uz' | 'ru' | 'en'): string {
  if (p?.amount != null) return `${p.amount.toLocaleString()} ${p.currency}`
  if (p?.minAmount != null && p?.maxAmount != null) return `${p.minAmount.toLocaleString()} – ${p.maxAmount.toLocaleString()} ${p.currency}`
  if (p?.minAmount != null) return `${lang === 'uz' ? 'dan' : lang === 'ru' ? 'от' : 'from'} ${p.minAmount.toLocaleString()} ${p.currency}`
  if (p?.maxAmount != null) return `${lang === 'uz' ? 'gacha' : lang === 'ru' ? 'до' : 'up to'} ${p.maxAmount.toLocaleString()} ${p.currency}`
  return p?.currency ?? ''
}

function originalAmountFor(p: Service['price']): number | null {
  if (p?.amount != null) return p.amount
  if (p?.maxAmount != null) return p.maxAmount
  if (p?.minAmount != null) return p.minAmount
  return null
}

interface ClinicData {
  services?: Service[]
}

interface DiscountRow {
  _id: string
  serviceId: string
  serviceTitle: string
  originalAmount: number
  discountedAmount: number
  currency: string
  expiresAt: string
  posterUrl: string | null
  title: string | null
  percentOff: number
  isExpired?: boolean
}

function authHeaders(): HeadersInit {
  const token = Cookies.get('clinic_auth_token')
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

export default function DiscountsPage() {
  const apiUrl = getApiUrl()
  const { t, language } = useLanguage()
  const { toast } = useToast()
  const [clinic, setClinic] = useState<ClinicData | null>(null)
  const [discounts, setDiscounts] = useState<DiscountRow[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [serviceId, setServiceId] = useState('')
  const [discounted, setDiscounted] = useState('')
  const [expiresAt, setExpiresAt] = useState('')
  const [posterUrl, setPosterUrl] = useState('')
  const [title, setTitle] = useState('')

  const selected = useMemo(() => clinic?.services?.find((s) => s._id === serviceId), [clinic, serviceId])
  const originalAmount = selected ? originalAmountFor(selected.price) : null

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [cRes, dRes] = await Promise.all([
        fetch(`${apiUrl}/v1/clinics/my-clinic`, { headers: authHeaders() }),
        fetch(`${apiUrl}/v1/discounts/clinics/me`, { headers: authHeaders() }),
      ])
      const cJson = await cRes.json()
      const dJson = await dRes.json()
      if (cRes.ok && cJson?.success) setClinic(cJson.data as ClinicData)
      else setClinic(null)
      if (dRes.ok && dJson?.success) setDiscounts(dJson.data?.items ?? [])
      else setDiscounts([])
    } catch {
      setClinic(null)
      setDiscounts([])
    } finally {
      setLoading(false)
    }
  }, [apiUrl])

  useEffect(() => {
    load()
  }, [load])

  const onCreate = async () => {
    if (!serviceId || !expiresAt) {
      toast(
        language === 'uz' ? 'Xizmat va muddatni tanlang' : 'Выберите услугу и дату окончания',
        'error'
      )
      return
    }
    const d = parseFloat(discounted.replace(',', '.'))
    if (!Number.isFinite(d) || d <= 0) {
      toast(language === 'uz' ? 'Chegirma narxini kiriting' : 'Введите цену со скидкой', 'error')
      return
    }
    setCreating(true)
    try {
      const body: Record<string, unknown> = {
        serviceId,
        discountedAmount: d,
        expiresAt: new Date(expiresAt).toISOString(),
      }
      if (posterUrl.trim()) body.posterUrl = posterUrl.trim()
      if (title.trim()) body.title = title.trim()
      const res = await fetch(`${apiUrl}/v1/discounts/clinics/me`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(body),
      })
      const json = await res.json()
      if (!res.ok || !json?.success) {
        throw new Error(json?.error || 'Failed')
      }
      toast(language === 'uz' ? 'Saqlandi' : 'Сохранено')
      setDiscounted('')
      setExpiresAt('')
      setPosterUrl('')
      setTitle('')
      load()
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Failed', 'error')
    } finally {
      setCreating(false)
    }
  }

  const onDelete = async (id: string) => {
    if (!confirm(language === 'uz' ? "O'chirilsinmi?" : 'Удалить?')) return
    try {
      const res = await fetch(`${apiUrl}/v1/discounts/clinics/me/${id}`, {
        method: 'DELETE',
        headers: authHeaders(),
      })
      const json = await res.json()
      if (!res.ok || !json?.success) throw new Error(json?.error || 'Failed')
      load()
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Failed', 'error')
    }
  }

  if (loading) {
    return <div className="p-8 text-gray-500">Loading…</div>
  }

  const services = (clinic?.services ?? []).filter((s) => s.isActive !== false && originalAmountFor(s.price) != null)
  const lang = (language as 'uz' | 'ru' | 'en') ?? 'uz'

  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
          <Tags className="h-8 w-8 text-blue-600" />
          {t.sidebar.discounts}
        </h1>
        <p className="text-gray-600 mt-1">
          {language === 'uz'
            ? 'Xizmat uchun chegirma narx va poster (ixtiyoriy)'
            : 'Скидка на услугу, опционально постер'}
        </p>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
        <h2 className="font-semibold text-gray-900 flex items-center gap-2">
          <Plus className="h-4 w-4" />
          {language === 'uz' ? 'Yangi chegirma' : 'Новая скидка'}
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="text-xs text-gray-500">{language === 'uz' ? 'Xizmat' : 'Услуга'}</label>
            <select
              className="mt-1 w-full border border-gray-300 rounded-lg h-10 px-2 text-sm"
              value={serviceId}
              onChange={(e) => setServiceId(e.target.value)}
            >
              <option value="">{language === 'uz' ? 'Tanlang' : 'Выберите'}</option>
              {services.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.title} — {priceLabel(s.price, lang)}
                </option>
              ))}
            </select>
            {(clinic?.services?.length ?? 0) > 0 && services.length === 0 ? (
              <p className="text-xs text-amber-600 mt-2">
                {language === 'uz'
                  ? 'Faol va narxli xizmatlar topilmadi. Avval xizmat qo‘shing yoki narxini kiriting.'
                  : 'Не найдено активных услуг с ценой. Сначала добавьте услугу или укажите цену.'}
              </p>
            ) : null}
          </div>
          {originalAmount != null && selected ? (
            <p className="text-sm text-gray-600 sm:col-span-2">
              {language === 'uz' ? 'Asl narx' : 'Оригинал'}:{' '}
              <strong>{priceLabel(selected.price, lang)}</strong>
            </p>
          ) : null}
          <div>
            <label className="text-xs text-gray-500">{language === 'uz' ? 'Chegirma narxi' : 'Цена со скидкой'}</label>
            <input
              className="mt-1 w-full border border-gray-300 rounded-lg h-10 px-2 text-sm"
              value={discounted}
              onChange={(e) => setDiscounted(e.target.value)}
              placeholder="150000"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500">{language === 'uz' ? 'Tugash' : 'Окончание'}</label>
            <input
              type="datetime-local"
              className="mt-1 w-full border border-gray-300 rounded-lg h-10 px-2 text-sm"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs text-gray-500">Poster URL</label>
            <input
              className="mt-1 w-full border border-gray-300 rounded-lg h-10 px-2 text-sm"
              value={posterUrl}
              onChange={(e) => setPosterUrl(e.target.value)}
              placeholder="https://..."
            />
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs text-gray-500">{language === 'uz' ? 'Sarlavha (ixtiyoriy)' : 'Заголовок'}</label>
            <input
              className="mt-1 w-full border border-gray-300 rounded-lg h-10 px-2 text-sm"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
        </div>
        <Button onClick={onCreate} disabled={creating}>
          {creating ? '…' : language === 'uz' ? 'Yaratish' : 'Создать'}
        </Button>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 font-semibold text-gray-900">
          {language === 'uz' ? 'Mavjud chegirmalar' : 'Текущие скидки'}
        </div>
        {discounts.length === 0 ? (
          <div className="p-8 text-center text-gray-500">{language === 'uz' ? 'Hozircha yo‘q' : 'Пока нет'}</div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {discounts.map((d) => (
              <li key={d._id} className="px-4 py-3 flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-gray-900">{d.title || d.serviceTitle}</p>
                  <p className="text-sm text-gray-500">
                    −{d.percentOff}% · {d.discountedAmount.toLocaleString()} {d.currency}
                    {d.isExpired ? (
                      <span className="ml-2 text-red-600">{language === 'uz' ? '(tugagan)' : '(истекла)'}</span>
                    ) : null}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">{new Date(d.expiresAt).toLocaleString()}</p>
                </div>
                <button
                  type="button"
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                  onClick={() => onDelete(d._id)}
                  aria-label="delete"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
