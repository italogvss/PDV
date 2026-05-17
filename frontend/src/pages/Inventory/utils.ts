import type { StockLevel } from './types'

export function getStockLevel(
  stock: number,
  minStock: number | undefined,
  criticalStock: number | undefined,
): StockLevel {
  if (criticalStock !== undefined && stock <= criticalStock) return 'Crítico'
  if (minStock !== undefined && stock <= minStock) return 'Baixo'
  return 'OK'
}

/** Percentual de preenchimento da barra (0–100). Considera 3× minStock como "cheio". */
export function getStockPercent(stock: number, minStock: number): number {
  return Math.min(Math.round((stock / (minStock * 3)) * 100), 100)
}
