import { Box, FormControl, InputLabel, MenuItem, Select, TextField, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material'
import {
  CreditCardOutlined,
  PixOutlined,
  PaymentsOutlined,
} from '@mui/icons-material'
import { PaymentMethod } from '../../../../types'
import { formatBRL } from '../../../../../../utils/currency'
import { PaymentSectionProps } from './types'

const METHODS: { value: PaymentMethod; label: string; Icon: typeof CreditCardOutlined }[] = [
  { value: 'card', label: 'Cartão', Icon: CreditCardOutlined },
  { value: 'pix', label: 'Pix', Icon: PixOutlined },
  { value: 'cash', label: 'Dinheiro', Icon: PaymentsOutlined },
]

const METHOD_COLORS: Record<PaymentMethod, { bg: string; text: string; hover: string; border: string }> = {
  card: { bg: 'warning.main', text: 'warning.contrastText', hover: 'warning.dark', border: 'warning.main' },
  pix: { bg: 'info.main', text: 'info.contrastText', hover: 'info.dark', border: 'info.main' },
  cash: { bg: 'success.main', text: 'success.contrastText', hover: 'success.dark', border: 'success.main' },
}

export default function PaymentSection({
  method,
  onMethodChange,
  cardType,
  onCardTypeChange,
  installments,
  onInstallmentsChange,
  total,
  cashReceived,
  onCashReceivedChange,
}: PaymentSectionProps) {
  const receivedNumber = Number(cashReceived.replace(',', '.'))
  const validReceived = !Number.isNaN(receivedNumber) && cashReceived.trim() !== ''
  const change = validReceived ? receivedNumber - total : 0

  function handleCardTypeChange(value: 'credit' | 'debit') {
    onCardTypeChange(value)
    if (value === 'debit') onInstallmentsChange(1)
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <ToggleButtonGroup
        exclusive
        fullWidth
        value={method}
        onChange={(_, value: PaymentMethod | null) => value && onMethodChange(value)}
      >
        {METHODS.map(({ value, label, Icon }) => (
          <ToggleButton
            key={value}
            value={value}
          >
            <Icon sx={{ fontSize: 16 }} />
            {label}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>

      {method === 'card' && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <ToggleButtonGroup
            exclusive
            fullWidth
            value={cardType}
            onChange={(_, value: 'credit' | 'debit' | null) => value && handleCardTypeChange(value)}
            size="small"           
          >
            <ToggleButton value="credit">Crédito</ToggleButton>
            <ToggleButton value="debit">Débito</ToggleButton>
          </ToggleButtonGroup>

          {cardType === 'credit' && (
            <FormControl size="small" fullWidth>
              <InputLabel>Parcelas</InputLabel>
              <Select
                value={installments}
                label="Parcelas"
                onChange={(e) => onInstallmentsChange(Number(e.target.value))}
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
                  <MenuItem key={n} value={n}>
                    {n}x de {formatBRL(total / n)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
        </Box>
      )}

      {method === 'cash' && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <TextField
            label="Valor recebido"
            value={cashReceived}
            onChange={(e) => onCashReceivedChange(e.target.value.replace(/[^\d,.]/g, ''))}
            placeholder="0,00"
            size="small"
            slotProps={{
              input: {
                startAdornment: (
                  <Typography variant="body2" color="text.tertiary" sx={{ mr: 1 }}>
                    R$
                  </Typography>
                ),
              },
            }}
          />
          {validReceived && (
            <Box sx={{ display: 'flex', justifyContent: 'space-between', px: 0.5 }}>
              <Typography variant="caption" color="text.tertiary">
                {change >= 0 ? 'Troco' : 'Falta'}
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  fontWeight: 600,
                  color: change >= 0 ? 'success.main' : 'error.main',
                }}
              >
                {formatBRL(Math.abs(change))}
              </Typography>
            </Box>
          )}
        </Box>
      )}
    </Box>
  )
}
