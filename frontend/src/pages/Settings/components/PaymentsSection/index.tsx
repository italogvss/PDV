import { useState } from 'react'
import {
  Box,
  Typography,
  Switch,
  Button,
  Chip,
  IconButton,
  Select,
  MenuItem,
  FormControl,
  TextField,
  Divider,
} from '@mui/material'
import PixIcon from '@mui/icons-material/Pix'
import CreditCardIcon from '@mui/icons-material/CreditCard'
import AttachMoneyIcon from '@mui/icons-material/AttachMoney'
import LocalOfferOutlinedIcon from '@mui/icons-material/LocalOfferOutlined'
import OpenInNewOutlinedIcon from '@mui/icons-material/OpenInNewOutlined'
import AddIcon from '@mui/icons-material/Add'
import MoreHorizIcon from '@mui/icons-material/MoreHoriz'
import CheckIcon from '@mui/icons-material/Check'
import SettingCard from '../../../../components/SettingCard'
import SettingRow from '../../../../components/SettingRow'

interface PaymentMethod {
  id: string
  label: string
  subtitle: string
  icon: React.ElementType
}

const PAYMENT_METHODS: PaymentMethod[] = [
  { id: 'pix', label: 'Pix', subtitle: 'Sem taxa', icon: PixIcon },
  { id: 'card_credit', label: 'Cartão crédito', subtitle: 'Taxa média 3,2%', icon: CreditCardIcon },
  { id: 'card_debit', label: 'Cartão débito', subtitle: 'Taxa 1,5%', icon: CreditCardIcon },
  { id: 'cash', label: 'Dinheiro', subtitle: 'Sem taxa', icon: AttachMoneyIcon },
  { id: 'voucher', label: 'Voucher / VR', subtitle: 'Taxa média 5,5%', icon: LocalOfferOutlinedIcon },
  { id: 'payment_link', label: 'Link de pagamento', subtitle: 'Taxa 3,9%', icon: OpenInNewOutlinedIcon },
]

interface Machine {
  id: string
  name: string
  serial: string
  battery: number
  status: 'connected' | 'offline'
}

const MACHINES: Machine[] = [
  { id: '1', name: 'Cielo LIO V3', serial: 'SN CL-V3-882041', battery: 84, status: 'connected' },
  { id: '2', name: 'Stone Ton T2', serial: 'SN STN-T2-118903', battery: 62, status: 'connected' },
]

export default function PaymentsSection() {
  const [enabledMethods, setEnabledMethods] = useState<Record<string, boolean>>({
    pix: true,
    card_credit: true,
    card_debit: true,
    cash: true,
    voucher: false,
    payment_link: false,
  })
  const [pixKeyType, setPixKeyType] = useState('cnpj')
  const [pixKey, setPixKey] = useState('12.345.678/0001-90')

  const toggleMethod = (id: string) => {
    setEnabledMethods((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <SettingCard
        title="Métodos aceitos"
        subtitle="Aparecem como opções no fechamento da venda"
      >
        <Box sx={{ p: 3, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2 }}>
          {PAYMENT_METHODS.map((method) => {
            const enabled = enabledMethods[method.id]
            const Icon = method.icon
            return (
              <Box
                key={method.id}
                sx={{
                  p: 2.5,
                  borderRadius: 2,
                  border: 1,
                  borderColor: enabled ? 'success.soft' : 'border.subtle',
                  bgcolor: enabled ? 'success.soft' : 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 1,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
                onClick={() => toggleMethod(method.id)}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Icon
                    sx={{
                      fontSize: 20,
                      color: enabled ? 'success.main' : 'text.tertiary',
                    }}
                  />
                  <Box>
                    <Typography variant="body2" color="text.primary" sx={{ fontWeight: 600 }}>
                      {method.label}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {method.subtitle}
                    </Typography>
                  </Box>
                </Box>
                <Switch
                  checked={enabled}
                  onChange={() => toggleMethod(method.id)}
                  color="secondary"
                  size="small"
                  onClick={(e) => e.stopPropagation()}
                />
              </Box>
            )
          })}
        </Box>
      </SettingCard>

      <SettingCard
        title="Maquininhas conectadas"
        subtitle={`${MACHINES.length} dispositivos pareados`}
        action={
          <Button variant="contained" color="secondary" size="small" startIcon={<AddIcon />}>
            Parear nova
          </Button>
        }
      >
        {MACHINES.map((machine) => (
          <Box
            key={machine.id}
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
                <CreditCardIcon sx={{ fontSize: 18, color: 'text.tertiary' }} />
              </Box>
              <Box>
                <Typography variant="body2" color="text.primary" sx={{ fontWeight: 500 }}>
                  {machine.name}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {machine.serial} • bateria {machine.battery}%
                </Typography>
              </Box>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Chip
                label="Conectada"
                size="small"
                sx={{
                  bgcolor: 'success.soft',
                  color: 'success.ink',
                  fontWeight: 600,
                  '&::before': { content: '"•  "' },
                }}
              />
              <IconButton size="small">
                <MoreHorizIcon fontSize="small" />
              </IconButton>
            </Box>
          </Box>
        ))}
        {MACHINES.length > 1 && <Divider />}
      </SettingCard>

      <SettingCard
        title="Conta para recebimentos Pix"
        subtitle="Chave usada na geração dos QR Codes"
      >
        <SettingRow label="Tipo de chave">
          <FormControl size="small" sx={{ width: 200 }}>
            <Select value={pixKeyType} onChange={(e) => setPixKeyType(e.target.value)}>
              <MenuItem value="cnpj">CNPJ</MenuItem>
              <MenuItem value="cpf">CPF</MenuItem>
              <MenuItem value="email">E-mail</MenuItem>
              <MenuItem value="phone">Telefone</MenuItem>
              <MenuItem value="random">Chave aleatória</MenuItem>
            </Select>
          </FormControl>
        </SettingRow>

        <SettingRow label="Chave">
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <TextField
              size="small"
              value={pixKey}
              onChange={(e) => setPixKey(e.target.value)}
              sx={{ width: 220 }}
            />
            <Chip
              label="Ativa"
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
      </SettingCard>
    </Box>
  )
}
