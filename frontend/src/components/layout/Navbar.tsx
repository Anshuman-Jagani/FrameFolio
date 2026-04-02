import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { 
  Menu, X, ChevronDown, User, 
  LogOut, LayoutDashboard
} from 'lucide-react'

const roleToDashboardPath: Record<string, string> = {
  client: '/dashboard/client',
  photographer: '/dashboard/photographer',
  admin: '/dashboard/admin',
}

export default function Navbar() {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const userMenuRef = useRef<HTMLDivElement>(null)

  const dashboardPath = user ? roleToDashboardPath[user.role] : null

  const closeMobile = () => setMobileOpen(false)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleLogout = () => {
    useAuthStore.getState().logout()
    navigate('/')
  }

  return (
    <header className="sticky top-0 z-50 bg-cream-50/95 backdrop-blur border-b border-taupe-100 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="h-16 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-8">
            <Link
              to={user ? dashboardPath ?? '/' : '/'}
              className="font-serif font-bold text-xl text-burgundy-600 hover:text-burgundy-700 transition-colors"
              onClick={closeMobile}
            >
              FrameFolio
            </Link>

            {/* Desktop Nav */}
            <nav className="hidden lg:flex items-center gap-6">
            </nav>
          </div>

          {/* Right Section */}
          <div className="flex items-center gap-3">
            {/* User Menu - Desktop */}
            {user ? (
              <div className="relative hidden lg:block" ref={userMenuRef}>
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl border border-taupe-100 hover:bg-cream-100 transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-burgundy-100 text-burgundy-700 flex items-center justify-center text-sm font-semibold">
                    {(user.fullName || user.email).charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm font-medium text-charcoal-700 max-w-[120px] truncate">
                    {user.fullName || user.email.split('@')[0]}
                  </span>
                  <ChevronDown className={`w-4 h-4 text-taupe-500 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
                </button>

                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-56 rounded-xl border border-taupe-100 bg-cream-50 shadow-lg overflow-hidden">
                    <div className="px-4 py-3 border-b border-taupe-100">
                      <div className="text-sm font-medium text-charcoal-700 truncate">
                        {user.fullName || 'User'}
                      </div>
                      <div className="text-xs text-taupe-500 truncate">{user.email}</div>
                    </div>
                    <div className="py-2">
                      <button
                        onClick={() => { navigate(dashboardPath ?? '/'); setUserMenuOpen(false) }}
                        className="w-full px-4 py-2 text-left text-sm text-charcoal-700 hover:bg-cream-100 flex items-center gap-3"
                      >
                        <LayoutDashboard className="w-4 h-4 text-taupe-500" />
                        Dashboard
                      </button>
                      <button
                        onClick={() => { navigate(`${dashboardPath}?tab=profile`); setUserMenuOpen(false) }}
                        className="w-full px-4 py-2 text-left text-sm text-charcoal-700 hover:bg-cream-100 flex items-center gap-3"
                      >
                        <User className="w-4 h-4 text-taupe-500" />
                        Profile
                      </button>
                      <hr className="my-2 border-taupe-100" />
                      <button
                        onClick={() => { handleLogout(); setUserMenuOpen(false) }}
                        className="w-full px-4 py-2 text-left text-sm text-rose-600 hover:bg-cream-100 flex items-center gap-3"
                      >
                        <LogOut className="w-4 h-4" />
                        Sign out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Auth Buttons - Desktop */
              <div className="hidden lg:flex items-center gap-3">
                <Link
                  to="/login"
                  className="px-4 py-2 text-sm font-medium text-taupe-700 hover:text-charcoal-700 transition-colors"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="rounded-xl bg-burgundy-500 text-white px-4 py-2 text-sm font-medium hover:bg-burgundy-600 transition-colors"
                >
                  Sign Up
                </Link>
              </div>
            )}

            {/* Hamburger Button - Mobile */}
            <button
              className="lg:hidden flex items-center justify-center p-2 rounded-xl hover:bg-cream-100 transition-colors"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Toggle menu"
            >
              {mobileOpen ? (
                <X className="w-6 h-6 text-charcoal-700" />
              ) : (
                <Menu className="w-6 h-6 text-charcoal-700" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      <div
        className={[
          'lg:hidden overflow-hidden transition-all duration-300 border-t border-taupe-100 bg-cream-50',
          mobileOpen ? 'max-h-screen opacity-100' : 'max-h-0 opacity-0',
        ].join(' ')}
      >
        <div className="px-4 py-4 flex flex-col gap-3">
          {user ? (
            <>
              <div className="px-3 py-2 border-b border-taupe-100">
                <div className="text-sm font-medium text-charcoal-700">{user.fullName || 'User'}</div>
                <div className="text-xs text-taupe-500">{user.email}</div>
              </div>
              <button
                onClick={() => { navigate(dashboardPath ?? '/'); closeMobile() }}
                className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-taupe-700 hover:bg-cream-100 rounded-lg"
              >
                <LayoutDashboard className="w-4 h-4" />
                Dashboard
              </button>
              <button
                onClick={handleLogout}
                className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-rose-600 hover:bg-cream-100 rounded-lg"
              >
                <LogOut className="w-4 h-4" />
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                onClick={closeMobile}
                className="px-3 py-2 text-sm font-medium text-taupe-700 hover:bg-cream-100 rounded-lg"
              >
                Login
              </Link>
              <Link
                to="/register"
                onClick={closeMobile}
                className="rounded-xl bg-burgundy-500 text-white px-4 py-2.5 text-sm font-medium text-center"
              >
                Sign Up
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
