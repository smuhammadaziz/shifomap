'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useLanguage } from '@/contexts/language-context'

export default function AppointmentsPage() {
  const { t } = useLanguage()

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">{t.dashboard.appointmentsTitle}</h1>
        <p className="text-gray-600 mt-2">{t.dashboard.appointmentsSubtitle}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t.dashboard.appointmentSchedule}</CardTitle>
          <CardDescription>{t.dashboard.appointmentScheduleDesc}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[400px] flex items-center justify-center text-gray-500">
            {t.dashboard.appointmentsComingSoon}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

