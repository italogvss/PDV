import {
  Box,
  Typography,
  Chip,
  Button,
  Select,
  MenuItem,
  FormControl,
  Switch,
  IconButton,
} from '@mui/material'
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined'
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined'
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined'
import PeopleOutlinedIcon from '@mui/icons-material/PeopleOutlined'
import AccountBalanceWalletOutlinedIcon from '@mui/icons-material/AccountBalanceWalletOutlined'
import BarChartOutlinedIcon from '@mui/icons-material/BarChartOutlined'
import GroupsOutlinedIcon from '@mui/icons-material/GroupsOutlined'
import DatasetOutlinedIcon from '@mui/icons-material/DatasetOutlined'
import { useState } from 'react'
import SettingCard from '../../../../components/SettingCard'
import SettingRow from '../../../../components/SettingRow'

interface BackupEntry {
  id: string
  date: string
  size: string
  status: 'success' | 'failed'
}

const BACKUPS: BackupEntry[] = [
  { id: '1', date: '14/05/2026 03:00', size: '24.8 MB', status: 'success' },
  { id: '2', date: '13/05/2026 03:00', size: '24.6 MB', status: 'success' },
  { id: '3', date: '12/05/2026 03:00', size: '24.4 MB', status: 'success' },
  { id: '4', date: '11/05/2026 03:00', size: '—', status: 'failed' },
  { id: '5', date: '10/05/2026 03:00', size: '23.9 MB', status: 'success' },
]

const EXPORT_CATEGORIES = [
  { id: 'sales', label: 'Vendas', icon: ReceiptLongOutlinedIcon },
  { id: 'products', label: 'Produtos', icon: Inventory2OutlinedIcon },
  { id: 'customers', label: 'Clientes', icon: PeopleOutlinedIcon },
  { id: 'expenses', label: 'Despesas', icon: AccountBalanceWalletOutlinedIcon },
  { id: 'billing', label: 'Faturamento', icon: BarChartOutlinedIcon },
  { id: 'team', label: 'Equipe', icon: GroupsOutlinedIcon },
]

export default function BackupSection() {
  const [autoBackup, setAutoBackup] = useState(true)
  const [frequency, setFrequency] = useState('daily')
  const [backupTime, setBackupTime] = useState('03:00')
  const [retention, setRetention] = useState('30')

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <SettingCard title="Backup automático" subtitle="Cópias de segurança agendadas">
        <SettingRow label="Ativar backup automático">
          <Switch
            checked={autoBackup}
            onChange={(e) => setAutoBackup(e.target.checked)}
            color="secondary"
          />
        </SettingRow>

        <SettingRow label="Frequência">
          <FormControl size="small" sx={{ width: 200 }} disabled={!autoBackup}>
            <Select value={frequency} onChange={(e) => setFrequency(e.target.value)}>
              <MenuItem value="daily">Diário</MenuItem>
              <MenuItem value="weekly">Semanal</MenuItem>
              <MenuItem value="monthly">Mensal</MenuItem>
            </Select>
          </FormControl>
        </SettingRow>

        <SettingRow label="Horário">
          <FormControl size="small" sx={{ width: 200 }} disabled={!autoBackup}>
            <Select value={backupTime} onChange={(e) => setBackupTime(e.target.value)}>
              <MenuItem value="00:00">00:00</MenuItem>
              <MenuItem value="01:00">01:00</MenuItem>
              <MenuItem value="02:00">02:00</MenuItem>
              <MenuItem value="03:00">03:00</MenuItem>
              <MenuItem value="04:00">04:00</MenuItem>
            </Select>
          </FormControl>
        </SettingRow>

        <SettingRow label="Retenção">
          <FormControl size="small" sx={{ width: 200 }} disabled={!autoBackup}>
            <Select value={retention} onChange={(e) => setRetention(e.target.value)}>
              <MenuItem value="7">7 dias</MenuItem>
              <MenuItem value="14">14 dias</MenuItem>
              <MenuItem value="30">30 dias</MenuItem>
              <MenuItem value="90">90 dias</MenuItem>
            </Select>
          </FormControl>
        </SettingRow>
      </SettingCard>

      <SettingCard
        title="Backups recentes"
        action={
          <Button variant="outlined" size="small" startIcon={<FileDownloadOutlinedIcon />}>
            Baixar todos
          </Button>
        }
      >
        {BACKUPS.map((backup) => (
          <Box
            key={backup.id}
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              px: 4,
              py: 2.5,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box
                sx={{
                  width: 36,
                  height: 36,
                  borderRadius: 2,
                  bgcolor: 'surface.raised',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <DatasetOutlinedIcon sx={{ fontSize: 18, color: 'text.tertiary' }} />
              </Box>
              <Box>
                <Typography variant="body2" fontWeight={500} color="text.primary">
                  {backup.date}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {backup.size}
                </Typography>
              </Box>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Chip
                label={backup.status === 'success' ? 'Sucesso' : 'Falhou'}
                size="small"
                sx={
                  backup.status === 'success'
                    ? { bgcolor: 'success.soft', color: 'success.ink', fontWeight: 600 }
                    : { bgcolor: 'error.soft', color: 'error.ink', fontWeight: 600 }
                }
              />
              <IconButton size="small" disabled={backup.status === 'failed'}>
                <FileDownloadOutlinedIcon fontSize="small" />
              </IconButton>
            </Box>
          </Box>
        ))}
      </SettingCard>

      <SettingCard title="Exportar dados" subtitle="Gera um arquivo com todos os registros">
        <Box
          sx={{
            p: 3,
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 2,
          }}
        >
          {EXPORT_CATEGORIES.map((cat) => {
            const Icon = cat.icon
            return (
              <Button
                key={cat.id}
                variant="outlined"
                startIcon={<Icon />}
                endIcon={<FileDownloadOutlinedIcon />}
                sx={{
                  justifyContent: 'space-between',
                  px: 2,
                  py: 1.5,
                  fontWeight: 500,
                  '& .MuiButton-endIcon': { marginLeft: 'auto' },
                }}
              >
                {cat.label}
              </Button>
            )
          })}
        </Box>
      </SettingCard>
    </Box>
  )
}
