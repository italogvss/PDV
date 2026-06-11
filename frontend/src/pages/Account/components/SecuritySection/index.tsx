import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined'
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined'
import {
  Box,
  Button,
  CircularProgress,
  IconButton,
  InputAdornment,
  TextField,
  Typography,
} from '@mui/material'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import SettingCard from '../../../../components/SettingCard'
import SettingRow from '../../../../components/SettingRow'
import { useAppSelector } from '../../../../store'
import { Google } from '@mui/icons-material'
import { authService } from '../../../../services/auth.service'
import { useToast } from '../../../../hooks/useToast'
import { useApiError } from '../../../../hooks/useApiError'

const schema = z
  .object({
    currentPassword: z.string().min(1, 'Senha atual é obrigatória'),
    newPassword: z
      .string()
      .min(8, 'A senha deve ter no mínimo 8 caracteres')
      .regex(/\d/, 'A senha deve conter pelo menos um número')
      .regex(/[^a-zA-Z0-9]/, 'A senha deve conter pelo menos um caractere especial'),
    confirmPassword: z.string().min(1, 'Confirmação de senha é obrigatória'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'As senhas não coincidem',
    path: ['confirmPassword'],
  })

type ChangePasswordForm = z.infer<typeof schema>

export default function SecuritySection() {
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const { role } = useAppSelector((s) => s.auth)
  const isOwner = role === 'Owner'
  const showToast = useToast()
  const handleError = useApiError()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordForm>({ resolver: zodResolver(schema) })

  const onSubmit = async (data: ChangePasswordForm) => {
    try {
      await authService.changePassword(data.currentPassword, data.newPassword)
      showToast('Senha alterada com sucesso!', 'success')
      reset()
    } catch (error) {
      handleError(error, 'Erro ao alterar senha.')
    }
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <SettingCard title="Alterar senha" subtitle={isOwner ? '' : 'Recomendamos trocar a cada 6 meses'}>
        {isOwner ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, p: 3, height: 300 }}>
            <Google sx={{ fontSize: 48, color: 'text.disabled' }} />
            <Typography variant="body2" color="text.disabled">
              Você fez login com o Google, não é possível alterar a senha por enquanto.
            </Typography>
          </Box>
        ) : (
          <Box component="form" onSubmit={handleSubmit(onSubmit)}>
            <SettingRow label="Senha atual">
              <TextField
                {...register('currentPassword')}
                size="small"
                type={showCurrent ? 'text' : 'password'}
                sx={{ width: 340 }}
                error={!!errors.currentPassword}
                helperText={errors.currentPassword?.message}
                slotProps={{
                  input: {
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton size="small" onClick={() => setShowCurrent((v) => !v)} edge="end" tabIndex={-1}>
                          {showCurrent
                            ? <VisibilityOffOutlinedIcon fontSize="small" />
                            : <VisibilityOutlinedIcon fontSize="small" />
                          }
                        </IconButton>
                      </InputAdornment>
                    ),
                  },
                }}
              />
            </SettingRow>

            <SettingRow label="Nova senha">
              <TextField
                {...register('newPassword')}
                size="small"
                type={showNew ? 'text' : 'password'}
                sx={{ width: 340 }}
                error={!!errors.newPassword}
                helperText={
                  errors.newPassword?.message ??
                  'Mínimo 8 caracteres, com número e caractere especial.'
                }
                slotProps={{
                  input: {
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton size="small" onClick={() => setShowNew((v) => !v)} edge="end" tabIndex={-1}>
                          {showNew
                            ? <VisibilityOffOutlinedIcon fontSize="small" />
                            : <VisibilityOutlinedIcon fontSize="small" />
                          }
                        </IconButton>
                      </InputAdornment>
                    ),
                  },
                }}
              />
            </SettingRow>

            <SettingRow label="Confirmar nova senha">
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                <TextField
                  {...register('confirmPassword')}
                  size="small"
                  type={showConfirm ? 'text' : 'password'}
                  sx={{ width: 260 }}
                  error={!!errors.confirmPassword}
                  helperText={errors.confirmPassword?.message}
                  slotProps={{
                    input: {
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton size="small" onClick={() => setShowConfirm((v) => !v)} edge="end" tabIndex={-1}>
                            {showConfirm
                              ? <VisibilityOffOutlinedIcon fontSize="small" />
                              : <VisibilityOutlinedIcon fontSize="small" />
                            }
                          </IconButton>
                        </InputAdornment>
                      ),
                    },
                  }}
                />
                <Button
                  type="submit"
                  variant="contained"
                  color="secondary"
                  size="small"
                  disabled={isSubmitting}
                  startIcon={isSubmitting ? <CircularProgress size={14} color="inherit" /> : undefined}
                  sx={{ mt: 0.5 }}
                >
                  {isSubmitting ? 'Salvando...' : 'Alterar senha'}
                </Button>
              </Box>
            </SettingRow>
          </Box>
        )}
      </SettingCard>

      {/* <SettingCard
        title="Autenticação em dois fatores (2FA)"
        subtitle="Camada extra de segurança ao entrar na conta"
        action={
          <Chip
            label="Ativado"
            size="small"
            sx={{ bgcolor: 'success.soft', color: 'success.ink', fontWeight: 600 }}
          />
        }
      >
        <SettingRow label="App autenticador" sublabel="Google Authenticator ou similar">
          <Box sx={{ display: 'flex', gap: 1.5 }}>
            <Chip
              label="Configurado"
              size="small"
              sx={{ bgcolor: 'success.soft', color: 'success.ink', fontWeight: 600 }}
            />
            <Button variant="outlined" size="small">
              Reconfigurar
            </Button>
          </Box>
        </SettingRow>

        <SettingRow label="Códigos por SMS" sublabel="Receber código no celular (11) ••• •••-4321">
          <Button variant="outlined" size="small">
            Ativar
          </Button>
        </SettingRow>

        <SettingRow label="Códigos de backup" sublabel="10 códigos para emergência (5 já usados)">
          <Button variant="outlined" size="small" startIcon={<FileDownloadOutlinedIcon />}>
            Baixar códigos
          </Button>
        </SettingRow>
      </SettingCard> */}
    </Box>
  )
}
