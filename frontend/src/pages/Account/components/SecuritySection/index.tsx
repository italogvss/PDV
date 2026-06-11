import { useState } from 'react'
import {
  Box,
  TextField,
  Button,
  Chip,
  InputAdornment,
  IconButton,
} from '@mui/material'
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined'
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined'
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined'
import SettingCard from '../../../../components/SettingCard'
import SettingRow from '../../../../components/SettingRow'

export default function SecuritySection() {
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('••••••••')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <SettingCard title="Senha" subtitle="Recomendamos trocar a cada 6 meses">
        <SettingRow label="Senha atual">
          <TextField
            size="small"
            type={showCurrent ? 'text' : 'password'}
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            sx={{ width: 340 }}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => setShowCurrent((v) => !v)} edge="end">
                    {showCurrent
                      ? <VisibilityOffOutlinedIcon fontSize="small" />
                      : <VisibilityOutlinedIcon fontSize="small" />
                    }
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
        </SettingRow>

        <SettingRow label="Nova senha">
          <TextField
            size="small"
            type={showNew ? 'text' : 'password'}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Mín. 8 caracteres"
            sx={{ width: 340 }}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => setShowNew((v) => !v)} edge="end">
                    {showNew
                      ? <VisibilityOffOutlinedIcon fontSize="small" />
                      : <VisibilityOutlinedIcon fontSize="small" />
                    }
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
        </SettingRow>

        <SettingRow label="Confirmar nova senha">
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <TextField
              size="small"
              type={showConfirm ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              sx={{ width: 260 }}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setShowConfirm((v) => !v)} edge="end">
                      {showConfirm
                        ? <VisibilityOffOutlinedIcon fontSize="small" />
                        : <VisibilityOutlinedIcon fontSize="small" />
                      }
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            <Button variant="contained" color="secondary" size="small">
              Alterar senha
            </Button>
          </Box>
        </SettingRow>
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
