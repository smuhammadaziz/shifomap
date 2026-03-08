'use client'

import { useLanguage } from '@/contexts/language-context'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Star, User } from 'lucide-react'
import { getApiUrl } from '@/lib/api'
import Cookies from 'js-cookie'

function getAuthHeaders(): HeadersInit {
  const token = Cookies.get('clinic_auth_token')
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

interface ReviewItem {
  _id: string
  clinicId: string
  serviceId: string | null
  doctorId: string | null
  stars: number
  text: string | null
  createdAt: string
  patient?: {
    fullName: string
    phone: string
    email: string | null
    city: string
  }
}

interface ReviewsData {
  reviews: ReviewItem[]
  total: number
  rating: { avg: number; count: number }
}

interface ClinicData {
  _id: string
  services?: { _id: string; title: string }[]
  doctors?: { _id: string; fullName: string }[]
}

type TabId = 'clinic' | 'services' | 'doctors'

export default function RatingsPage() {
  const { t } = useLanguage()
  const [clinicId, setClinicId] = useState<string | null>(null)
  const [clinicData, setClinicData] = useState<ClinicData | null>(null)
  const [tab, setTab] = useState<TabId>('clinic')
  const [clinicReviews, setClinicReviews] = useState<ReviewsData | null>(null)
  const [clinicReviewsSkip, setClinicReviewsSkip] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadMore, setLoadMore] = useState(false)
  const [openReviewId, setOpenReviewId] = useState<string | null>(null)
  const popoverRef = useRef<HTMLDivElement>(null)
  // Services tab
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null)
  const [serviceReviews, setServiceReviews] = useState<ReviewsData | null>(null)
  const [serviceReviewsSkip, setServiceReviewsSkip] = useState(0)
  const [serviceLoading, setServiceLoading] = useState(false)
  const [serviceLoadMore, setServiceLoadMore] = useState(false)
  // Doctors tab
  const [selectedDoctorId, setSelectedDoctorId] = useState<string | null>(null)
  const [doctorReviews, setDoctorReviews] = useState<ReviewsData | null>(null)
  const [doctorReviewsSkip, setDoctorReviewsSkip] = useState(0)
  const [doctorLoading, setDoctorLoading] = useState(false)
  const [doctorLoadMore, setDoctorLoadMore] = useState(false)

  const fetchClinicId = useCallback(async () => {
    try {
      const res = await fetch(`${getApiUrl()}/v1/clinics/my-clinic`, { headers: getAuthHeaders() })
      if (!res.ok) return
      const json = await res.json()
      if (json.success && json.data?._id) {
        setClinicId(json.data._id)
        setClinicData(json.data)
      }
    } catch {
      // ignore
    }
  }, [])

  const fetchClinicReviews = useCallback(
    async (skip: number, limit: number, append: boolean) => {
      if (!clinicId) return
      if (append) setLoadMore(true)
      else setLoading(true)
      try {
        const res = await fetch(
          `${getApiUrl()}/v1/clinics/my-clinic/reviews?skip=${skip}&limit=${limit}`,
          { headers: getAuthHeaders() }
        )
        if (!res.ok) return
        const json = await res.json()
        if (json.success && json.data) {
          if (append && clinicReviews) {
            setClinicReviews({
              ...json.data,
              reviews: [...clinicReviews.reviews, ...json.data.reviews],
            })
          } else {
            setClinicReviews(json.data)
          }
          setClinicReviewsSkip(skip + (json.data.reviews?.length ?? 0))
        }
      } catch {
        // ignore
      } finally {
        setLoading(false)
        setLoadMore(false)
      }
    },
    [clinicId, clinicReviews]
  )

  const fetchServiceReviews = useCallback(
    async (serviceId: string, skip: number, limit: number, append: boolean) => {
      if (!clinicId) return
      if (append) setServiceLoadMore(true)
      else setServiceLoading(true)
      try {
        const res = await fetch(
          `${getApiUrl()}/v1/clinics/my-clinic/reviews?serviceId=${encodeURIComponent(serviceId)}&skip=${skip}&limit=${limit}`,
          { headers: getAuthHeaders() }
        )
        if (!res.ok) return
        const json = await res.json()
        if (json.success && json.data) {
          if (append && serviceReviews) {
            setServiceReviews({
              ...json.data,
              reviews: [...serviceReviews.reviews, ...json.data.reviews],
            })
          } else {
            setServiceReviews(json.data)
          }
          setServiceReviewsSkip(skip + (json.data.reviews?.length ?? 0))
        }
      } catch {
        // ignore
      } finally {
        setServiceLoading(false)
        setServiceLoadMore(false)
      }
    },
    [clinicId, serviceReviews]
  )

  const fetchDoctorReviews = useCallback(
    async (doctorId: string, skip: number, limit: number, append: boolean) => {
      if (!clinicId) return
      if (append) setDoctorLoadMore(true)
      else setDoctorLoading(true)
      try {
        const res = await fetch(
          `${getApiUrl()}/v1/clinics/my-clinic/reviews?doctorId=${encodeURIComponent(doctorId)}&skip=${skip}&limit=${limit}`,
          { headers: getAuthHeaders() }
        )
        if (!res.ok) return
        const json = await res.json()
        if (json.success && json.data) {
          if (append && doctorReviews) {
            setDoctorReviews({
              ...json.data,
              reviews: [...doctorReviews.reviews, ...json.data.reviews],
            })
          } else {
            setDoctorReviews(json.data)
          }
          setDoctorReviewsSkip(skip + (json.data.reviews?.length ?? 0))
        }
      } catch {
        // ignore
      } finally {
        setDoctorLoading(false)
        setDoctorLoadMore(false)
      }
    },
    [clinicId, doctorReviews]
  )

  useEffect(() => {
    fetchClinicId()
  }, [fetchClinicId])

  useEffect(() => {
    if (!openReviewId) return
    const onDocClick = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setOpenReviewId(null)
      }
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [openReviewId])

  useEffect(() => {
    if (!clinicId) return
    setLoading(true)
    fetch(`${getApiUrl()}/v1/clinics/my-clinic/reviews?skip=0&limit=3`, { headers: getAuthHeaders() })
      .then((r) => r.json())
      .then((json) => {
        if (json.success && json.data) {
          setClinicReviews(json.data)
          setClinicReviewsSkip(json.data.reviews?.length ?? 0)
        }
      })
      .finally(() => setLoading(false))
  }, [clinicId])

  useEffect(() => {
    if (!selectedServiceId) {
      setServiceReviews(null)
      setServiceReviewsSkip(0)
      return
    }
    setServiceLoading(true)
    fetch(
      `${getApiUrl()}/v1/clinics/my-clinic/reviews?serviceId=${encodeURIComponent(selectedServiceId)}&skip=0&limit=10`,
      { headers: getAuthHeaders() }
    )
      .then((r) => r.json())
      .then((json) => {
        if (json.success && json.data) {
          setServiceReviews(json.data)
          setServiceReviewsSkip(json.data.reviews?.length ?? 0)
        }
      })
      .finally(() => setServiceLoading(false))
  }, [selectedServiceId])

  useEffect(() => {
    if (!selectedDoctorId) {
      setDoctorReviews(null)
      setDoctorReviewsSkip(0)
      return
    }
    setDoctorLoading(true)
    fetch(
      `${getApiUrl()}/v1/clinics/my-clinic/reviews?doctorId=${encodeURIComponent(selectedDoctorId)}&skip=0&limit=10`,
      { headers: getAuthHeaders() }
    )
      .then((r) => r.json())
      .then((json) => {
        if (json.success && json.data) {
          setDoctorReviews(json.data)
          setDoctorReviewsSkip(json.data.reviews?.length ?? 0)
        }
      })
      .finally(() => setDoctorLoading(false))
  }, [selectedDoctorId])

  const onLoadMore = () => {
    fetchClinicReviews(clinicReviewsSkip, 10, true)
  }

  if (!clinicId && !loading) {
    return (
      <div className="p-6">
        <p className="text-gray-600">{t.ratings.noReviews}</p>
      </div>
    )
  }

  const tabs: { id: TabId; label: string }[] = [
    { id: 'clinic', label: t.ratings.tabClinic },
    { id: 'services', label: t.ratings.tabServices },
    { id: 'doctors', label: t.ratings.tabDoctors },
  ]

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
        <Star className="h-7 w-7 text-amber-500" />
        {t.sidebar.ratingsAndReviews}
      </h1>

      <div className="flex gap-2 border-b border-gray-200 mb-6">
        {tabs.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
              tab === id ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-600' : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'clinic' && (
        <div className="space-y-4">
          {clinicReviews?.rating && clinicReviews.rating.count > 0 && (
            <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
              <span className="text-2xl font-bold text-gray-900">{clinicReviews.rating.avg.toFixed(1)}</span>
              <Star className="h-6 w-6 text-amber-500 fill-amber-500" />
              <span className="text-gray-600">
                {(t.ratings.reviewsCount || '{{n}}').replace('{{n}}', String(clinicReviews.rating.count))}
              </span>
            </div>
          )}
          {loading && !clinicReviews?.reviews?.length ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin h-8 w-8 border-2 border-blue-600 border-t-transparent rounded-full" />
            </div>
          ) : clinicReviews?.reviews?.length ? (
            <>
              <div className="space-y-3">
                {clinicReviews.reviews.map((r) => (
                  <div
                    key={r._id}
                    className="p-4 bg-white border border-gray-200 rounded-lg flex flex-wrap gap-3 items-start"
                  >
                    <div className="flex gap-0.5 shrink-0">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          className={`h-4 w-4 ${s <= r.stars ? 'text-amber-500 fill-amber-500' : 'text-gray-300'}`}
                        />
                      ))}
                    </div>
                    <div className="flex-1 min-w-0">
                      {r.text && <p className="text-gray-700 text-sm">{r.text}</p>}
                      <p className="text-gray-400 text-xs mt-1">
                        {new Date(r.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    {r.patient && (
                      <div className="relative shrink-0" ref={openReviewId === r._id ? popoverRef : undefined}>
                        <button
                          type="button"
                          onClick={() => setOpenReviewId((prev) => (prev === r._id ? null : r._id))}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50"
                        >
                          <User className="h-4 w-4" />
                          {t.ratings.userDetails}
                        </button>
                        {openReviewId === r._id && (
                          <div className="absolute left-0 top-full mt-1 z-10 w-64 p-3 bg-white border border-gray-200 rounded-lg shadow-lg">
                            <p className="font-medium text-gray-900">{r.patient.fullName}</p>
                            <p className="text-sm text-gray-600 mt-1">{r.patient.phone}</p>
                            {r.patient.email && (
                              <p className="text-sm text-gray-600">{r.patient.email}</p>
                            )}
                            {r.patient.city && (
                              <p className="text-sm text-gray-500">{r.patient.city}</p>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              {clinicReviews.total > clinicReviews.reviews.length && (
                <button
                  type="button"
                  onClick={onLoadMore}
                  disabled={loadMore}
                  className="mt-4 px-4 py-2 text-sm font-medium text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50 disabled:opacity-50"
                >
                  {loadMore ? '...' : t.ratings.loadMore}
                </button>
              )}
            </>
          ) : (
            <p className="text-gray-500 py-8">{t.ratings.noReviews}</p>
          )}
        </div>
      )}

      {tab === 'services' && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t.ratings.selectService}</label>
            <select
              value={selectedServiceId ?? ''}
              onChange={(e) => setSelectedServiceId(e.target.value || null)}
              className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">—</option>
              {(clinicData?.services ?? []).map((s) => (
                <option key={s._id} value={s._id}>{s.title}</option>
              ))}
            </select>
          </div>
          {selectedServiceId && (
            <>
              {serviceReviews?.rating && serviceReviews.rating.count > 0 && (
                <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                  <span className="text-2xl font-bold text-gray-900">{serviceReviews.rating.avg.toFixed(1)}</span>
                  <Star className="h-6 w-6 text-amber-500 fill-amber-500" />
                  <span className="text-gray-600">
                    {(t.ratings.reviewsCount || '{{n}}').replace('{{n}}', String(serviceReviews.rating.count))}
                  </span>
                </div>
              )}
              {serviceLoading && !serviceReviews?.reviews?.length ? (
                <div className="flex justify-center py-12">
                  <div className="animate-spin h-8 w-8 border-2 border-blue-600 border-t-transparent rounded-full" />
                </div>
              ) : serviceReviews?.reviews?.length ? (
                <>
                  <div className="space-y-3">
                    {serviceReviews.reviews.map((r) => (
                      <div key={r._id} className="p-4 bg-white border border-gray-200 rounded-lg flex flex-wrap gap-3 items-start">
                        <div className="flex gap-0.5 shrink-0">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star key={s} className={`h-4 w-4 ${s <= r.stars ? 'text-amber-500 fill-amber-500' : 'text-gray-300'}`} />
                          ))}
                        </div>
                        <div className="flex-1 min-w-0">
                          {r.text && <p className="text-gray-700 text-sm">{r.text}</p>}
                          <p className="text-gray-400 text-xs mt-1">{new Date(r.createdAt).toLocaleDateString()}</p>
                        </div>
                        {r.patient && (
                          <div className="relative shrink-0" ref={openReviewId === r._id ? popoverRef : undefined}>
                            <button type="button" onClick={() => setOpenReviewId((prev) => (prev === r._id ? null : r._id))} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50">
                              <User className="h-4 w-4" />
                              {t.ratings.userDetails}
                            </button>
                            {openReviewId === r._id && (
                              <div className="absolute left-0 top-full mt-1 z-10 w-64 p-3 bg-white border border-gray-200 rounded-lg shadow-lg">
                                <p className="font-medium text-gray-900">{r.patient.fullName}</p>
                                <p className="text-sm text-gray-600 mt-1">{r.patient.phone}</p>
                                {r.patient.email && <p className="text-sm text-gray-600">{r.patient.email}</p>}
                                {r.patient.city && <p className="text-sm text-gray-500">{r.patient.city}</p>}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  {serviceReviews.total > serviceReviews.reviews.length && (
                    <button type="button" onClick={() => selectedServiceId && fetchServiceReviews(selectedServiceId, serviceReviewsSkip, 10, true)} disabled={serviceLoadMore} className="mt-4 px-4 py-2 text-sm font-medium text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50 disabled:opacity-50">
                      {serviceLoadMore ? '...' : t.ratings.loadMore}
                    </button>
                  )}
                </>
              ) : (
                <p className="text-gray-500 py-8">{t.ratings.noReviews}</p>
              )}
            </>
          )}
          {!selectedServiceId && (clinicData?.services?.length ?? 0) > 0 && (
            <p className="text-gray-500 py-4">{t.ratings.selectService}</p>
          )}
          {(clinicData?.services?.length ?? 0) === 0 && (
            <p className="text-gray-500 py-8">{t.ratings.noReviews}</p>
          )}
        </div>
      )}

      {tab === 'doctors' && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t.ratings.selectDoctor}</label>
            <select
              value={selectedDoctorId ?? ''}
              onChange={(e) => setSelectedDoctorId(e.target.value || null)}
              className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">—</option>
              {(clinicData?.doctors ?? []).map((d) => (
                <option key={d._id} value={d._id}>{d.fullName}</option>
              ))}
            </select>
          </div>
          {selectedDoctorId && (
            <>
              {doctorReviews?.rating && doctorReviews.rating.count > 0 && (
                <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                  <span className="text-2xl font-bold text-gray-900">{doctorReviews.rating.avg.toFixed(1)}</span>
                  <Star className="h-6 w-6 text-amber-500 fill-amber-500" />
                  <span className="text-gray-600">
                    {(t.ratings.reviewsCount || '{{n}}').replace('{{n}}', String(doctorReviews.rating.count))}
                  </span>
                </div>
              )}
              {doctorLoading && !doctorReviews?.reviews?.length ? (
                <div className="flex justify-center py-12">
                  <div className="animate-spin h-8 w-8 border-2 border-blue-600 border-t-transparent rounded-full" />
                </div>
              ) : doctorReviews?.reviews?.length ? (
                <>
                  <div className="space-y-3">
                    {doctorReviews.reviews.map((r) => (
                      <div key={r._id} className="p-4 bg-white border border-gray-200 rounded-lg flex flex-wrap gap-3 items-start">
                        <div className="flex gap-0.5 shrink-0">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star key={s} className={`h-4 w-4 ${s <= r.stars ? 'text-amber-500 fill-amber-500' : 'text-gray-300'}`} />
                          ))}
                        </div>
                        <div className="flex-1 min-w-0">
                          {r.text && <p className="text-gray-700 text-sm">{r.text}</p>}
                          <p className="text-gray-400 text-xs mt-1">{new Date(r.createdAt).toLocaleDateString()}</p>
                        </div>
                        {r.patient && (
                          <div className="relative shrink-0" ref={openReviewId === r._id ? popoverRef : undefined}>
                            <button type="button" onClick={() => setOpenReviewId((prev) => (prev === r._id ? null : r._id))} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50">
                              <User className="h-4 w-4" />
                              {t.ratings.userDetails}
                            </button>
                            {openReviewId === r._id && (
                              <div className="absolute left-0 top-full mt-1 z-10 w-64 p-3 bg-white border border-gray-200 rounded-lg shadow-lg">
                                <p className="font-medium text-gray-900">{r.patient.fullName}</p>
                                <p className="text-sm text-gray-600 mt-1">{r.patient.phone}</p>
                                {r.patient.email && <p className="text-sm text-gray-600">{r.patient.email}</p>}
                                {r.patient.city && <p className="text-sm text-gray-500">{r.patient.city}</p>}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  {doctorReviews.total > doctorReviews.reviews.length && (
                    <button type="button" onClick={() => selectedDoctorId && fetchDoctorReviews(selectedDoctorId, doctorReviewsSkip, 10, true)} disabled={doctorLoadMore} className="mt-4 px-4 py-2 text-sm font-medium text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50 disabled:opacity-50">
                      {doctorLoadMore ? '...' : t.ratings.loadMore}
                    </button>
                  )}
                </>
              ) : (
                <p className="text-gray-500 py-8">{t.ratings.noReviews}</p>
              )}
            </>
          )}
          {!selectedDoctorId && (clinicData?.doctors?.length ?? 0) > 0 && (
            <p className="text-gray-500 py-4">{t.ratings.selectDoctor}</p>
          )}
          {(clinicData?.doctors?.length ?? 0) === 0 && (
            <p className="text-gray-500 py-8">{t.ratings.noReviews}</p>
          )}
        </div>
      )}
    </div>
  )
}
