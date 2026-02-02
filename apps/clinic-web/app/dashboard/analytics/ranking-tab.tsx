'use client'

import { useLanguage } from '@/contexts/language-context'
import { Star } from 'lucide-react'

export function RankingTab() {
  const { t } = useLanguage()

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] py-16 px-4">
      <div className="w-20 h-20 rounded-2xl bg-amber-50 border-2 border-amber-200 flex items-center justify-center mb-6">
        <Star className="h-10 w-10 text-amber-500" />
      </div>
      <h2 className="text-xl font-semibold text-gray-900 text-center mb-2">
        {t.analytics.comingSoonTitle}
      </h2>
      <p className="text-gray-600 text-center max-w-md">
        {t.analytics.comingSoonDesc}
      </p>
    </div>
  )
}
