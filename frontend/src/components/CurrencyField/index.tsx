import { useState, useEffect } from 'react'
import { TextField, InputAdornment } from '@mui/material'
import type { TextFieldProps } from '@mui/material'
import type { CurrencyFieldProps } from './types'

function fmtCents(n: number): string {
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

/**
 * Entrada monetária única do app — máscara em centavos (digita da direita p/ esquerda),
 * adorno "R$" e seleção total ao focar. Trabalha em reais via value/onChange.
 */
export default function CurrencyField({ value, onChange, onBlur, ...rest }: CurrencyFieldProps) {
  const [display, setDisplay] = useState(() => fmtCents(value))

  useEffect(() => {
    setDisplay(fmtCents(value))
  }, [value])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, '')
    const cents = parseInt(digits || '0', 10)
    const reals = cents / 100
    setDisplay(fmtCents(reals))
    onChange(reals)
  }

  return (
    <TextField
      {...rest}
      value={display}
      onChange={handleChange}
      onBlur={onBlur as TextFieldProps['onBlur']}
      onFocus={(e) => e.target.select()}
      slotProps={{
        ...rest.slotProps,
        input: {
          startAdornment: <InputAdornment position="start">R$</InputAdornment>,
          ...(rest.slotProps?.input as object),
        },
        htmlInput: { inputMode: 'numeric', ...(rest.slotProps?.htmlInput as object) },
      }}
    />
  )
}
