import dayjs from 'dayjs'

export interface PlannedInstallment {
  number: number
  dueDate: string
  amount: number
}

/**
 * Espelho de `CreditInstallmentPlanner.Build` (backend). Existe para o operador ver o carnê
 * exato ANTES de confirmar a venda — se divergir do backend, o preview vira mentira.
 *
 * Regras copiadas do planner: a parcela base é truncada em 2 casas (nunca arredondada para
 * cima, senão a soma passa do financiado) e a sobra vai INTEIRA para a parcela #1. Vencimentos
 * são mensais a partir do primeiro, com o mesmo clamp de mês curto do `AddMonths` do .NET
 * (31/01 + 1 mês = 28/02), que o dayjs também faz.
 */
export function buildInstallmentPlan(
  financed: number,
  installmentCount: number,
  firstDueDate: string,
): PlannedInstallment[] {
  if (installmentCount < 1 || financed <= 0) return []

  // Em centavos inteiros: o backend trabalha em decimal, e dividir em float aqui erra por 1
  // centavo em casos redondos (8,40 / 3 vira 2,79 em vez de 2,80).
  const totalCents = Math.round(financed * 100)
  const baseCents = Math.floor(totalCents / installmentCount)
  const firstCents = totalCents - baseCents * (installmentCount - 1)

  const start = dayjs(firstDueDate)
  if (!start.isValid()) return []

  return Array.from({ length: installmentCount }, (_, i) => ({
    number: i + 1,
    dueDate: start.add(i, 'month').format('YYYY-MM-DD'),
    amount: (i === 0 ? firstCents : baseCents) / 100,
  }))
}
