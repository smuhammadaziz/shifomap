'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useLanguage } from '@/contexts/language-context'
import { useAuthStore } from '@/store/auth-store'
import { DoctorSettingsTabs } from './doctor-settings-tabs'

export default function SettingsPage() {
  const { t } = useLanguage()
  const user = useAuthStore((s) => s.user)
  const isDoctor = (user as { role?: string })?.role === 'doctor'

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          {isDoctor ? t.doctorSettings?.title ?? t.dashboard.settingsTitle : t.dashboard.settingsTitle}
        </h1>
        <p className="text-gray-600 mt-2">
          {isDoctor ? t.doctorSettings?.subtitle ?? t.dashboard.settingsSubtitle : t.dashboard.settingsSubtitle}
        </p>
      </div>

      {isDoctor ? (
        <DoctorSettingsTabs />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>{t.dashboard.clinicSettings}</CardTitle>
            <CardDescription>{t.dashboard.clinicSettingsDesc}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[400px] flex items-center justify-center text-gray-500">
              {t.dashboard.settingsComingSoon}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

