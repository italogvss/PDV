import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  CircularProgress,
  IconButton,
  InputAdornment,
} from '@mui/material'
import LockResetRounded from '@mui/icons-material/LockResetRounded'
import { Visibility, VisibilityOff } from '@mui/icons-material'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAppDispatch } from '../../store'
import { setMustChangePassword } from '../../store/slices/auth.slice'
import { authService } from '../../services/auth.service'
import { useToast } from '../../hooks/useToast'
import { useApiError } from '../../hooks/useApiError'

const schema = z
  .object({
    currentPassword: z.string().min(1, 'Senha atual é obrigatória'),
    newPassword: z
      .string()
      .min(8, 'A nova senha deve ter no mínimo 8 caracteres')
      .regex(/\d/, 'A nova senha deve conter pelo menos um número')
      .regex(/[^a-zA-Z0-9]/, 'A nova senha deve conter pelo menos um caractere especial'),
    confirmPassword: z.string().min(1, 'Confirmação de senha é obrigatória'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'As senhas não coincidem',
    path: ['confirmPassword'],
  })

type ChangePasswordForm = z.infer<typeof schema>

export default function ChangePasswordPage() {
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const showToast = useToast()
  const handleError = useApiError()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ChangePasswordForm>({ resolver: zodResolver(schema) })

  const onSubmit = async (data: ChangePasswordForm) => {
    setIsSubmitting(true)
    try {
      await authService.changePassword(data.currentPassword, data.newPassword)
      dispatch(setMustChangePassword(false))
      showToast('Senha alterada com sucesso!', 'success')
      navigate('/', { replace: true })
    } catch (error) {
      handleError(error, 'Erro ao alterar senha.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
        px: 2,
      }}
    >
      <Card sx={{ width: '100%', maxWidth: 400 }}>
        <CardContent sx={{ p: 4, display: 'flex', flexDirection: 'column', gap: 3 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                bgcolor: 'warning.soft',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <LockResetRounded sx={{ color: 'warning.main', fontSize: 24 }} />
            </Box>
            <Typography variant="h5" sx={{ fontWeight: 700, textAlign: 'center' }}>
              Criar nova senha
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
              Este é seu primeiro acesso. Defina uma senha pessoal para continuar.
            </Typography>
          </Box>

          <Box
            component="form"
            onSubmit={handleSubmit(onSubmit)}
            sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}
          >
            <TextField
              {...register('currentPassword')}
              label="Senha temporária"
              type={showCurrent ? 'text' : 'password'}
              fullWidth
              error={!!errors.currentPassword}
              helperText={errors.currentPassword?.message}
              slotProps={{
                input: {
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={() => setShowCurrent((v) => !v)} edge="end" size="small" tabIndex={-1}>
                        {showCurrent ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                      </IconButton>
                    </InputAdornment>
                  ),
                },
              }}
            />
            <TextField
              {...register('newPassword')}
              label="Nova senha"
              type={showNew ? 'text' : 'password'}
              fullWidth
              error={!!errors.newPassword}
              helperText={
                errors.newPassword?.message ??
                'Mínimo 8 caracteres, com número e caractere especial.'
              }
              slotProps={{
                input: {
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={() => setShowNew((v) => !v)} edge="end" size="small" tabIndex={-1}>
                        {showNew ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                      </IconButton>
                    </InputAdornment>
                  ),
                },
              }}
            />
            <TextField
              {...register('confirmPassword')}
              label="Confirmar nova senha"
              type={showConfirm ? 'text' : 'password'}
              fullWidth
              error={!!errors.confirmPassword}
              helperText={errors.confirmPassword?.message}
              slotProps={{
                input: {
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={() => setShowConfirm((v) => !v)} edge="end" size="small" tabIndex={-1}>
                        {showConfirm ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                      </IconButton>
                    </InputAdornment>
                  ),
                },
              }}
            />

            <Button
              type="submit"
              variant="contained"
              fullWidth
              disabled={isSubmitting}
              startIcon={isSubmitting ? <CircularProgress size={16} color="inherit" /> : undefined}
              sx={{ mt: 1 }}
            >
              {isSubmitting ? 'Salvando...' : 'Confirmar nova senha'}
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  )
}
