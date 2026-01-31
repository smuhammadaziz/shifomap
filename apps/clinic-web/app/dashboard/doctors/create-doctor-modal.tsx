'use client'

import { useState, useEffect } from 'react'
import { useLanguage } from '@/contexts/language-context'
import { getApiUrl } from '@/lib/api'
import Cookies from 'js-cookie'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2 } from 'lucide-react'

export interface BranchOption {
  _id: string
  name: string
}

export interface DoctorForEdit {
  _id: string
  fullName: string
  username: string
  specialty: string
  bio: string
  branchIds: string[]
  isActive: boolean
}

interface CreateDoctorModalProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  branches: BranchOption[]
  editDoctor?: DoctorForEdit | null
}

function getAuthHeaders(): HeadersInit {
  const token = Cookies.get('clinic_auth_token')
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

export function CreateDoctorModal({
  open,
  onClose,
  onSuccess,
  branches,
  editDoctor,
}: CreateDoctorModalProps) {
  const { t } = useLanguage()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [fullName, setFullName] = useState('')
  const [username, setUsername] = useState('')
  const [specialty, setSpecialty] = useState('')
  const [bio, setBio] = useState('')
  const [password, setPassword] = useState('')
  const [branchId, setBranchId] = useState('')

  const isEdit = !!editDoctor?._id
  const hasBranches = branches.length > 0

  useEffect(() => {
    if (!open) {
      setError('')
      return
    }
    if (editDoctor) {
      setFullName(editDoctor.fullName)
      setUsername(editDoctor.username)
      setSpecialty(editDoctor.specialty)
      setBio(editDoctor.bio ?? '')
      setPassword('')
      setBranchId(editDoctor.branchIds?.[0] ?? '')
    } else {
      setFullName('')
      setUsername('')
      setSpecialty('')
      setBio('')
      setPassword('')
      setBranchId(branches[0]?._id ?? '')
    }
  }, [open, editDoctor, branches])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!hasBranches && !isEdit) {
      setError(t.doctors.noBranchAlert)
      return
    }
    const selectedBranch = branchId || branches[0]?._id
    if (!selectedBranch && !isEdit) {
      setError(t.doctors.noBranchAlert)
      return
    }
    setLoading(true)
    try {
      if (isEdit && editDoctor?._id) {
        const payload: Record<string, string> = {
          fullName: fullName.trim(),
          username: username.trim(),
          specialty: specialty.trim(),
          bio: bio.trim(),
          branchId: selectedBranch,
        }
        if (password.trim()) payload.password = password.trim()
        const res = await fetch(
          `${getApiUrl()}/v1/clinics/my-clinic/doctors/${editDoctor._id}`,
          { method: 'PATCH', headers: getAuthHeaders(), body: JSON.stringify(payload) }
        )
        const data = await res.json()
        if (!res.ok) {
          setError(data.error || 'Failed to update doctor')
          setLoading(false)
          return
        }
      } else {
        if (!password.trim()) {
          setError('Password is required')
          setLoading(false)
          return
        }
        const res = await fetch(`${getApiUrl()}/v1/clinics/my-clinic/doctors`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({
            fullName: fullName.trim(),
            username: username.trim(),
            specialty: specialty.trim(),
            bio: bio.trim(),
            password: password.trim(),
            branchId: selectedBranch,
          }),
        })
        const data = await res.json()
        if (!res.ok) {
          setError(data.error || 'Failed to create doctor')
          setLoading(false)
          return
        }
      }
      onSuccess()
      setLoading(false)
    } catch {
      setError('Network error')
      setLoading(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="min-h-full flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden />
        <div
          className="relative z-10 w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-6 sm:p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-1">
              {isEdit ? t.doctors.modalEditTitle : t.doctors.modalTitle}
            </h2>
            <p className="text-gray-600 mb-6">{t.doctors.modalDesc}</p>

            {!hasBranches && !isEdit && (
              <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800 mb-6">
                {t.doctors.noBranchAlert}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="doctor-fullName">{t.doctors.fullName}</Label>
                  <Input
                    id="doctor-fullName"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder={t.doctors.fullNamePlaceholder}
                    required
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="doctor-username">{t.doctors.username}</Label>
                  <Input
                    id="doctor-username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder={t.doctors.usernamePlaceholder}
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="doctor-specialty">{t.doctors.specialty}</Label>
                  <Input
                    id="doctor-specialty"
                    value={specialty}
                    onChange={(e) => setSpecialty(e.target.value)}
                    placeholder={t.doctors.specialtyPlaceholder}
                    required
                    disabled={loading}
                  />
                </div>
                {hasBranches && (
                  <div className="space-y-2">
                    <Label htmlFor="doctor-branch">{t.doctors.branch}</Label>
                    <select
                      id="doctor-branch"
                      value={branchId}
                      onChange={(e) => setBranchId(e.target.value)}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      required
                      disabled={loading}
                    >
                      <option value="">{t.doctors.selectBranch}</option>
                      {branches.map((b) => (
                        <option key={b._id} value={b._id}>
                          {b.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="doctor-bio">{t.doctors.bio}</Label>
                <Input
                  id="doctor-bio"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder={t.doctors.bioPlaceholder}
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="doctor-password">
                  {t.doctors.password}
                  {isEdit && (
                    <span className="text-gray-500 font-normal ml-1">({t.doctors.passwordOptionalHint})</span>
                  )}
                </Label>
                <Input
                  id="doctor-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t.doctors.passwordPlaceholder}
                  required={!isEdit}
                  disabled={loading}
                  minLength={8}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
                  {t.doctors.cancel}
                </Button>
                <Button type="submit" disabled={loading || (!hasBranches && !isEdit)}>
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {isEdit ? t.doctors.save : t.doctors.create}
                    </>
                  ) : isEdit ? (
                    t.doctors.save
                  ) : (
                    t.doctors.create
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
