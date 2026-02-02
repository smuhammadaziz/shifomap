'use client'

import { useSearchParams } from 'next/navigation'
import { useLanguage } from '@/contexts/language-context'
import { useCallback, useMemo } from 'react'
import { Users, Stethoscope } from 'lucide-react'
import Link from 'next/link'
import { AdminsTab } from './admins-tab'
import { DoctorsTab } from './doctors-tab'

const TABS = [
  { id: 'admins', icon: Users },
  { id: 'doctors', icon: Stethoscope },
] as const

type TabId = (typeof TABS)[number]['id']

function isValidTab(tab: string | null): tab is TabId {
  return tab === 'admins' || tab === 'doctors'
}

export default function AccountsPage() {
  const searchParams = useSearchParams()
  const { t } = useLanguage()

  const activeTab = useMemo(() => {
    const tab = searchParams.get('tab')
    return isValidTab(tab) ? tab : 'admins'
  }, [searchParams])

  const setTab = useCallback(
    (tab: TabId) => {
      const params = new URLSearchParams(searchParams.toString())
      params.set('tab', tab)
      return `?${params.toString()}`
    },
    [searchParams]
  )

  const tabLabels: Record<TabId, string> = useMemo(
    () => ({
      admins: t.accounts.admins,
      doctors: t.accounts.doctors,
    }),
    [t.accounts]
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">{t.accounts.title}</h1>
        <p className="text-gray-600 mt-1">{t.accounts.subtitle}</p>
      </div>

      {/* Tab navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-1" aria-label="Accounts sections">
          {TABS.map(({ id, icon: Icon }) => {
            const isActive = activeTab === id
            const href = setTab(id)
            return (
              <Link
                key={id}
                href={href}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium rounded-t-lg transition-colors -mb-px border ${
                  isActive
                    ? 'bg-white text-blue-600 border-gray-200 border-b-2 border-b-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {tabLabels[id]}
              </Link>
            )
          })}
        </nav>
      </div>

      {/* Tab content */}
      <div className="min-h-[400px]">
        {activeTab === 'admins' && <AdminsTab />}
        {activeTab === 'doctors' && <DoctorsTab />}
      </div>
    </div>
  )
}
