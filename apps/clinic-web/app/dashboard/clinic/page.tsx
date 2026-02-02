'use client'

import { useSearchParams } from 'next/navigation'
import { useLanguage } from '@/contexts/language-context'
import { useCallback, useMemo } from 'react'
import { GitBranch, FolderTree, Briefcase, Building2 } from 'lucide-react'
import Link from 'next/link'
import BranchesPage from '../branches/page'
import CategoriesPage from '../categories/page'
import ServicesPage from '../services/page'
import { ClinicInfoTab } from './clinic-info-tab'

const TABS = [
  { id: 'branches', icon: GitBranch },
  { id: 'categories', icon: FolderTree },
  { id: 'services', icon: Briefcase },
  { id: 'info', icon: Building2 },
] as const

type TabId = (typeof TABS)[number]['id']

function isValidTab(tab: string | null): tab is TabId {
  return tab === 'branches' || tab === 'categories' || tab === 'services' || tab === 'info'
}

export default function ClinicPage() {
  const searchParams = useSearchParams()
  const { t } = useLanguage()

  const activeTab = useMemo(() => {
    const tab = searchParams.get('tab')
    return isValidTab(tab) ? tab : 'branches'
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
      branches: t.sidebar.branches,
      categories: t.sidebar.categories,
      services: t.sidebar.services,
      info: t.sidebar.clinicInformations,
    }),
    [t.sidebar]
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">{t.sidebar.clinic}</h1>
        <p className="text-gray-600 mt-1">
          {activeTab === 'branches' && t.branches.subtitle}
          {activeTab === 'categories' && t.categories.subtitle}
          {activeTab === 'services' && t.services.subtitle}
          {activeTab === 'info' && t.sidebar.clinicInformations}
        </p>
      </div>

      {/* Tab navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-1" aria-label="Clinic sections">
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
        {activeTab === 'branches' && <BranchesPage embedded />}
        {activeTab === 'categories' && <CategoriesPage embedded />}
        {activeTab === 'services' && <ServicesPage embedded />}
        {activeTab === 'info' && <ClinicInfoTab />}
      </div>
    </div>
  )
}
