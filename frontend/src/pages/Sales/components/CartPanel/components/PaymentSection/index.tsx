import { useState } from 'react'
import { Box, FormControl, InputLabel, MenuItem, Select, TextField, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material'
import {
  CreditCardOutlined,
  PixOutlined,
  PaymentsOutlined,
} from '@mui/icons-material'
import { PaymentMethod } from '../../../../types'
import { formatBRL } from '../../../../../../utils/currency'
import { PaymentSectionProps } from './types'

type CardType = 'credit' | 'debit'

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
  total,
  cashReceived,
  onCashReceivedChange,
}: PaymentSectionProps) {
  const [cardType, setCardType] = useState<CardType>('credit')
  const [installments, setInstallments] = useState(1)

  const receivedNumber = Number(cashReceived.replace(',', '.'))
  const validReceived = !Number.isNaN(receivedNumber) && cashReceived.trim() !== ''
  const change = validReceived ? receivedNumber - total : 0

  function handleCardTypeChange(value: CardType) {
    setCardType(value)
    if (value === 'debit') setInstallments(1)
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <ToggleButtonGroup
        exclusive
        fullWidth
        value={method}
        onChange={(_, value: PaymentMethod | null) => value && onMethodChange(value)}
        sx={{
          '& .MuiToggleButton-root': {
            flex: 1,
            gap: 1,
            py: 1.5,
            textTransform: 'none',
            fontWeight: 500,
            fontSize: 13,
            color: 'text.secondary',
            borderColor: 'border.subtle',
          },
        }}
      >
        {METHODS.map(({ value, label, Icon }) => (
          <ToggleButton
            key={value}
            value={value}
            sx={{
              '&.Mui-selected': {
                bgcolor: METHOD_COLORS[value].bg,
                color: METHOD_COLORS[value].text,
                borderColor: METHOD_COLORS[value].border,
                '&:hover': { bgcolor: METHOD_COLORS[value].hover },
              },
            }}
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
            onChange={(_, value: CardType | null) => value && handleCardTypeChange(value)}
            size="small"
            sx={{
              '& .MuiToggleButton-root': {
                flex: 1,
                textTransform: 'none',
                fontWeight: 500,
                fontSize: 13,
                color: 'text.secondary',
                borderColor: 'border.subtle',
                '&.Mui-selected': {
                  bgcolor: 'warning.main',
                  color: 'warning.contrastText',
                  borderColor: 'warning.main',
                  '&:hover': { bgcolor: 'warning.dark' },
                },
              },
            }}
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
                onChange={(e) => setInstallments(Number(e.target.value))}
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
            slotProps={{ input: { startAdornment: <Typography variant="body2" color="text.tertiary" sx={{ mr: 1 }}>R$</Typography> } }}
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
