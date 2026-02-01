'use client'

import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useLanguage } from '@/contexts/language-context'
import { getApiUrl } from '@/lib/api'
import Cookies from 'js-cookie'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, X } from 'lucide-react'

const PANEL_WIDTH = 'min(100%, 42rem)'
const ANIMATION_MS = 300
const OPEN_EASING = 'cubic-bezier(0.32, 0.72, 0, 1)'
const OPEN_DURATION_MS = 380

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
  const [closing, setClosing] = useState(false)
  const [fullName, setFullName] = useState('')
  const [username, setUsername] = useState('')
  const [specialty, setSpecialty] = useState('')
  const [bio, setBio] = useState('')
  const [password, setPassword] = useState('')
  const [branchId, setBranchId] = useState('')

  const isEdit = !!editDoctor?._id
  const hasBranches = branches.length > 0
  const visible = open || closing

  const closePanel = useCallback(() => {
    setClosing(true)
    const id = setTimeout(() => {
      onClose()
      setClosing(false)
    }, ANIMATION_MS)
    return () => clearTimeout(id)
  }, [onClose])

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

  if (!visible) return null

  const panelOpen = open && !closing

  const panelContent = (
    <div
      className="fixed inset-0 z-50 flex justify-end"
      style={{
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        minHeight: '100vh',
      }}
      aria-modal="true"
      role="dialog"
    >
      {/* Overlay */}
      <div
        className="absolute bg-black/50"
        style={{
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          minHeight: '100vh',
          opacity: panelOpen ? 1 : 0,
          pointerEvents: panelOpen ? 'auto' : 'none',
          transition: `opacity ${OPEN_DURATION_MS}ms ${OPEN_EASING}`,
        }}
        onClick={closePanel}
        aria-hidden
      />

      {/* Side panel */}
      <div
        className="relative flex w-full max-w-[42rem] flex-col bg-white shadow-2xl"
        style={{
          width: PANEL_WIDTH,
          top: 0,
          bottom: 0,
          height: '100vh',
          minHeight: '100vh',
          transform: panelOpen ? 'translateX(0)' : 'translateX(100%)',
          opacity: panelOpen ? 1 : 0.97,
          transition: `transform ${OPEN_DURATION_MS}ms ${OPEN_EASING}, opacity ${OPEN_DURATION_MS}ms ${OPEN_EASING}`,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-gray-200 px-6 py-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              {isEdit ? t.doctors.modalEditTitle : t.doctors.modalTitle}
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">{t.doctors.modalDesc}</p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={closePanel}
            disabled={loading}
            className="h-9 w-9 rounded-lg shrink-0"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto px-6 py-5">
            {!hasBranches && !isEdit && (
              <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800 mb-5">
                {t.doctors.noBranchAlert}
              </div>
            )}

            {error && (
              <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="doctor-fullName" className="text-sm text-gray-600">{t.doctors.fullName}</Label>
                  <Input
                    id="doctor-fullName"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder={t.doctors.fullNamePlaceholder}
                    required
                    disabled={loading}
                    className="w-full"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="doctor-username" className="text-sm text-gray-600">{t.doctors.username}</Label>
                  <Input
                    id="doctor-username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder={t.doctors.usernamePlaceholder}
                    required
                    disabled={loading}
                    className="w-full"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="doctor-specialty" className="text-sm text-gray-600">{t.doctors.specialty}</Label>
                  <Input
                    id="doctor-specialty"
                    value={specialty}
                    onChange={(e) => setSpecialty(e.target.value)}
                    placeholder={t.doctors.specialtyPlaceholder}
                    required
                    disabled={loading}
                    className="w-full"
                  />
                </div>
                {hasBranches && (
                  <div className="space-y-2">
                    <Label htmlFor="doctor-branch" className="text-sm text-gray-600">{t.doctors.branch}</Label>
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
                <Label htmlFor="doctor-bio" className="text-sm text-gray-600">{t.doctors.bio}</Label>
                <Input
                  id="doctor-bio"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder={t.doctors.bioPlaceholder}
                  disabled={loading}
                  className="w-full"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="doctor-password" className="text-sm text-gray-600">
                  {t.doctors.password}
                  {isEdit && (
                    <span className="text-gray-500 font-normal ml-1 text-xs">({t.doctors.passwordOptionalHint})</span>
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
                  className="w-full"
                />
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="shrink-0 border-t border-gray-200 px-6 py-4 flex flex-row justify-end gap-3">
            <Button type="button" variant="outline" onClick={closePanel} disabled={loading}>
              {t.doctors.cancel}
            </Button>
            <Button type="submit" disabled={loading || (!hasBranches && !isEdit)}>
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              {isEdit ? t.doctors.save : t.doctors.create}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )

  return typeof document !== 'undefined'
    ? createPortal(panelContent, document.body)
    : null
}
