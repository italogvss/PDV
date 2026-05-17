import { useState } from 'react'
import {
  Box,
  Avatar,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  Chip,
} from '@mui/material'
import CheckIcon from '@mui/icons-material/Check'
import FileUploadOutlinedIcon from '@mui/icons-material/FileUploadOutlined'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import WorkspacePremiumOutlinedIcon from '@mui/icons-material/WorkspacePremiumOutlined'
import SettingCard from '../../../../components/SettingCard'
import SettingRow from '../../../../components/SettingRow'

export default function ProfileSection() {
  const [name, setName] = useState('Marcos Almeida')
  const [email] = useState('marcos.almeida@cafedaesquina.com.br')
  const [phone, setPhone] = useState('(11) 98765-4321')
  const [cpf, setCpf] = useState('123.456.789-00')
  const [role, setRole] = useState('Proprietário')
  const [language, setLanguage] = useState('pt-BR')
  const [timezone, setTimezone] = useState('america_sao_paulo')
  const [hasChanges, setHasChanges] = useState(false)

  const handleChange = (setter: (v: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setter(e.target.value)
    setHasChanges(true)
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <SettingCard
        title="Informações pessoais"
        subtitle="Esses dados aparecem para sua equipe e em faturas"
        action={
          hasChanges ? (
            <Box sx={{ display: 'flex', gap: 1.5 }}>
              <Button variant="outlined" size="small" onClick={() => setHasChanges(false)}>
                Cancelar
              </Button>
              <Button
                variant="contained"
                color="secondary"
                size="small"
                startIcon={<CheckIcon />}
                onClick={() => setHasChanges(false)}
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
                MA
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
            <Button variant="outlined" size="small" startIcon={<DeleteOutlineIcon />} color="inherit">
              Remover
            </Button>
          </Box>
        </SettingRow>

        <SettingRow label="Nome completo">
          <TextField
            size="small"
            value={name}
            onChange={handleChange(setName)}
            sx={{ width: 340 }}
          />
        </SettingRow>

        <SettingRow label="E-mail">
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <TextField
              size="small"
              value={email}
              inputProps={{ readOnly: true }}
              sx={{ width: 300 }}
            />
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
          </Box>
        </SettingRow>

        <SettingRow label="Telefone">
          <TextField
            size="small"
            value={phone}
            onChange={handleChange(setPhone)}
            sx={{ width: 340 }}
          />
        </SettingRow>

        <SettingRow label="CPF">
          <TextField
            size="small"
            value={cpf}
            onChange={handleChange(setCpf)}
            sx={{ width: 340 }}
          />
        </SettingRow>

        <SettingRow label="Cargo">
          <TextField
            size="small"
            value={role}
            onChange={handleChange(setRole)}
            sx={{ width: 340 }}
          />
        </SettingRow>

        <SettingRow label="Idioma">
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
        </SettingRow>

        <SettingRow label="Fuso horário">
          <FormControl size="small" sx={{ width: 340 }}>
            <Select
              value={timezone}
              onChange={(e) => { setTimezone(e.target.value); setHasChanges(true) }}
            >
              <MenuItem value="america_sao_paulo">São Paulo — GMT-3</MenuItem>
              <MenuItem value="america_manaus">Manaus — GMT-4</MenuItem>
              <MenuItem value="america_belem">Belém — GMT-3</MenuItem>
              <MenuItem value="america_fortaleza">Fortaleza — GMT-3</MenuItem>
              <MenuItem value="america_noronha">Fernando de Noronha — GMT-2</MenuItem>
            </Select>
          </FormControl>
        </SettingRow>
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
