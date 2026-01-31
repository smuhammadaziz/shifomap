'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { useLanguage } from '@/contexts/language-context'
import { Globe } from 'lucide-react'

export default function SignUpPage() {
  const { t, language, setLanguage } = useLanguage()

  return (
    <div className="min-h-screen flex">
      {/* Left Column - Sign Up Form */}
      <div className="flex-1 flex flex-col justify-center items-center bg-white px-8 py-12">
        <div className="w-full max-w-md">
          {/* Header */}
          <div className="flex justify-end mb-8">
            <Link
              href="/auth/sign-in"
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              {t.signUp.alreadyHaveAccount}
            </Link>
          </div>

          {/* Form */}
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h1 className="text-3xl font-bold text-gray-900">
                {t.signUp.title}
              </h1>
              <p className="text-gray-600">{t.signUp.subtitle}</p>
            </div>

            <div className="text-center py-8">
              <p className="text-gray-500">{t.signUp.comingSoon}</p>
              <Link href="/auth/sign-in">
                <Button className="mt-4">{t.signUp.goToSignIn}</Button>
              </Link>
            </div>

            {/* Footer with Language Switcher */}
            <div className="flex items-center justify-between pt-8 text-sm text-gray-600">
              <span>{t.signUp.footerCopyright}</span>
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 shrink-0" />
                <button
                  type="button"
                  onClick={() => setLanguage('uz')}
                  className={`px-2 py-1 rounded transition-colors ${
                    language === 'uz'
                      ? 'bg-blue-100 text-blue-700 font-medium'
                      : 'hover:bg-gray-100'
                  }`}
                >
                  {t.signUp.langOzbek}
                </button>
                <button
                  type="button"
                  onClick={() => setLanguage('ru')}
                  className={`px-2 py-1 rounded transition-colors ${
                    language === 'ru'
                      ? 'bg-blue-100 text-blue-700 font-medium'
                      : 'hover:bg-gray-100'
                  }`}
                >
                  {t.signUp.langRussian}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Column - Branding */}
      <div className="hidden lg:flex flex-1 bg-blue-600 flex-col justify-between p-12 text-white">
        <div>
          <div className="flex items-center space-x-2 mb-4">
            <div className="w-8 h-8 border-2 border-white rounded flex items-center justify-center">
              <span className="text-white font-bold">⌘</span>
            </div>
            <div>
              <h2 className="text-xl font-bold">{t.signUp.clinicAdmin}</h2>
              <p className="text-sm text-blue-200">{t.signUp.designBuildLaunch}</p>
            </div>
          </div>
        </div>

        <div className="space-y-8">
          <div>
            <h3 className="text-xl font-semibold mb-2">{t.signUp.readyToLaunch}</h3>
            <p className="text-blue-100">{t.signUp.readyToLaunchDesc}</p>
          </div>
          <div>
            <h3 className="text-xl font-semibold mb-2">{t.signUp.needHelp}</h3>
            <p className="text-blue-100">{t.signUp.needHelpDesc}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

