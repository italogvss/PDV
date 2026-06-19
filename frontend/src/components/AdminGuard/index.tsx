import { Navigate, Outlet } from 'react-router-dom'
import { useAppSelector } from '../../store'

export default function AdminGuard() {
  const role = useAppSelector((s) => s.auth.role)

  if (role !== 'Admin') {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}
