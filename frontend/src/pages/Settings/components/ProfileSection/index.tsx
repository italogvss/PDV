import { useEffect, useState } from 'react'
import {
  Box,
  Avatar,
  Button,
  TextField,
  Chip,
  CircularProgress,
  Link,
  Radio,
  RadioGroup,
  FormControlLabel,
  Typography,
} from '@mui/material'
import CheckIcon from '@mui/icons-material/Check'
import FileUploadOutlinedIcon from '@mui/icons-material/FileUploadOutlined'
import { DeleteOutlined } from '@mui/icons-material'
import WorkspacePremiumOutlinedIcon from '@mui/icons-material/WorkspacePremiumOutlined'
import { useNavigate } from 'react-router-dom'
import SettingCard from '../../../../components/SettingCard'
import SettingRow from '../../../../components/SettingRow'
import ConfirmDialog from '../../../../components/ConfirmDialog'
import { useAppSelector } from '../../../../store'
import { useUpdateUser } from '../../../../hooks/useUser'
import { useAccountDeletionPreview, useRequestAccountDeletion } from '../../../../hooks/useAccountDeletion'
import { formatPhone, maskDocument } from '../../../../utils/masks'
import type { AccountDeletionPath } from '../../../../types/account.types'

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
