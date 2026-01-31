'use client'

import { useLanguage } from '@/contexts/language-context'
import { Briefcase } from 'lucide-react'

export default function MyServicesPage() {
  const { t } = useLanguage()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">{t.sidebar.myServices}</h1>
        <p className="text-gray-600 mt-1">{t.dashboard.patientsComingSoon}</p>
      </div>
      <div className="flex flex-col items-center justify-center py-24 rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50/50">
        <Briefcase className="h-16 w-16 text-gray-400 mb-4" />
        <p className="text-gray-500 text-center max-w-md">{t.dashboard.patientsComingSoon}</p>
      </div>
    </div>
  )
}
