import { useEffect, useRef, useState } from 'react'
import {
  Box,
  Avatar,
  Button,
  TextField,
  Chip,
  CircularProgress,
  IconButton,
  InputAdornment,
  Link,
  Radio,
  RadioGroup,
  FormControlLabel,
  Slider,
  Typography,
} from '@mui/material'
import CheckIcon from '@mui/icons-material/Check'
import FileUploadOutlinedIcon from '@mui/icons-material/FileUploadOutlined'
import { DeleteOutlined, Google } from '@mui/icons-material'
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined'
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined'
import WorkspacePremiumOutlinedIcon from '@mui/icons-material/WorkspacePremiumOutlined'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import SettingCard from '../../../../components/SettingCard'
import SettingRow from '../../../../components/SettingRow'
import ConfirmDialog from '../../../../components/ConfirmDialog'
import { useAppSelector } from '../../../../store'
import { useUpdateUser } from '../../../../hooks/useUser'
import { useAccountDeletionPreview, useRequestAccountDeletion } from '../../../../hooks/useAccountDeletion'
import { formatPhone, maskDocument } from '../../../../utils/masks'
import type { AccountDeletionPath } from '../../../../types/account.types'
import { authService } from '../../../../services/auth.service'
import { useToast } from '../../../../hooks/useToast'
import { useApiError } from '../../../../hooks/useApiError'
import { useUserPermissions } from '../../../../hooks/useUserPermissions'
import { useThemeMode } from '../../../../context/ThemeModeContext'
import { useUpdateAppearanceSettings, useUserSettings } from '../../../../hooks/useUserSettings'
import type { AccentColor, AppearancePrefs, AppTheme } from '../../../../types/usersettings.type'
import { TEXT_SIZE_MAX, TEXT_SIZE_MIN } from '../../../../types/usersettings.type'
import { ACCENT_COLORS } from '../../types'

const passwordSchema = z
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

type ChangePasswordForm = z.infer<typeof passwordSchema>

function ThemeCard({
  label,
  selected,
  onClick,
  preview,
}: {
  label: string
  selected: boolean
  onClick: () => void
  preview: 'light' | 'dark'
}) {
  return (
    <Box
      onClick={onClick}
      sx={{
        flex: 1,
        borderRadius: 2,
        border: 2,
        borderColor: selected ? 'secondary.main' : 'border.subtle',
        overflow: 'hidden',
        cursor: 'pointer',
        transition: 'border-color 0.15s',
        '&:hover': { borderColor: selected ? 'secondary.main' : 'border.strong' },
      }}
    >
      <Box sx={{ height: 72, display: 'flex', overflow: 'hidden' }}>
        <Box
          sx={{
            flex: 1,
            bgcolor: preview === 'dark' ? '#1a1a1a' : '#f4f3ef',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-end',
            p: 1.5,
            gap: 0.75,
          }}
        >
          <Box
            sx={{
              height: 6,
              borderRadius: 1,
              bgcolor: preview === 'dark' ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)',
              width: '60%',
            }}
          />
          <Box
            sx={{
              height: 6,
              borderRadius: 1,
              bgcolor: preview === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)',
              width: '40%',
            }}
          />
        </Box>
      </Box>
      <Box
        sx={{
          px: 2,
          py: 1.5,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          bgcolor: 'background.paper',
        }}
      >
        <Typography variant="body2" color="text.primary" sx={{ fontWeight: 500 }}>
          {label}
        </Typography>
        {selected && <CheckIcon sx={{ fontSize: 16, color: 'secondary.main' }} />}
      </Box>
    </Box>
  )
}

const formatDate = (iso: string) => new Date(iso).toLocaleDateString('pt-BR')

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export default function ProfileSection() {
  const { userId, name: authName, email, phone: authPhone, document: authDocument, birthDate: authBirthDate, role: roletype } = useAppSelector((s) => s.auth)
  const updateUser = useUpdateUser()
  const navigate = useNavigate()

  // ── Segurança (alterar senha) ──
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const { isOwner: isOwnerPerm } = useUserPermissions()
  const showToast = useToast()
  const handleError = useApiError()
  const {
    register: registerPassword,
    handleSubmit: handleSubmitPassword,
    reset: resetPassword,
    formState: { errors: passwordErrors, isSubmitting: isSubmittingPassword },
  } = useForm<ChangePasswordForm>({ resolver: zodResolver(passwordSchema) })

  const onSubmitPassword = async (data: ChangePasswordForm) => {
    try {
      await authService.changePassword(data.currentPassword, data.newPassword)
      showToast('Senha alterada com sucesso!', 'success')
      resetPassword()
    } catch (error) {
      handleError(error, 'Erro ao alterar senha.')
    }
  }

  // ── Aparência ──
  const { data: appearanceData, isLoading: appearanceLoading } = useUserSettings()
  const updateAppearance = useUpdateAppearanceSettings()
  const { setPreview, resetPreview } = useThemeMode()
  const [appearanceForm, setAppearanceForm] = useState<AppearancePrefs | null>(null)
  const appearanceInitialized = useRef(false)

  useEffect(() => {
    if (appearanceData && !appearanceInitialized.current) {
      setAppearanceForm(appearanceData.appearance)
      appearanceInitialized.current = true
    }
  }, [appearanceData])

  // Ao sair da seção sem salvar, descarta o preview ao vivo.
  useEffect(() => () => resetPreview(), [resetPreview])

  const setTheme = (theme: AppTheme) => {
    setAppearanceForm((f) => (f ? { ...f, theme } : f))
    setPreview({ mode: theme })
  }
  const setAccent = (accentColor: AccentColor) => {
    setAppearanceForm((f) => (f ? { ...f, accentColor } : f))
    setPreview({ accent: accentColor })
  }
  const setTextSize = (textSize: number) => {
    setAppearanceForm((f) => (f ? { ...f, textSize } : f))
    setPreview({ textSize })
  }

  const appearanceHasChanges =
    !!appearanceData &&
    !!appearanceForm &&
    (appearanceForm.theme !== appearanceData.appearance.theme ||
      appearanceForm.accentColor !== appearanceData.appearance.accentColor ||
      appearanceForm.textSize !== appearanceData.appearance.textSize)

  const handleSaveAppearance = () => {
    if (appearanceForm) updateAppearance.mutate(appearanceForm)
  }

  const handleCancelAppearance = () => {
    if (appearanceData) setAppearanceForm(appearanceData.appearance)
    resetPreview()
  }

  const appearanceSaveAction = appearanceHasChanges ? (
    <Box sx={{ display: 'flex', gap: 1.5 }}>
      <Button variant="outlined" size="small" onClick={handleCancelAppearance} disabled={updateAppearance.isPending}>
        Cancelar
      </Button>
      <Button
        variant="contained"
        size="small"
        color="secondary"
        startIcon={updateAppearance.isPending ? <CircularProgress size={14} color="inherit" /> : <CheckIcon />}
        onClick={handleSaveAppearance}
        disabled={updateAppearance.isPending}
      >
        Salvar alterações
      </Button>
    </Box>
  ) : undefined

  const isOwner = roletype === 'Owner'
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deletePath, setDeletePath] = useState<AccountDeletionPath>('DeleteNow')
  const deletionPreview = useAccountDeletionPreview(deleteOpen)
  const requestDeletion = useRequestAccountDeletion()

  // Reseta o caminho ao (re)abrir — se a assinatura não permitir agendar, só "encerrar agora" vale.
  useEffect(() => {
    if (deleteOpen) setDeletePath('DeleteNow')
  }, [deleteOpen])

  const goToExport = () => {
    setDeleteOpen(false)
    navigate('/configuracoes?tab=backup')
  }

  const preview = deletionPreview.data

  const [name, setName] = useState(authName ?? '')
  const [phone, setPhone] = useState(formatPhone(authPhone ?? ''))
  const [document, setDocument] = useState(maskDocument(authDocument ?? ''))
  const [birthDate, setBirthDate] = useState(authBirthDate ?? '')
  const [role] = useState(roletype === "Owner" ? "Proprietário" : "Funcionário")
  const [hasChanges, setHasChanges] = useState(false)

  // Sincroniza o formulário com a sessão (carga inicial e após salvar).
  useEffect(() => {
    setName(authName ?? '')
    setPhone(formatPhone(authPhone ?? ''))
    setDocument(maskDocument(authDocument ?? ''))
    setBirthDate(authBirthDate ?? '')
    setHasChanges(false)
  }, [authName, authPhone, authDocument, authBirthDate])

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value)
    setHasChanges(true)
  }

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhone(formatPhone(e.target.value))
    setHasChanges(true)
  }

  const handleDocumentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDocument(maskDocument(e.target.value))
    setHasChanges(true)
  }

  const handleBirthDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setBirthDate(e.target.value)
    setHasChanges(true)
  }

  const handleCancel = () => {
    setName(authName ?? '')
    setPhone(formatPhone(authPhone ?? ''))
    setDocument(maskDocument(authDocument ?? ''))
    setBirthDate(authBirthDate ?? '')
    setHasChanges(false)
  }

  const handleSave = () => {
    if (!userId) return
    const rawDocument = document.replace(/\D/g, '') || null
    updateUser.mutate({
      id: userId,
      payload: {
        name: name.trim(),
        phone: phone.trim() || null,
        document: rawDocument,
        birthDate: birthDate || null,
      },
    })
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <SettingCard
        title="Informações pessoais"
        subtitle="Esses dados aparecem para sua equipe e em faturas"
        action={
          hasChanges ? (
            <Box sx={{ display: 'flex', gap: 1.5 }}>
              <Button
                variant="outlined"
                size="small"
                onClick={handleCancel}
                disabled={updateUser.isPending}
              >
                Cancelar
              </Button>
              <Button
                variant="contained"
                color="secondary"
                size="small"
                startIcon={
                  updateUser.isPending ? <CircularProgress size={16} color="inherit" /> : <CheckIcon />
                }
                onClick={handleSave}
                disabled={updateUser.isPending || !name.trim()}
              >
                Salvar alterações
              </Button>
            </Box>
          ) : undefined
        }
      >
        {roletype === "Employee" && (
        <SettingRow label="Foto de perfil" sublabel="JPG ou PNG até 5MB">
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ position: 'relative' }}>
              <Avatar
                sx={{
                  width: 48,
                  height: 48,
                  bgcolor: 'data.orange.main',
                  color: 'common.white',
                  fontSize: 16,
                  fontWeight: 700,
                }}
              >
                {getInitials(name)}
              </Avatar>
              <Box
                sx={{
                  position: 'absolute',
                  right: -2,
                  bottom: -2,
                  width: 16,
                  height: 16,
                  borderRadius: '50%',
                  bgcolor: 'premium.400',
                  border: 2,
                  borderColor: 'background.paper',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <WorkspacePremiumOutlinedIcon sx={{ fontSize: 9, color: 'premium.900' }} />
              </Box>
            </Box>
            <Button variant="outlined" size="small" startIcon={<FileUploadOutlinedIcon />}>
              Alterar
            </Button>
            <Button variant="outlined" size="small" startIcon={<DeleteOutlined />} color="inherit">
              Remover
            </Button>
          </Box>
        </SettingRow>
)}
        <SettingRow label="Nome completo">
          <TextField
            size="small"
            value={name}
            onChange={handleNameChange}
            sx={{ width: 340 }}
          />
        </SettingRow>

        <SettingRow label="E-mail">
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Chip
              label="Verificado"
              size="small"
              icon={<CheckIcon sx={{ fontSize: '14px !important' }} />}
              sx={{
                bgcolor: 'success.soft',
                color: 'success.ink',
                fontWeight: 600,
                '& .MuiChip-icon': { color: 'success.ink' },
              }}
            />
            <TextField
              size="small"
              value={email ?? ''}
              disabled
              sx={{ width: 300 }}
            />
          </Box>
        </SettingRow>

        <SettingRow label="Telefone">
          <TextField
            size="small"
            value={phone}
            onChange={handlePhoneChange}
            placeholder="(99) 99999-9999"
            sx={{ width: 340 }}
          />
        </SettingRow>

        <SettingRow label="CPF / CNPJ">
          <TextField
            size="small"
            value={document}
            onChange={handleDocumentChange}
            placeholder="000.000.000-00"
            sx={{ width: 340 }}
          />
        </SettingRow>

        <SettingRow label="Data de nascimento">
          <TextField
            size="small"
            type="date"
            value={birthDate}
            onChange={handleBirthDateChange}
            sx={{ width: 340 }}
            slotProps={{ htmlInput: { max: new Date().toISOString().split('T')[0] } }}
          />
        </SettingRow>

        <SettingRow label="Cargo">
          <TextField
            size="small"
            value={role}
            disabled
            sx={{ width: 340 }}
          />
        </SettingRow>

        {/* <SettingRow label="Idioma">
          <FormControl size="small" sx={{ width: 340 }}>
            <Select
              value={language}
              onChange={(e) => { setLanguage(e.target.value); setHasChanges(true) }}
            >
              <MenuItem value="pt-BR">Português (Brasil)</MenuItem>
              <MenuItem value="en-US">English (US)</MenuItem>
              <MenuItem value="es">Español</MenuItem>
            </Select>
          </FormControl>
        </SettingRow> */}
      </SettingCard>

      <SettingCard title="Alterar senha" subtitle={isOwnerPerm ? '' : 'Recomendamos trocar a cada 6 meses'}>
        {isOwnerPerm ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, p: 3, height: 300 }}>
            <Google sx={{ fontSize: 48, color: 'text.disabled' }} />
            <Typography variant="body2" color="text.disabled">
              Você fez login com o Google, não é possível alterar a senha por enquanto.
            </Typography>
          </Box>
        ) : (
          <Box component="form" onSubmit={handleSubmitPassword(onSubmitPassword)}>
            <SettingRow label="Senha atual">
              <TextField
                {...registerPassword('currentPassword')}
                size="small"
                type={showCurrent ? 'text' : 'password'}
                sx={{ width: 340 }}
                error={!!passwordErrors.currentPassword}
                helperText={passwordErrors.currentPassword?.message}
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
                {...registerPassword('newPassword')}
                size="small"
                type={showNew ? 'text' : 'password'}
                sx={{ width: 340 }}
                error={!!passwordErrors.newPassword}
                helperText={
                  passwordErrors.newPassword?.message ??
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
              <TextField
                {...registerPassword('confirmPassword')}
                size="small"
                type={showConfirm ? 'text' : 'password'}
                sx={{ width: 340 }}
                error={!!passwordErrors.confirmPassword}
                helperText={passwordErrors.confirmPassword?.message}
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
            </SettingRow>

            <Box sx={{ display: 'flex', justifyContent: 'flex-end', px: 3, pb: 3 }}>
              <Button
                type="submit"
                variant="contained"
                color="secondary"
                disabled={isSubmittingPassword}
                startIcon={isSubmittingPassword ? <CircularProgress size={14} color="inherit" /> : undefined}
              >
                {isSubmittingPassword ? 'Salvando...' : 'Alterar senha'}
              </Button>
            </Box>
          </Box>
        )}
      </SettingCard>

      {appearanceLoading || !appearanceForm ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress size={28} />
        </Box>
      ) : (
        <>
          <SettingCard title="Tema" action={appearanceSaveAction}>
            <Box sx={{ display: 'flex', gap: 2, p: 3 }}>
              <ThemeCard
                label="Claro"
                selected={appearanceForm.theme === 'light'}
                onClick={() => setTheme('light')}
                preview="light"
              />
              <ThemeCard
                label="Escuro"
                selected={appearanceForm.theme === 'dark'}
                onClick={() => setTheme('dark')}
                preview="dark"
              />
            </Box>
          </SettingCard>

          <SettingCard title="Cor de destaque" subtitle="Aplicada em botões, gráficos e indicadores">
            <Box sx={{ px: 4, py: 3, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              {ACCENT_COLORS.map((color) => {
                const selected = appearanceForm.accentColor === color.id
                return (
                  <Box
                    key={color.id}
                    onClick={() => setAccent(color.id)}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      px: 1.5,
                      py: 0.75,
                      borderRadius: 5,
                      border: 2,
                      borderColor: selected ? color.hex : 'transparent',
                      cursor: 'pointer',
                      transition: 'border-color 0.15s',
                      '&:hover': { bgcolor: 'surface.raised' },
                    }}
                  >
                    <Box
                      sx={{
                        width: 20,
                        height: 20,
                        borderRadius: '50%',
                        bgcolor: color.hex,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {selected && <CheckIcon sx={{ fontSize: 12, color: '#fff' }} />}
                    </Box>
                    <Typography variant="body2" color="text.primary" sx={{ fontWeight: 500 }}>
                      {color.label}
                    </Typography>
                  </Box>
                )
              })}
            </Box>
          </SettingCard>

          <SettingCard title="Tamanho do texto" subtitle="Ajusta o tamanho base do texto em todo o sistema">
            <Box sx={{ px: 4, py: 3, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
              <Box
                sx={{
                  p: 2.5,
                  borderRadius: 2,
                  border: 1,
                  borderColor: 'border.subtle',
                  bgcolor: 'surface.sunken',
                }}
              >
                <Typography sx={{ fontSize: appearanceForm.textSize, lineHeight: 1.5, color: 'text.primary' }}>
                  <i>"Se você não consegue amar a si mesmo, como infernos vai amar outra pessoa?"</i> - RuPaul.
                </Typography>
                <Typography sx={{ fontSize: appearanceForm.textSize * 0.8, color: 'text.tertiary', mt: 0.5 }}>
                  Exemplo de texto secundário · {appearanceForm.textSize}px
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5, px: 1 }}>
                <Typography sx={{ fontSize: 13, color: 'text.tertiary' }}>A</Typography>
                <Slider
                  value={appearanceForm.textSize}
                  min={TEXT_SIZE_MIN}
                  max={TEXT_SIZE_MAX}
                  step={1}
                  marks
                  valueLabelDisplay="auto"
                  valueLabelFormat={(v) => `${v}px`}
                  onChange={(_, value) => setTextSize(value as number)}
                  sx={{ flex: 1 }}
                />
                <Typography sx={{ fontSize: 22, color: 'text.tertiary' }}>A</Typography>
              </Box>
            </Box>
          </SettingCard>
        </>
      )}

      {isOwner && (
        <SettingCard title="Zona de risco" subtitle="Ações permanentes e irreversíveis" danger>
          <SettingRow
            label="Encerrar conta"
            sublabel="Encerra sua conta e agenda a exclusão de todos os seus negócios após 30 dias de carência."
          >
            <Button
              variant="outlined"
              color="error"
              sx={{ minWidth: 180 }}
              onClick={() => setDeleteOpen(true)}
            >
              Encerrar minha conta
            </Button>
          </SettingRow>
        </SettingCard>
      )}

      <ConfirmDialog
        open={deleteOpen}
        title="Encerrar minha conta"
        subtitle="Período de carência de 30 dias, reversível"
        danger
        requireAcknowledgment
        acknowledgmentLabel="Entendo que minha conta e todos os meus negócios serão encerrados."
        confirmLabel="Encerrar conta"
        pendingLabel="Encerrando..."
        isPending={requestDeletion.isPending}
        confirmDisabled={deletionPreview.isLoading || preview?.refundInProgress === true}
        onClose={() => setDeleteOpen(false)}
        onConfirm={() => requestDeletion.mutate(deletePath, { onSuccess: () => setDeleteOpen(false) })}
        description={
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <Typography variant="body2" component="div">
              Após confirmar, sua conta e <strong>todos os seus negócios</strong> entram em um período de
              carência de {preview?.graceDays ?? 30} dias. Durante esse tempo a conta fica bloqueada, mas você
              pode reativá-la ou{' '}
              <Link component="button" type="button" onClick={goToExport} sx={{ color: 'inherit', fontWeight: 700 }}>
                baixar seus dados
              </Link>
              . Ao fim do prazo, os dados sem obrigação legal de guarda são apagados definitivamente.
            </Typography>

            {deletionPreview.isLoading && <CircularProgress size={18} />}

            {preview?.refundInProgress && (
              <Typography variant="body2" component="div">
                Há um reembolso em processamento. Aguarde a confirmação do estorno ou fale com o suporte antes
                de encerrar a conta.
              </Typography>
            )}

            {preview?.currentPeriodEnd && (
              <Typography variant="body2" component="div">
                Sua assinatura é válida até <strong>{formatDate(preview.currentPeriodEnd)}</strong>.{' '}
                {preview.withinRefundWindow
                  ? 'Como você está nos primeiros 7 dias, o valor pago será estornado.'
                  : 'Não há reembolso do período restante.'}
              </Typography>
            )}

            {preview?.canScheduleAtPeriodEnd && preview.currentPeriodEnd && (
              <RadioGroup value={deletePath} onChange={(e) => setDeletePath(e.target.value as AccountDeletionPath)}>
                <FormControlLabel
                  value="DeleteNow"
                  control={<Radio size="small" color="error" />}
                  label={<Typography variant="body2">Encerrar agora — perco o acesso imediatamente</Typography>}
                />
                <FormControlLabel
                  value="AtPeriodEnd"
                  control={<Radio size="small" color="error" />}
                  label={
                    <Typography variant="body2">
                      Manter o acesso até {formatDate(preview.currentPeriodEnd)} e só então iniciar a carência
                    </Typography>
                  }
                />
              </RadioGroup>
            )}

            <Typography variant="caption" component="div">
              Reativar a conta <strong>não restaura a assinatura</strong>: para voltar a ter um plano, será
              necessário assinar novamente.
            </Typography>
          </Box>
        }
      />
    </Box>
  )
}
