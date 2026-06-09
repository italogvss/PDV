import { useEffect, useState } from 'react'
import {
  Box,
  Avatar,
  Button,
  TextField,
  Chip,
  CircularProgress,
} from '@mui/material'
import CheckIcon from '@mui/icons-material/Check'
import FileUploadOutlinedIcon from '@mui/icons-material/FileUploadOutlined'
import { DeleteOutlined } from '@mui/icons-material'
import WorkspacePremiumOutlinedIcon from '@mui/icons-material/WorkspacePremiumOutlined'
import SettingCard from '../../../../components/SettingCard'
import SettingRow from '../../../../components/SettingRow'
import { useAppSelector } from '../../../../store'
import { useUpdateUser } from '../../../../hooks/useUser'
import { formatPhone } from '../../../../utils/phone'

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export default function ProfileSection() {
  const { userId, name: authName, email, phone: authPhone } = useAppSelector((s) => s.auth)
  const updateUser = useUpdateUser()

  const [name, setName] = useState(authName ?? '')
  const [phone, setPhone] = useState(formatPhone(authPhone ?? ''))
  const [cpf] = useState('123.456.789-00')
  const [role] = useState('Proprietário')
  // const [language, setLanguage] = useState('pt-BR')
  const [hasChanges, setHasChanges] = useState(false)

  // Sincroniza o formulário com a sessão (carga inicial e após salvar).
  useEffect(() => {
    setName(authName ?? '')
    setPhone(formatPhone(authPhone ?? ''))
    setHasChanges(false)
  }, [authName, authPhone])

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value)
    setHasChanges(true)
  }

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhone(formatPhone(e.target.value))
    setHasChanges(true)
  }

  const handleCancel = () => {
    setName(authName ?? '')
    setPhone(formatPhone(authPhone ?? ''))
    setHasChanges(false)
  }

  const handleSave = () => {
    if (!userId) return
    updateUser.mutate({
      id: userId,
      payload: { name: name.trim(), phone: phone.trim() || null },
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
                Salvar
              </Button>
            </Box>
          ) : undefined
        }
      >
        <SettingRow label="Foto de perfil" sublabel="JPG ou PNG até 2MB">
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

        <SettingRow label="CPF">
          <TextField
            size="small"
            value={cpf}
            disabled
            sx={{ width: 340 }}
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

      <SettingCard title="Zona de risco" subtitle="Ações permanentes e irreversíveis" danger>
        <SettingRow
          label="Excluir conta"
          sublabel="Remove todos os seus dados pessoais. Os negócios vinculados não são afetados."
        >
          <Button variant="outlined" color="error" sx={{ minWidth: 180 }}>
            Excluir minha conta
          </Button>
        </SettingRow>
      </SettingCard>
    </Box>
  )
}
