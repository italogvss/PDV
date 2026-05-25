import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Box, Typography, Alert, CircularProgress } from '@mui/material'
import { useAppDispatch } from '../../store'
import { setAuth } from '../../store/slices/auth.slice'
import { authService } from '../../services/auth.service'
import GoogleSignInButton from '../../components/GoogleSignInButton'

export default function LoginPage() {
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const [loading, setLoading] = useState(false)
  const [hasError, setHasError] = useState(false)

  const handleCredential = useCallback(
    async (credential: string) => {
      setLoading(true)
      setHasError(false)
      try {
        await authService.loginWithGoogle(credential)
        const user = await authService.getMe()
        dispatch(setAuth(user))
        console.log("User authenticated:", user)
        navigate(user.tenantId ? '/' : '/criar-negocio', { replace: true })
      } catch {
        setHasError(true)
        setLoading(false)
      }
    },
    [dispatch, navigate],
  )

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 3,
        bgcolor: 'background.default',
        px: 2,
      }}
    >
      <Typography variant="h4" fontWeight={700} color="text.primary">
        PDV Ultra
      </Typography>

      <Typography variant="body1" color="text.secondary">
        Gerencie seu negócio com simplicidade
      </Typography>

      {hasError && (
        <Alert severity="error" sx={{ width: '100%', maxWidth: 360 }}>
          Não foi possível autenticar. Tente novamente.
        </Alert>
      )}

      {loading ? (
        <CircularProgress />
      ) : (
        <GoogleSignInButton onCredential={handleCredential} />
      )}
    </Box>
  )
}
