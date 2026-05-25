import { Navigate, Outlet } from 'react-router-dom'
import { Box, CircularProgress } from '@mui/material'
import { useAppSelector } from '../../store'

export default function OnboardingRoute() {
  const { isAuthenticated, isLoading, tenantId } = useAppSelector((state) => state.auth)

  if (isLoading) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress />
      </Box>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (tenantId) {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}
