import { Navigate, Outlet } from 'react-router-dom'
import { useAppSelector } from '../../store'
import { PublicRouteProps } from './types'

export default function PublicRoute({ redirectTo = '/' }: PublicRouteProps) {
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated)

  if (isAuthenticated) {
    return <Navigate to={redirectTo} replace />
  }

  return <Outlet />
}
