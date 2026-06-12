import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Alert,
  Avatar,
  Box,
  Button,
  CircularProgress,
  Divider,
  TextField,
  Typography,
} from '@mui/material'
import ChevronRight from '@mui/icons-material/ChevronRight'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAppDispatch } from '../../store'
import { setAuth } from '../../store/slices/auth.slice'
import { authService } from '../../services/auth.service'
import GoogleSignInButton from '../../components/GoogleSignInButton'
import { useApiError } from '../../hooks/useApiError'
import { CheckCircleOutlined } from '@mui/icons-material'

const RECENT_KEY = 'pdv_recent_accounts'
const MAX_RECENT = 3

interface RecentAccount {
  name: string
  email: string
  avatarUrl: string | null
  role: 'owner' | 'employee'
}

function loadRecent(): RecentAccount[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]')
  } catch {
    return []
  }
}

function saveRecent(account: RecentAccount) {
  const next = [account, ...loadRecent().filter((a) => a.email !== account.email)].slice(0, MAX_RECENT)
  localStorage.setItem(RECENT_KEY, JSON.stringify(next))
}

function getInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return (words[0][0] + words[words.length - 1][0]).toUpperCase()
}

const employeeSchema = z.object({
  email: z.string().email('E-mail inválido'),
  password: z.string().min(1, 'Senha é obrigatória'),
})

type EmployeeForm = z.infer<typeof employeeSchema>
type Role = 'owner' | 'employee'

const FEATURES = [
  'PDV rápido e fechamento de caixa sem fricção',
  'Controle de estoque e alertas de reposição',
  'Permissões por função para toda a equipe',
]

export default function LoginPage() {
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const handleError = useApiError()
  const [role, setRole] = useState<Role>('owner')
  const [googleLoading, setGoogleLoading] = useState(false)
  const [googleError, setGoogleError] = useState(false)
  const [recentAccounts, setRecentAccounts] = useState<RecentAccount[]>([])

  useEffect(() => {
    setRecentAccounts(loadRecent())
  }, [])

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<EmployeeForm>({ resolver: zodResolver(employeeSchema) })

  const handleCredential = useCallback(
    async (credential: string) => {
      setGoogleLoading(true)
      setGoogleError(false)
      try {
        await authService.loginWithGoogle(credential)
        const user = await authService.getMe()
        saveRecent({ name: user.name, email: user.email, avatarUrl: user.avatarUrl, role: 'owner' })
        dispatch(setAuth(user))
        navigate(user.tenantId ? '/' : '/criar-negocio', { replace: true })
      } catch {
        setGoogleError(true)
        setGoogleLoading(false)
      }
    },
    [dispatch, navigate],
  )

  const onEmployeeSubmit = async (data: EmployeeForm) => {
    try {
      await authService.loginWithLocal(data.email, data.password)
      const user = await authService.getMe()
      saveRecent({ name: user.name, email: user.email, avatarUrl: user.avatarUrl, role: 'employee' })
      dispatch(setAuth(user))
      navigate(
        user.mustChangePassword ? '/trocar-senha' : user.tenantId ? '/' : '/criar-negocio',
        { replace: true },
      )
    } catch (error) {
      handleError(error, 'E-mail ou senha incorretos.')
    }
  }

  const filteredRecent = recentAccounts.filter((a) => a.role === role)

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {/* Painel hero (esquerda) */}
      <Box
        sx={{
          display: { xs: 'none', lg: 'flex' },
          flexDirection: 'column',
          justifyContent: 'space-between',
          width: { lg: '45%', xl: '50%' },
          bgcolor: 'accent.800',
          p: { lg: 5, xl: 7 },
        }}
      >
        {/* Logo */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              width: 32,
              height: 32,
              bgcolor: 'accent.500',
              borderRadius: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Typography sx={{ color: 'common.white', fontWeight: 800, fontSize: 14, lineHeight: 1 }}>
              P
            </Typography>
          </Box>
          <Box>
            <Typography sx={{ color: 'common.white', fontWeight: 700, fontSize: 15, lineHeight: 1.2 }}>
              PDV Ultra
            </Typography>
            <Typography sx={{ color: 'accent.300', fontSize: 11, lineHeight: 1.2 }}>
              gestão para pequenos comércios
            </Typography>
          </Box>
        </Box>

        {/* Texto hero + bullets */}
        <Box>
          <Typography
            sx={{
              color: 'common.white',
              fontWeight: 800,
              fontSize: { lg: '2rem', xl: '2.6rem' },
              lineHeight: 1.15,
              mb: 2.5,
            }}
          >
            Vendas, estoque e equipe sob controle — todo dia.
          </Typography>
          <Typography sx={{ color: 'accent.200', fontSize: '0.95rem', mb: 4, lineHeight: 1.65, maxWidth: 440 }}>
            Do PDV ao fechamento de caixa, o PDV Ultra organiza a rotina do seu comércio com a simplicidade que você precisa.
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {FEATURES.map((f) => (
              <Box key={f} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <CheckCircleOutlined sx={{ fontSize: 18, color: 'accent.400', flexShrink: 0 }} />
                <Typography sx={{ color: 'accent.100', fontSize: '0.9rem' }}>{f}</Typography>
              </Box>
            ))}
          </Box>
        </Box>

        <Typography sx={{ color: 'accent.600', fontSize: 12 }}>
          © {new Date().getFullYear()} PDV Ultra · Privacidade · Suporte
        </Typography>
      </Box>

      {/* Painel do formulário (direita) */}
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'background.paper',
          px: { xs: 3, sm: 6 },
          py: 6,
          overflowY: 'auto',
        }}
      >
        <Box sx={{ width: '100%', maxWidth: 420 }}>
          {/* Título */}
          <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.75 }}>
            {role === 'owner' ? 'Bem-vindo de volta' : 'Acesso da equipe'}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3.5 }}>
            {role === 'owner'
              ? 'Selecione a opção de seu estabelecimento como proprietário'
              : 'Entre com o e-mail e a senha configurados para você'}
          </Typography>

          {/* Toggle de papel */}
          <Box
            sx={{
              display: 'flex',
              bgcolor: 'surface.sunken',
              borderRadius: 2,
              p: 0.5,
              mb: 3.5,
            }}
          >
            {(['owner', 'employee'] as const).map((r) => (
              <Button
                key={r}
                onClick={() => setRole(r)}
                fullWidth
                disableElevation
                sx={{
                  py: 0.75,
                  borderRadius: 1.5,
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  transition: 'all 0.15s',
                  bgcolor: role === r ? 'background.paper' : 'transparent',
                  color: role === r ? 'text.primary' : 'text.tertiary',
                  boxShadow: role === r ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                  '&:hover': {
                    bgcolor: role === r ? 'background.paper' : 'surface.raised',
                  },
                }}
              >
                {r === 'owner' ? 'Proprietário' : 'Funcionário'}
              </Button>
            ))}
          </Box>

          {/* Formulário de autenticação */}
          {role === 'owner' ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
              {googleError && (
                <Alert severity="error" sx={{ width: '100%' }}>
                  Não foi possível autenticar. Tente novamente.
                </Alert>
              )}
              {googleLoading ? (
                <CircularProgress size={28} />
              ) : (
                <GoogleSignInButton onCredential={handleCredential} />
              )}
            </Box>
          ) : (
            <Box
              component="form"
              onSubmit={handleSubmit(onEmployeeSubmit)}
              sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}
            >
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.75, fontWeight: 500 }}>
                  E-mail do trabalho
                </Typography>
                <TextField
                  {...register('email')}
                  type="email"
                  fullWidth
                  placeholder="seu@email.com"
                  error={!!errors.email}
                  helperText={errors.email?.message}
                />
              </Box>
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.75 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
                    Senha
                  </Typography>
                  <Typography
                    variant="caption"
                    color="success.main"
                    sx={{ cursor: 'pointer', fontWeight: 600 }}
                  >
                    Esqueci a senha
                  </Typography>
                </Box>
                <TextField
                  {...register('password')}
                  type="password"
                  fullWidth
                  placeholder="••••••••"
                  error={!!errors.password}
                  helperText={errors.password?.message}
                />
              </Box>
              <Button
                type="submit"
                variant="contained"
                color="success"
                fullWidth
                size="large"
                disabled={isSubmitting}
                startIcon={isSubmitting ? <CircularProgress size={16} color="inherit" /> : undefined}
                sx={{ mt: 0.5 }}
              >
                {isSubmitting ? 'Entrando...' : 'Entrar'}
              </Button>
            </Box>
          )}

          {/* Contas recentes */}
          {filteredRecent.length > 0 && (
            <>
              <Divider sx={{ my: 3 }}>
                <Typography variant="caption" color="text.disabled" sx={{ px: 1 }}>
                  ou
                </Typography>
              </Divider>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {filteredRecent.map((account) => (
                  <Box
                    key={account.email}
                    onClick={() => {
                      if (role === 'employee') setValue('email', account.email)
                    }}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1.5,
                      p: 1.5,
                      borderRadius: 2,
                      border: '1px solid',
                      borderColor: 'border.subtle',
                      cursor: role === 'employee' ? 'pointer' : 'default',
                      transition: 'background-color 0.15s',
                      '&:hover': {
                        bgcolor: role === 'employee' ? 'surface.sunken' : 'transparent',
                      },
                    }}
                  >
                    <Avatar
                      src={account.avatarUrl ?? undefined}
                      sx={{ width: 36, height: 36, bgcolor: 'accent.600', fontSize: 13, fontWeight: 600, flexShrink: 0 }}
                    >
                      {getInitials(account.name)}
                    </Avatar>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
                        {account.name}
                      </Typography>
                      <Typography variant="caption" color="text.tertiary" noWrap sx={{ display: 'block' }}>
                        {account.email}
                      </Typography>
                    </Box>
                    {role === 'employee' && (
                      <ChevronRight sx={{ fontSize: 18, color: 'text.disabled', flexShrink: 0 }} />
                    )}
                  </Box>
                ))}
              </Box>
            </>
          )}

          {/* Rodapé */}
          <Typography
            variant="caption"
            color="text.tertiary"
            sx={{ display: 'block', textAlign: 'center', mt: 4 }}
          >
            Não tem uma conta?{' '}
            <Typography
              component="span"
              variant="caption"
              color="success.main"
              sx={{ cursor: 'pointer', fontWeight: 600 }}
              onClick={() => setRole('owner')}
            >
              Criar conta
            </Typography>
          </Typography>
        </Box>
      </Box>
    </Box>
  )
}
