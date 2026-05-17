import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAppSelector } from '../../store'
import { ProtectedRouteProps } from './types'

export default function ProtectedRoute({ redirectTo = '/login' }: ProtectedRouteProps) {
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated)
  const location = useLocation()

  if (!isAuthenticated) {
    return <Navigate to={redirectTo} replace state={{ from: location }} />
  }

  return <Outlet />
}
