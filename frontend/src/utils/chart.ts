const compactFormatter = new Intl.NumberFormat('pt-BR', {
  notation: 'compact',
  compactDisplay: 'short',
  maximumFractionDigits: 1,
})

/** Formato curto para eixos (ex.: "R$ 1,2 mil"). */
export function formatCompactBRL(value: number | null): string {
  return `R$ ${compactFormatter.format(value ?? 0)}`
}
