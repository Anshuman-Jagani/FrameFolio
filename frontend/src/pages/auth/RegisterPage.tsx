import type { FormEvent } from 'react'
import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import type { UserRole } from '../../store/authStore'
import { useAuthStore } from '../../store/authStore'
import { get, post } from '../../lib/api'
import { usePageTitle } from '../../hooks/usePageTitle'

type SignupRole = 'client' | 'photographer'

export default function RegisterPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const { login, setTokens } = useAuthStore()

  usePageTitle('Create Account')

  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<SignupRole>(() =>
    params.get('role') === 'photographer' ? 'photographer' : 'client',
  )

  useEffect(() => {
    const r = params.get('role')
    if (r === 'photographer' || r === 'client') setRole(r)
  }, [params])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!email.trim() || !fullName.trim() || !password.trim()) {
      setError('Full name, email, and password are required.')
      return
    }
    if (!email.includes('@')) {
      setError('Please enter a valid email.')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (!/\d/.test(password)) {
      setError('Password must contain at least one digit.')
      return
    }

    setLoading(true)
    try {
      await post('/auth/register', {
        email,
        password,
        full_name: fullName,
        phone: phone.trim() || undefined,
        role,
      })

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

      localStorage.setItem('framefolio_fullname', fullName)
      login(
        { id: me.id, email: me.email, role: me.role, fullName },
        {
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
        },
      )

      if (role === 'photographer') {
        navigate('/photographer-setup')
      } else {
        navigate('/dashboard/client')
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Registration failed'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="grid lg:grid-cols-[1fr_420px] gap-8 items-start">
        <section className="rounded-3xl border border-taupe-100 bg-cream-100/80 backdrop-blur p-6 sm:p-8 shadow-sm">
          <div className="inline-flex items-center gap-2 rounded-full border border-taupe-100 bg-cream-50/80 px-3 py-1 text-sm font-medium text-taupe-700">
            <span className="h-2 w-2 rounded-full bg-burgundy-500" />
            Create account
          </div>
          <h1 className="mt-4 text-3xl sm:text-4xl font-serif font-semibold tracking-tight text-charcoal-700">
            Sign up for FrameFolio
          </h1>
          <p className="mt-3 text-taupe-700">
            {role === 'photographer'
              ? 'Create your account, then complete your profile for admin verification.'
              : 'Book shoots, message photographers, and manage everything from one dashboard.'}
          </p>

          <form className="mt-8" onSubmit={onSubmit}>
            <div className="grid gap-4">
              <div>
                <label
                  className="text-sm font-medium text-taupe-700"
                  htmlFor="fullName"
                >
                  Full name
                </label>
                <input
                  id="fullName"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="mt-2 w-full rounded-2xl border border-taupe-100 bg-cream-50 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-burgundy-500/30 text-charcoal-700 placeholder:text-taupe-500"
                  placeholder="e.g., Anshuman Jagani"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-taupe-700" htmlFor="phone">
                  Phone <span className="text-taupe-500 font-normal">(optional)</span>
                </label>
                <input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="mt-2 w-full rounded-2xl border border-taupe-100 bg-cream-50 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-burgundy-500/30 text-charcoal-700 placeholder:text-taupe-500"
                  placeholder="+971 …"
                />
              </div>
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

              <div>
                <label className="text-sm font-medium text-taupe-700" htmlFor="role">
                  Role
                </label>
                <select
                  id="role"
                  value={role}
                  onChange={(e) => setRole(e.target.value as SignupRole)}
                  className="mt-2 w-full rounded-2xl border border-taupe-100 bg-cream-50 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-burgundy-500/30 text-charcoal-700"
                >
                  <option value="client">Client — book &amp; message photographers</option>
                  <option value="photographer">Photographer — list services &amp; accept bookings</option>
                </select>
                <p className="mt-2 text-sm text-taupe-500 italic">
                  Admin accounts are provisioned separately — not available via public signup.
                </p>
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
              {loading ? 'Creating...' : 'Create account'}
            </button>
          </form>

          <div className="mt-6 text-sm text-taupe-700">
            Already have an account?{' '}
            <Link className="font-medium text-burgundy-500 hover:underline" to="/login">
              Login
            </Link>
          </div>
        </section>

        <aside className="rounded-3xl border border-taupe-100 bg-cream-50 p-6 sm:p-8 shadow-sm">
          <div className="text-lg font-serif font-semibold text-charcoal-700">What you get</div>
          <div className="mt-4 space-y-3 text-sm text-taupe-700">
            <div className={`rounded-2xl border p-4 transition-all duration-200 ${role === 'client' ? 'border-burgundy-400 bg-burgundy-50' : 'border-taupe-100 bg-cream-100/60 opacity-50'}`}>
              Client dashboard: bookings + messaging UI.
            </div>
            <div className={`rounded-2xl border p-4 transition-all duration-200 ${role === 'photographer' ? 'border-burgundy-400 bg-burgundy-50' : 'border-taupe-100 bg-cream-100/60 opacity-50'}`}>
              Photographer dashboard: accept/reject booking requests.
            </div>
            <div className="rounded-2xl border border-taupe-100 bg-cream-100/60 p-4 opacity-50">
              Admin dashboard: approve photographers and view bookings.
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}