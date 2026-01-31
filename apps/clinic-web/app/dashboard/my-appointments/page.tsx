'use client'

import { useLanguage } from '@/contexts/language-context'
import { Calendar } from 'lucide-react'

export default function MyAppointmentsPage() {
  const { t } = useLanguage()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">{t.sidebar.myAppointments}</h1>
        <p className="text-gray-600 mt-1">{t.dashboard.appointmentsComingSoon}</p>
      </div>
      <div className="flex flex-col items-center justify-center py-24 rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50/50">
        <Calendar className="h-16 w-16 text-gray-400 mb-4" />
        <p className="text-gray-500 text-center max-w-md">{t.dashboard.appointmentsComingSoon}</p>
      </div>
    </div>
  )
}
