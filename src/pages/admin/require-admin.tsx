import { Loader2 } from 'lucide-react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'

import { useSession } from '@/hooks/use-session'

export function RequireAdmin() {
  const { session, loading } = useSession()
  const location = useLocation()

  if (loading) {
    return (
      <div className="flex min-h-svh items-center justify-center" role="status">
        <Loader2 className="size-8 animate-spin" />
      </div>
    )
  }

  if (!session) {
    return (
      <Navigate to="/admin/login" state={{ from: location.pathname }} replace />
    )
  }

  return <Outlet />
}
