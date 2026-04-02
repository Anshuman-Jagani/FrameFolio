import type { FormEvent } from 'react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useGoogleLogin } from '@react-oauth/google'
import { useAuthStore, type UserRole } from '../../store/authStore'
import { get, post } from '../../lib/api'
import { usePageTitle } from '../../hooks/usePageTitle'

const roleToDashboardPath: Record<UserRole, string> = {
  client: '/dashboard/client',
  photographer: '/dashboard/photographer',
  admin: '/dashboard/admin',
}

export default function LoginPage() {
  const navigate = useNavigate()
  const { login, setTokens } = useAuthStore()

  usePageTitle('Login')

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as
    | string
    | undefined

  function GoogleLoginButton() {
    const googleLogin = useGoogleLogin({
      onSuccess: (tokenResponse) => {
        const id_token = (tokenResponse as any)?.id_token as string | undefined
        if (!id_token) {
          setError('Google did not return an id_token. Please try again.')
          return
        }
        ;(async () => {
          try {
            const tokens = await post<{
              access_token: string
              refresh_token: string
            }>('/auth/google', { id_token })
            setTokens({
              accessToken: tokens.access_token,
              refreshToken: tokens.refresh_token,
            })
            const me = await get<{ id: string; email: string; role: UserRole; full_name?: string }>(
              '/auth/me',
            )
            const newFullName = me.full_name || me.email.split('@')[0]
            localStorage.setItem('framefolio_fullname', newFullName)
            login(
              { id: me.id, email: me.email, role: me.role, fullName: newFullName },
              {
                accessToken: tokens.access_token,
                refreshToken: tokens.refresh_token,
              },
            )
            navigate(roleToDashboardPath[me.role])
          } catch {
            setError('Google sign-in failed. Please try email/password.')
          }
        })()
      },
      onError: () =>
        setError('Google sign-in failed. Please try email/password.'),
      flow: 'implicit',
    })

    return (
      <button
        type="button"
        onClick={() => googleLogin()}
        className="mt-6 w-full rounded-2xl border border-taupe-100 text-charcoal-700 px-4 py-3 text-sm font-medium hover:bg-cream-200 transition-colors flex items-center justify-center gap-2"
      >
        <span className="inline-block h-2.5 w-2.5 rounded-full bg-burgundy-500" />
        Continue with Google
      </button>
    )
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!email.trim() || !password.trim()) {
      setError('Email and password are required.')
      return
    }

    setLoading(true)
    try {
      const tokens = await post<{
        access_token: string
        refresh_token: string
      }>('/auth/login', { email, password })

      setTokens({
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
      })

      const me = await get<{ id: string; email: string; role: UserRole; full_name?: string }>(
        '/auth/me',
      )
      
      const newFullName = me.full_name || email.split('@')[0]
      localStorage.setItem('framefolio_fullname', newFullName)
      login(
        { id: me.id, email: me.email, role: me.role, fullName: newFullName },
        {
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
        },
      )
      navigate(roleToDashboardPath[me.role])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={`max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 ${!googleClientId ? 'max-w-md' : ''}`}>
      <div className={`grid gap-8 ${googleClientId ? 'lg:grid-cols-[1fr_420px]' : ''} items-start`}>
        <section className="rounded-3xl border border-taupe-100 bg-cream-100/80 backdrop-blur p-6 sm:p-8 shadow-sm">
          <div className="inline-flex items-center gap-2 rounded-full border border-taupe-100 bg-cream-50/80 px-3 py-1 text-sm font-medium text-taupe-700">
            <span className="h-2 w-2 rounded-full bg-burgundy-500" />
            Welcome back
          </div>
          <h1 className="mt-4 text-3xl sm:text-4xl font-serif font-semibold tracking-tight text-charcoal-700">
            Login to FrameFolio
          </h1>
          <p className="mt-3 text-taupe-700">
            Sign in to manage your bookings and connect with photographers.
          </p>

          <form className="mt-8" onSubmit={onSubmit}>
            <div className="grid gap-4">
              <div>
                <label className="text-sm font-medium text-taupe-700" htmlFor="email">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-2 w-full rounded-2xl border border-taupe-100 bg-cream-50 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-burgundy-500/30 text-charcoal-700 placeholder:text-taupe-500"
                  placeholder="you@example.com"
                />
              </div>
              <div>
                <label
                  className="text-sm font-medium text-taupe-700"
                  htmlFor="password"
                >
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-2 w-full rounded-2xl border border-taupe-100 bg-cream-50 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-burgundy-500/30 text-charcoal-700 placeholder:text-taupe-500"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {error ? (
              <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                {error}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={loading}
              className="mt-6 w-full rounded-2xl bg-burgundy-500 text-cream-50 px-5 py-3 text-sm font-medium hover:bg-burgundy-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Signing in...' : 'Login'}
            </button>

            {googleClientId && <GoogleLoginButton />}
          </form>

          <div className="mt-6 text-sm text-taupe-700">
            New here?{' '}
            <Link className="font-medium text-burgundy-500 hover:underline" to="/register">
              Create an account
            </Link>
          </div>
        </section>

        {googleClientId ? (
          <aside className="rounded-3xl border border-taupe-100 bg-cream-50 p-6 sm:p-8 shadow-sm">
            <div className="text-lg font-serif font-semibold text-charcoal-700">Google Sign-In</div>
            <p className="mt-2 text-sm text-taupe-700">
              If configured, sign in and we'll save your JWT for protected routes.
            </p>
            <div className="mt-6 text-xs text-taupe-500">
              Connects to your backend `/api/v1/auth/*` endpoints.
            </div>
          </aside>
        ) : null}
      </div>
    </div>
  )
}

