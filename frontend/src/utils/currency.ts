const BRL = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

export function formatBRL(value: number): string {
  return BRL.format(value)
}

// Valor em centavos (inteiro, como o backend trafega) → "R$ 12,47".
export function formatCents(cents: number): string {
  return BRL.format(cents / 100)
}
