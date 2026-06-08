import type { Theme } from '@mui/material'

const compactFormatter = new Intl.NumberFormat('pt-BR', {
  notation: 'compact',
  compactDisplay: 'short',
  maximumFractionDigits: 1,
})

/** Formato curto para eixos (ex.: "R$ 1,2 mil"). */
export function formatCompactBRL(value: number | null): string {
  return `R$ ${compactFormatter.format(value ?? 0)}`
}

/** Rótulos PT-BR para o enum PaymentMethod do backend. */
export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  Cash: 'Dinheiro',
  PIX: 'PIX',
  CreditCard: 'Crédito',
  DebitCard: 'Débito',
}

/** Paleta categórica (até 10 cores distintas) a partir dos tokens do tema. */
export function categoricalColors(theme: Theme): string[] {
  const { data, success, warning, error, premium, neutral } = theme.palette
  return [
    data.purple.main,
    data.blue.main,
    data.orange.main,
    data.teal.main,
    data.pink.main,
    success.main,
    warning.main,
    error.main,
    premium[600],
    neutral[600],
  ]
}
