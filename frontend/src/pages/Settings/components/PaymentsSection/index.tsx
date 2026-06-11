import AttachMoneyIcon from '@mui/icons-material/AttachMoney'
import CreditCardIcon from '@mui/icons-material/CreditCard'
import PixIcon from '@mui/icons-material/Pix'
import {
  Box,
  InputAdornment,
  Switch,
  TextField,
  Typography
} from '@mui/material'
import { useState } from 'react'
import FieldLabel from '../../../../components/FieldLabel'
import SettingCard from '../../../../components/SettingCard'

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
  //{ id: 'voucher', label: 'Voucher / VR', subtitle: 'Taxa média 5,5%', icon: LocalOfferOutlinedIcon },
  //{ id: 'payment_link', label: 'Link de pagamento', subtitle: 'Taxa 3,9%', icon: OpenInNewOutlinedIcon },
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

  const [methodFees, setMethodFees] = useState<Record<string, string>>({
    pix: '',
    card_credit: '',
    card_debit: '',
    cash: '',
  })

  const toggleMethod = (id: string) => {
    setEnabledMethods((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const handleFeeChange = (id: string, value: string) => {
    // Remove tudo que não é número ou vírgula/ponto
    let normalized = value.replace(/[^\d.,]/g, '')
    // Converte vírgula para ponto para processamento
    normalized = normalized.replace(',', '.')
    // Valida decimal - máx 2 casas
    const parts = normalized.split('.')
    if (parts.length > 2) return
    if (parts[1] && parts[1].length > 2) return
    setMethodFees((prev) => ({ ...prev, [id]: normalized }))
  }

  const formatFeeDisplay = (value: string) => {
    if (!value) return ''
    const num = parseFloat(value)
    if (isNaN(num)) return ''
    return num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
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
                  flexDirection: 'column',
                  gap: 2,
                  transition: 'all 0.15s',
                }}
              >
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 1,
                    cursor: 'pointer',
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
                    </Box>
                  </Box>
                  <Switch
                    checked={enabled}
                    onChange={() => toggleMethod(method.id)}
                    color="secondary"
                    onClick={(e) => e.stopPropagation()}
                  />
                </Box>

                {enabled && (
                  <>
                    <FieldLabel label="Taxa por venda" />
                    <TextField
                      type="text"
                      placeholder="0,00"
                      value={formatFeeDisplay(methodFees[method.id] || '')}
                      onChange={(e) => handleFeeChange(method.id, e.target.value)}
                      slotProps={{
                        input: {
                          endAdornment: <InputAdornment position="end">%</InputAdornment>,
                        },
                      }}
                      sx={{maxWidth: 100}}
                    />
                  </>
                )}
              </Box>
            )
          })}
        </Box>
      </SettingCard>

      {/* <SettingCard
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
      </SettingCard> */}
    </Box>
  )
}
