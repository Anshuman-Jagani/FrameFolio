import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore, type UserRole } from '../store/authStore'

type Props = {
  children: ReactNode
  allowedRoles?: UserRole[]
}

const roleDashboard: Record<UserRole, string> = {
  client: '/dashboard/client',
  photographer: '/dashboard/photographer',
  admin: '/dashboard/admin',
}

export default function ProtectedRoute({ children, allowedRoles }: Props) {
  const { user } = useAuthStore()
  const location = useLocation()

  if (!user) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.pathname }}
      />
    )
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to={roleDashboard[user.role]} replace />
  }

  return <>{children}</>
}

