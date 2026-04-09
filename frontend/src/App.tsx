import { useEffect, useState } from 'react'
import { Route, Routes } from 'react-router-dom'
import Footer from './components/layout/Footer'
import Navbar from './components/layout/Navbar'
import ProtectedRoute from './routes/ProtectedRoute'
import AdminDashboardPage from './pages/dashboard/AdminDashboardPage'
import ClientDashboardPage from './pages/dashboard/ClientDashboardPage'
import PhotographerDashboardPage from './pages/dashboard/PhotographerDashboardPage'
import BookingPage from './pages/public/BookingPage'
import LandingPage from './pages/public/LandingPage'
import PhotographerListPage from './pages/public/PhotographerListPage'
import PhotographerPendingPage from './pages/public/PhotographerPendingPage'
import PhotographerSetupPage from './pages/public/PhotographerSetupPage'
import PhotographerProfilePage from './pages/public/PhotographerProfilePage'
import LoginPage from './pages/auth/LoginPage'
import RegisterPage from './pages/auth/RegisterPage'
import NotFoundPage from './pages/NotFoundPage'
import { ToastProvider } from './components/ui/Toast'
import ErrorBoundary from './components/ErrorBoundary'
import { useAuthStore, type UserRole } from './store/authStore'
import { get } from './lib/api'

export default function App() {
  const { accessToken, user, setUser, logout } = useAuthStore()
  const [booted, setBooted] = useState(false)

  useEffect(() => {
    let cancelled = false
    const bootstrap = async () => {
      if (booted) return
      if (!accessToken) {
        if (!cancelled) setBooted(true)
        return
      }
      if (user) {
        if (!cancelled) setBooted(true)
        return
      }
      try {
        const me = await get<{
          id: string
          email: string
          role: UserRole
          full_name?: string
        }>('/auth/me')
        if (!cancelled) {
          const savedFullName = localStorage.getItem('framefolio_fullname')
          setUser({ id: me.id, email: me.email, role: me.role, fullName: savedFullName || me.full_name })
        }
      } catch {
        // If token is invalid, clear session and let user login again.
        if (!cancelled) logout()
      } finally {
        if (!cancelled) setBooted(true)
      }
    }
    void bootstrap()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, user, setUser, logout])

  if (!booted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-parchment-100">
        <div className="flex items-center gap-3 text-olive-500">
          <div className="h-4 w-4 rounded-full border-2 border-pine-500 border-t-transparent animate-spin" />
          <span className="text-sm font-medium">Loading...</span>
        </div>
      </div>
    )
  }

  return (
    <ToastProvider>
      <div className="min-h-screen flex flex-col bg-parchment-100 text-charcoal-700">
        <Navbar />
        <main className="flex-1 page-transition">
          <ErrorBoundary>
          <Routes>
            {/* Public */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/photographers" element={<PhotographerListPage />} />
            <Route path="/photographers/:id" element={<PhotographerProfilePage />} />
            <Route
              path="/photographers/:id/booking"
              element={<BookingPage />}
            />
            <Route path="/photographer-pending" element={<PhotographerPendingPage />} />
            <Route path="/photographer-setup" element={<PhotographerSetupPage />} />

            {/* Protected */}
            <Route
              path="/dashboard/client"
              element={
                <ProtectedRoute allowedRoles={['client']}>
                  <ClientDashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/photographer"
              element={
                <ProtectedRoute allowedRoles={['photographer']}>
                  <PhotographerDashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/admin"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminDashboardPage />
                </ProtectedRoute>
              }
            />

            <Route path="*" element={<NotFoundPage />} />
          </Routes>
          </ErrorBoundary>
        </main>
        <Footer />
      </div>
    </ToastProvider>
  )
}
