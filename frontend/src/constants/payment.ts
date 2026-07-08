import type { Theme } from '@mui/material'

/** Chave do backend → rótulo PT-BR para método de pagamento. */
export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  PIX:        'Pix',
  CreditCard: 'Crédito',
  DebitCard:  'Débito',
  Cash:       'Dinheiro',
}

/** Chave do backend → cor fixa do tema. Mesma paleta em todos os gráficos de forma de pagamento. */
export const PAYMENT_METHOD_COLORS: Record<string, (theme: Theme) => string> = {
  PIX:        (t) => t.palette.info.main,
  CreditCard: (t) => t.palette.warning.dark,
  DebitCard:  (t) => t.palette.warning.main,
  Cash:       (t) => t.palette.success.main,
}
