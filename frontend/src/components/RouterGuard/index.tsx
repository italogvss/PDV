import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { Box, CircularProgress } from '@mui/material'
import { useAppSelector } from '../../store'
import { resolvePostLoginPath } from '../../utils/planSelection'

// `dashboard` = `protected` + exige tenant (o shell autenticado quebra sem `X-Tenant-Id`).
// `protected` continua sem exigir tenant para `/assinatura/retorno`, acessível antes do onboarding.
type GuardType = 'public' | 'protected' | 'dashboard' | 'onboarding' | 'change-password'

function Loading() {
  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <CircularProgress />
    </Box>
  )
}

export default function RouterGuard({ type }: { type: GuardType }) {
  const { isAuthenticated, isLoading, tenantId, mustChangePassword, role } = useAppSelector((s) => s.auth)
  const location = useLocation()

  // Preserva a rota pretendida para reenviar o usuário até ela depois do login.
  const loginRedirect = <Navigate to="/login" state={{ from: location.pathname + location.search }} replace />

  if (isLoading) {
    return type === 'change-password' ? null : <Loading />
  }
  switch (type) {
    case 'public':
      if (isAuthenticated) {
        if (mustChangePassword) return <Navigate to="/trocar-senha" replace />
        return <Navigate to={resolvePostLoginPath(tenantId)} replace />
      }
      break
    case 'protected':
      if (!isAuthenticated) return loginRedirect
      if (mustChangePassword) return <Navigate to="/trocar-senha" replace />
      break
    case 'dashboard':
      if (!isAuthenticated) return loginRedirect
      if (mustChangePassword) return <Navigate to="/trocar-senha" replace />
      // Sem tenant o dashboard não funciona — encaminha pro onboarding/planos.
      if (!tenantId) return <Navigate to={resolvePostLoginPath(tenantId)} replace />
      break
    case 'onboarding':
      if (!isAuthenticated) return loginRedirect
      if (mustChangePassword) return <Navigate to="/trocar-senha" replace />
      if (role === 'Employee') return <Navigate to="/" replace />
      if (tenantId) return <Navigate to="/" replace />
      break
    case 'change-password':
      if (!isAuthenticated) return loginRedirect
      if (!mustChangePassword) return <Navigate to="/" replace />
      break
  }

  return <Outlet />
}
