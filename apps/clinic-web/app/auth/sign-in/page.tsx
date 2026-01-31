'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { useAuthStore } from '@/store/auth-store'
import { useLanguage } from '@/contexts/language-context'
import { Globe, Activity } from 'lucide-react'

type LoginFormValues = {
  username: string
  password: string
  remember: boolean
}

const loginSchema = z.object({
  username: z.string().min(1, 'Username required'),
  password: z.string().min(1, 'Password required'),
  remember: z.boolean().default(false),
})

export default function SignInPage() {
  const router = useRouter()
  const { t, language, setLanguage } = useLanguage()
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const login = useAuthStore((state) => state.login)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema) as any,
    defaultValues: {
      username: '',
      password: '',
      remember: false,
    },
  })

  const remember = watch('remember')

  const onSubmit = async (data: LoginFormValues) => {
    setError('')
    setIsLoading(true)

    try {
      const success = await login(data.username, data.password)
      if (success) {
        // Force full navigation so we leave the page; client-side router was staying on login
        window.location.assign('/dashboard')
        return
      }
      setError('invalid')
      setIsLoading(false)
    } catch {
      setError('generic')
      setIsLoading(false)
    }
  }

  const errorMessage =
    error === 'invalid' ? t.signIn.errorInvalid : error === 'generic' ? t.signIn.errorGeneric : ''

  return (
    <div className="min-h-screen flex">
      {/* Left Column - Login Form */}
      <div className="flex-1 flex flex-col justify-center items-center bg-white px-8 py-12">
        <div className="w-full max-w-md">
          {/* Form */}
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h1 className="text-3xl font-bold text-gray-900">
                {t.signIn.title}
              </h1>
              <p className="text-gray-600">
                {t.signIn.subtitle}
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
                {errorMessage}
              </div>
            )}

            {/* Form - Prevent default submit */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">
                  {language === 'uz' ? 'Foydalanuvchi nomi' : 'Имя пользователя'}
                </Label>
                <Input
                  id="username"
                  type="text"
                  placeholder={language === 'uz' ? 'Foydalanuvchi nomini kiriting' : 'Введите имя пользователя'}
                  {...register('username')}
                  className={errors.username ? 'border-red-500' : ''}
                  disabled={isLoading}
                />
                {errors.username && (
                  <p className="text-sm text-red-500">{errors.username.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">
                  {t.signIn.password}
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder={t.signIn.passwordPlaceholder}
                  {...register('password')}
                  className={errors.password ? 'border-red-500' : ''}
                  disabled={isLoading}
                />
                {errors.password && (
                  <p className="text-sm text-red-500">
                    {errors.password.message}
                  </p>
                )}
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="remember"
                  checked={remember}
                  onCheckedChange={(checked: boolean) =>
                    setValue('remember', checked)
                  }
                  disabled={isLoading}
                />
                <Label
                  htmlFor="remember"
                  className="text-sm font-normal cursor-pointer"
                >
                  {t.signIn.rememberMe}
                </Label>
              </div>

              <Button
                type="button"
                onClick={handleSubmit(onSubmit)}
                className="w-full bg-blue-600 hover:bg-blue-700"
                disabled={isLoading}
              >
                {isLoading ? t.signIn.loggingIn : t.signIn.login}
              </Button>
            </div>

            {/* Footer with Language Switcher */}
            <div className="flex items-center justify-between pt-8 text-sm text-gray-600">
              <span>{t.signIn.footerCopyright}</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setLanguage('uz')}
                  className={`px-3 py-1.5 rounded transition-colors ${
                    language === 'uz'
                      ? 'bg-blue-100 text-blue-700 font-medium'
                      : 'hover:bg-gray-100'
                  }`}
                  disabled={isLoading}
                >
                  {t.signIn.langOzbek}
                </button>
                <button
                  type="button"
                  onClick={() => setLanguage('ru')}
                  className={`px-3 py-1.5 rounded transition-colors ${
                    language === 'ru'
                      ? 'bg-blue-100 text-blue-700 font-medium'
                      : 'hover:bg-gray-100'
                  }`}
                  disabled={isLoading}
                >
                  {t.signIn.langRussian}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Column - Branding */}
      <div className="hidden lg:flex flex-1 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 flex-col justify-center items-center p-12 text-white relative overflow-hidden m-2 border-2 border-gray-200 rounded-s-[50px]">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-96 h-96 bg-white rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl"></div>
        </div>

        {/* Centered Content */}
        <div className="relative z-10 text-center max-w-xl space-y-12">
          {/* HealthMap Brand */}
          <div className="space-y-3">
            <div className="flex flex-col items-center justify-center gap-4">
              <Activity className="w-32 h-16 text-white border-2 border-white rounded-full p-5" strokeWidth={2.5}  />
              <h1 className="text-8xl font-extrabold tracking-tight">
                {t.branding.healthMap}
              </h1>
            </div>
            <p className="text-xl font-light text-blue-100/90">
              {t.branding.tagline}
            </p>
          </div>

          {/* Feature Highlights - Compact */}
          <div className="space-y-8 pt-4">
            <div className="space-y-1">
              <h3 className="text-2xl font-semibold">
                {t.branding.allInOne}
              </h3>
              <p className="text-base text-blue-100/80 leading-relaxed">
                {t.branding.allInOneDesc}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
