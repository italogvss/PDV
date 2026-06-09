import type { TextFieldProps } from '@mui/material'

export interface CurrencyFieldProps extends Omit<TextFieldProps, 'value' | 'onChange'> {
  /** Valor em reais (ex.: 12.5). */
  value: number
  /** Recebe o valor em reais já convertido. */
  onChange: (v: number) => void
}
