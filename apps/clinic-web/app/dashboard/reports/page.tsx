'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useLanguage } from '@/contexts/language-context'

export default function ReportsPage() {
  const { t } = useLanguage()

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">{t.dashboard.reportsTitle}</h1>
        <p className="text-gray-600 mt-2">{t.dashboard.reportsSubtitle}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t.dashboard.clinicReports}</CardTitle>
          <CardDescription>{t.dashboard.clinicReportsDesc}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[400px] flex items-center justify-center text-gray-500">
            {t.dashboard.reportsComingSoon}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

