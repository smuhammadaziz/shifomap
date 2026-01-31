'use client'

import { useState, useEffect, useCallback } from 'react'
import { useLanguage } from '@/contexts/language-context'
import { useAuthStore } from '@/store/auth-store'
import { useToast } from '@/contexts/toast-context'
import { getApiUrl } from '@/lib/api'
import Cookies from 'js-cookie'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, User, Clock, Building2, Briefcase } from 'lucide-react'

const DAY_KEYS = ['dayMon', 'dayTue', 'dayWed', 'dayThu', 'dayFri', 'daySat', 'daySun'] as const

function getAuthHeaders(): HeadersInit {
  const token = Cookies.get('clinic_auth_token')
  return { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }
}

interface DoctorProfile {
  _id: string
  fullName: string
  username: string
  specialty: string
  bio: string
  avatarUrl: string | null
  branchIds: string[]
  serviceIds: string[]
  isActive: boolean
  schedule: {
    timezone: string
    weekly: Array<{
      day: number
      from: string
      to: string
      lunchFrom?: string
      lunchTo?: string
    }>
  }
  lastLoginAt: string | null
  createdAt: string
  updatedAt: string
}

interface BranchInfo {
  _id: string
  name: string
  phone: string
  address: { city: string; street: string }
  workingHours: Array<{ day: number; from: string; to: string }>
  isActive: boolean
}

interface ServiceInfo {
  _id: string
  title: string
  description: string
  category: string
  durationMin: number
  price: { amount: number; currency: string }
}

type TabId = 'profile' | 'schedule' | 'branch'

export function DoctorSettingsTabs() {
  const { t } = useLanguage()
  const updateUser = useAuthStore((s) => s.updateUser)
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState<TabId>('profile')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [data, setData] = useState<{
    doctor: DoctorProfile
    branch: BranchInfo | null
    services: ServiceInfo[]
  } | null>(null)

  const [fullName, setFullName] = useState('')
  const [username, setUsername] = useState('')
  const [specialty, setSpecialty] = useState('')
  const [bio, setBio] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [password, setPassword] = useState('')
  const [timezone, setTimezone] = useState('Asia/Tashkent')
  const [weekly, setWeekly] = useState<
    Array<{ day: number; from: string; to: string; lunchFrom: string; lunchTo: string; enabled: boolean }>
  >([])

  const fetchProfile = useCallback(async () => {
    try {
      const res = await fetch(`${getApiUrl()}/v1/clinics/doctors/me`, { headers: getAuthHeaders() })
      if (!res.ok) {
        setData(null)
        return
      }
      const json = await res.json()
      if (json.success && json.data) {
        setData(json.data)
        const d = json.data.doctor
        setFullName(d.fullName)
        setUsername(d.username)
        setSpecialty(d.specialty)
        setBio(d.bio ?? '')
        setAvatarUrl(d.avatarUrl ?? '')
        setTimezone(d.schedule?.timezone ?? 'Asia/Tashkent')
        const weeklyList = (d.schedule?.weekly ?? []) as Array<{
          day: number
          from: string
          to: string
          lunchFrom?: string
          lunchTo?: string
        }>
        const days = [1, 2, 3, 4, 5, 6, 7].map((day) => {
          const w = weeklyList.find((x) => x.day === day)
          return w
            ? {
                day,
                from: w.from,
                to: w.to,
                lunchFrom: w.lunchFrom ?? '12:00',
                lunchTo: w.lunchTo ?? '13:00',
                enabled: true,
              }
            : { day, from: '09:00', to: '18:00', lunchFrom: '12:00', lunchTo: '13:00', enabled: false }
        })
        setWeekly(days)
      }
    } catch {
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchProfile()
  }, [fetchProfile])

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      const body: Record<string, string | null> = {
        fullName: fullName.trim(),
        username: username.trim(),
        specialty: specialty.trim(),
        bio: bio.trim(),
        avatarUrl: avatarUrl.trim() || null,
      }
      if (password.trim()) body.password = password.trim()
      const res = await fetch(`${getApiUrl()}/v1/clinics/doctors/me`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify(body),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error || 'Failed to update')
        setSaving(false)
        return
      }
      toast(t.doctorSettings.profileUpdatedSuccess)
      updateUser({
        displayName: fullName.trim(),
        userName: username.trim(),
        fullName: fullName.trim(),
      })
      setPassword('')
      fetchProfile()
    } catch {
      setError('Network error')
    }
    setSaving(false)
  }

  const handleSaveSchedule = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      const weeklyPayload = weekly
        .filter((w) => w.enabled)
        .map((w) => ({
          day: w.day,
          from: w.from,
          to: w.to,
          lunchFrom: w.lunchFrom,
          lunchTo: w.lunchTo,
        }))
      const res = await fetch(`${getApiUrl()}/v1/clinics/doctors/me/schedule`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ timezone, weekly: weeklyPayload }),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error || 'Failed to update schedule')
        setSaving(false)
        return
      }
      toast(t.doctorSettings.scheduleUpdatedSuccess)
      fetchProfile()
    } catch {
      setError('Network error')
    }
    setSaving(false)
  }

  const setDaySchedule = (
    index: number,
    field: 'from' | 'to' | 'lunchFrom' | 'lunchTo' | 'enabled',
    value: string | boolean
  ) => {
    setWeekly((prev) => {
      const next = [...prev]
      if (field === 'enabled') next[index] = { ...next[index], enabled: value as boolean }
      else next[index] = { ...next[index], [field]: value }
      return next
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-amber-800">
        Could not load your profile.
      </div>
    )
  }

  const tabList: { id: TabId; label: string; icon: typeof User }[] = [
    { id: 'profile', label: t.doctorSettings.profile, icon: User },
    { id: 'schedule', label: t.doctorSettings.schedule, icon: Clock },
    { id: 'branch', label: t.doctorSettings.branchAndServices, icon: Building2 },
  ]

  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200">
        <nav className="flex gap-1" aria-label="Tabs">
          {tabList.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium rounded-t-lg border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600 bg-blue-50/50'
                  : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {activeTab === 'profile' && (
        <form onSubmit={handleSaveProfile} className="space-y-6 max-w-2xl">
          <div className="space-y-2">
            <Label htmlFor="avatarUrl">{t.doctorSettings.avatarUrl}</Label>
            <Input
              id="avatarUrl"
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              placeholder={t.doctorSettings.avatarUrlPlaceholder}
              disabled={saving}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="fullName">{t.doctors.fullName}</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder={t.doctors.fullNamePlaceholder}
                required
                disabled={saving}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="username">{t.doctors.username}</Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={t.doctors.usernamePlaceholder}
                required
                disabled={saving}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="specialty">{t.doctors.specialty}</Label>
            <Input
              id="specialty"
              value={specialty}
              onChange={(e) => setSpecialty(e.target.value)}
              placeholder={t.doctors.specialtyPlaceholder}
              required
              disabled={saving}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bio">{t.doctors.bio}</Label>
            <Input
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder={t.doctors.bioPlaceholder}
              disabled={saving}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">
              {t.doctors.password} <span className="text-gray-500">({t.doctors.passwordOptionalHint})</span>
            </Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t.doctors.passwordPlaceholder}
              disabled={saving}
              minLength={8}
            />
          </div>
          <Button type="submit" disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            {t.doctors.save}
          </Button>
        </form>
      )}

      {activeTab === 'schedule' && (
        <form onSubmit={handleSaveSchedule} className="space-y-6 max-w-4xl">
          <p className="text-sm text-gray-600">{t.doctorSettings.slotNote}</p>
          <div className="space-y-2">
            <Label htmlFor="timezone">{t.doctorSettings.timezone}</Label>
            <Input
              id="timezone"
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              disabled={saving}
            />
          </div>
          <div className="space-y-4">
            <Label>{t.doctorSettings.workingHours}</Label>
            {weekly.map((w, index) => (
              <div
                key={w.day}
                className="flex flex-wrap items-center gap-3 p-4 rounded-xl border border-gray-200 bg-gray-50/50"
              >
                <div className="flex items-center gap-2 w-28">
                  <input
                    type="checkbox"
                    id={`day-${w.day}`}
                    checked={w.enabled}
                    onChange={(e) => setDaySchedule(index, 'enabled', e.target.checked)}
                    disabled={saving}
                    className="rounded border-gray-300"
                  />
                  <label htmlFor={`day-${w.day}`} className="text-sm font-medium">
                    {t.doctorSettings[DAY_KEYS[w.day - 1]]}
                  </label>
                </div>
                {w.enabled && (
                  <>
                    <Input
                      type="time"
                      value={w.from}
                      onChange={(e) => setDaySchedule(index, 'from', e.target.value)}
                      className="w-28"
                      disabled={saving}
                    />
                    <span className="text-gray-500">–</span>
                    <Input
                      type="time"
                      value={w.to}
                      onChange={(e) => setDaySchedule(index, 'to', e.target.value)}
                      className="w-28"
                      disabled={saving}
                    />
                    <span className="text-gray-400 mx-1">|</span>
                    <span className="text-sm text-gray-500">{t.doctorSettings.lunchTime}:</span>
                    <Input
                      type="time"
                      value={w.lunchFrom}
                      onChange={(e) => setDaySchedule(index, 'lunchFrom', e.target.value)}
                      className="w-28"
                      disabled={saving}
                    />
                    <span className="text-gray-500">–</span>
                    <Input
                      type="time"
                      value={w.lunchTo}
                      onChange={(e) => setDaySchedule(index, 'lunchTo', e.target.value)}
                      className="w-28"
                      disabled={saving}
                    />
                  </>
                )}
                {!w.enabled && (
                  <span className="text-sm text-gray-400 italic">{t.doctorSettings.closed}</span>
                )}
              </div>
            ))}
          </div>
          <Button type="submit" disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            {t.doctors.save}
          </Button>
        </form>
      )}

      {activeTab === 'branch' && (
        <div className="space-y-6 max-w-2xl">
          <p className="text-sm text-gray-600">{t.doctorSettings.readOnlyNote}</p>
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">{t.doctorSettings.connectedBranch}</h3>
            {data.branch ? (
              <div className="rounded-xl border border-gray-200 p-4 space-y-2">
                <p className="font-medium text-gray-900">{data.branch.name}</p>
                <p className="text-sm text-gray-600">{data.branch.phone}</p>
                <p className="text-sm text-gray-600">
                  {data.branch.address.street}, {data.branch.address.city}
                </p>
                <span
                  className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    data.branch.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  {data.branch.isActive ? t.doctors.active : t.doctors.inactive}
                </span>
              </div>
            ) : (
              <p className="text-gray-500 italic">{t.doctorSettings.noBranch}</p>
            )}
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">{t.doctorSettings.connectedServices}</h3>
            {data.services.length > 0 ? (
              <ul className="rounded-xl border border-gray-200 divide-y divide-gray-100">
                {data.services.map((s) => (
                  <li key={s._id} className="p-4 flex items-center gap-3">
                    <Briefcase className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="font-medium text-gray-900">{s.title}</p>
                      <p className="text-sm text-gray-600">
                        {s.durationMin} min · {s.price.amount} {s.price.currency}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-500 italic">{t.doctorSettings.noServices}</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
