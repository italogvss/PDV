import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { Box, CircularProgress } from '@mui/material'
import { useAppSelector } from '../../store'
import { resolvePostLoginPath } from '../../utils/planSelection'

// `dashboard` = `protected` + exige tenant (o shell autenticado quebra sem `X-Tenant-Id`).
// `protected` continua sem exigir tenant para `/assinatura/retorno`, acessível antes do onboarding.
// `admin` = área de administração da plataforma (role Admin), isolada do app de loja e sem exigir tenant.
type GuardType = 'public' | 'protected' | 'dashboard' | 'onboarding' | 'change-password' | 'admin'

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

  // Isolamento: o Admin de plataforma vive só no /admin (não tem tenant → o app de loja quebraria).
  // Encaminha-o de qualquer rota que não seja a de admin. Exceção: quando precisa trocar a senha,
  // deixa o fluxo de change-password seguir.
  if (isAuthenticated && !mustChangePassword && role === 'Admin' && type !== 'admin') {
    return <Navigate to="/admin" replace />
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
    case 'admin':
      if (!isAuthenticated) return loginRedirect
      if (mustChangePassword) return <Navigate to="/trocar-senha" replace />
      // Só o operador de plataforma entra. Qualquer outro papel volta pro app de loja.
      if (role !== 'Admin') return <Navigate to="/" replace />
      break
  }

  return <Outlet />
}
