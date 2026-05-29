import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Box,
  Typography,
  Alert,
  CircularProgress,
  Tab,
  Tabs,
  TextField,
  Button,
} from '@mui/material'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAppDispatch } from '../../store'
import { setAuth } from '../../store/slices/auth.slice'
import { authService } from '../../services/auth.service'
import GoogleSignInButton from '../../components/GoogleSignInButton'
import { useApiError } from '../../hooks/useApiError'

const localSchema = z.object({
  email: z.string().email('E-mail inválido'),
  password: z.string().min(1, 'Senha é obrigatória'),
})

type LocalLoginForm = z.infer<typeof localSchema>

export default function LoginPage() {
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const handleError = useApiError()
  const [tab, setTab] = useState(0)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [googleError, setGoogleError] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LocalLoginForm>({ resolver: zodResolver(localSchema) })

  const handleCredential = useCallback(
    async (credential: string) => {
      setGoogleLoading(true)
      setGoogleError(false)
      try {
        await authService.loginWithGoogle(credential)
        const user = await authService.getMe()
        dispatch(setAuth(user))
        navigate(user.tenantId ? '/' : '/criar-negocio', { replace: true })
      } catch {
        setGoogleError(true)
        setGoogleLoading(false)
      }
    },
    [dispatch, navigate],
  )

  const onLocalSubmit = async (data: LocalLoginForm) => {
    try {
      await authService.loginWithLocal(data.email, data.password)
      const user = await authService.getMe()
      dispatch(setAuth(user))
      navigate(user.mustChangePassword ? '/trocar-senha' : user.tenantId ? '/' : '/criar-negocio', {
        replace: true,
      })
    } catch (error) {
      handleError(error, 'E-mail ou senha incorretos.')
    }
  }

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

      <Box
        sx={{
          width: '100%',
          maxWidth: 400,
          bgcolor: 'background.paper',
          borderRadius: 2,
          border: '1px solid',
          borderColor: 'divider',
          overflow: 'hidden',
        }}
      >
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          variant="fullWidth"
          sx={{ borderBottom: '1px solid', borderColor: 'divider' }}
        >
          <Tab label="Google" />
          <Tab label="Entrar com senha" />
        </Tabs>

        <Box sx={{ p: 3 }}>
          {tab === 0 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
              {googleError && (
                <Alert severity="error" sx={{ width: '100%' }}>
                  Não foi possível autenticar. Tente novamente.
                </Alert>
              )}
              {googleLoading ? (
                <CircularProgress />
              ) : (
                <GoogleSignInButton onCredential={handleCredential} />
              )}
            </Box>
          )}

          {tab === 1 && (
            <Box
              component="form"
              onSubmit={handleSubmit(onLocalSubmit)}
              sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}
            >
              <TextField
                {...register('email')}
                label="E-mail"
                type="email"
                fullWidth
                error={!!errors.email}
                helperText={errors.email?.message}
              />
              <TextField
                {...register('password')}
                label="Senha"
                type="password"
                fullWidth
                error={!!errors.password}
                helperText={errors.password?.message}
              />
              <Button
                type="submit"
                variant="contained"
                color="success"
                fullWidth
                disabled={isSubmitting}
                startIcon={isSubmitting ? <CircularProgress size={16} color="inherit" /> : undefined}
              >
                {isSubmitting ? 'Entrando...' : 'Entrar'}
              </Button>
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  )
}
