import { Navigate, Outlet } from 'react-router-dom'
import { Box, CircularProgress } from '@mui/material'
import { useAppSelector } from '../../store'

type GuardType = 'public' | 'protected' | 'onboarding' | 'change-password'

function Loading() {
  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <CircularProgress />
    </Box>
  )
}

export default function RouterGuard({ type }: { type: GuardType }) {
  const { isAuthenticated, isLoading, tenantId, mustChangePassword, role } = useAppSelector((s) => s.auth)

  if (isLoading) {
    return type === 'change-password' ? null : <Loading />
  }
  switch (type) {
    case 'public':
      if (isAuthenticated) {
        if (mustChangePassword) return <Navigate to="/trocar-senha" replace />
        return <Navigate to={tenantId ? '/' : '/criar-negocio'} replace />
      }
      break
    case 'protected':
      if (!isAuthenticated) return <Navigate to="/login" replace />
      if (mustChangePassword) return <Navigate to="/trocar-senha" replace />
      break
    case 'onboarding':
      if (!isAuthenticated) return <Navigate to="/login" replace />
      if (mustChangePassword) return <Navigate to="/trocar-senha" replace />
      if (role === 'Employee') return <Navigate to="/" replace />
      if (tenantId) return <Navigate to="/" replace />
      break
    case 'change-password':
      if (!isAuthenticated) return <Navigate to="/login" replace />
      if (!mustChangePassword) return <Navigate to="/" replace />
      break
  }

  return <Outlet />
}
