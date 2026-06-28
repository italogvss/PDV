import dayjs, { type Dayjs } from 'dayjs'
import type { EmployeeDailyAppointments, EmployeeDailySales } from '../../../../services/employee.service'

export const GRANULARITIES = [
  { key: '7d', label: '7 dias' },
  { key: '30d', label: '30 dias' },
  { key: '3m', label: '3 meses' },
  { key: '6m', label: '6 meses' },
  { key: '12m', label: '1 ano' },
] as const

export type Granularity = (typeof GRANULARITIES)[number]['key']

const MONTHS_PT = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

const dayMonth = (d: Dayjs) => `${String(d.date()).padStart(2, '0')}/${String(d.month() + 1).padStart(2, '0')}`
const monthYear = (d: Dayjs) => `${MONTHS_PT[d.month()]}/${String(d.year()).slice(2)}`

interface BucketAxis {
  labels: string[]
  /** Índice do bucket ao qual a data pertence, ou -1 se estiver fora da janela. */
  indexOf: (date: Dayjs) => number
}

/**
 * Gera o eixo de buckets para a granularidade escolhida, sempre ancorado em hoje
 * e voltando no tempo. Curtos (7d/30d) → buckets diários; 3m → semanais; 6m/12m → mensais.
 */
function buildAxis(g: Granularity): BucketAxis {
  const today = dayjs().startOf('day')

  if (g === '7d' || g === '30d') {
    const n = g === '7d' ? 7 : 30
    const start = today.subtract(n - 1, 'day')
    const labels = Array.from({ length: n }, (_, i) => dayMonth(start.add(i, 'day')))
    return {
      labels,
      indexOf: (d) => {
        const idx = d.startOf('day').diff(start, 'day')
        return idx >= 0 && idx < n ? idx : -1
      },
    }
  }

  if (g === '3m') {
    const weeks = 12
    const oldestStart = today.subtract(weeks * 7 - 1, 'day')
    const labels = Array.from({ length: weeks }, (_, i) => dayMonth(oldestStart.add(i * 7, 'day')))
    return {
      labels,
      indexOf: (d) => {
        const daysAgo = today.diff(d.startOf('day'), 'day')
        if (daysAgo < 0 || daysAgo >= weeks * 7) return -1
        return weeks - 1 - Math.floor(daysAgo / 7)
      },
    }
  }

  const months = g === '6m' ? 6 : 12
  const startMonth = today.startOf('month').subtract(months - 1, 'month')
  const labels = Array.from({ length: months }, (_, i) => monthYear(startMonth.add(i, 'month')))
  return {
    labels,
    indexOf: (d) => {
      const idx = d.startOf('month').diff(startMonth, 'month')
      return idx >= 0 && idx < months ? idx : -1
    },
  }
}

export interface SalesSeries {
  labels: string[]
  totals: number[]
  tickets: number[]
  hasData: boolean
}

export function bucketSales(daily: EmployeeDailySales[], g: Granularity): SalesSeries {
  const axis = buildAxis(g)
  const totals = new Array(axis.labels.length).fill(0)
  const counts = new Array(axis.labels.length).fill(0)
  for (const d of daily) {
    const i = axis.indexOf(dayjs(d.date))
    if (i >= 0) {
      totals[i] += d.total
      counts[i] += d.count
    }
  }
  const tickets = totals.map((t, i) => (counts[i] > 0 ? t / counts[i] : 0))
  return { labels: axis.labels, totals, tickets, hasData: counts.some((c) => c > 0) }
}

export interface AppointmentsSeries {
  labels: string[]
  completed: number[]
  cancelled: number[]
  inProgress: number[]
  scheduled: number[]
  hasData: boolean
}

export function bucketAppointments(daily: EmployeeDailyAppointments[], g: Granularity): AppointmentsSeries {
  const axis = buildAxis(g)
  const n = axis.labels.length
  const completed = new Array(n).fill(0)
  const cancelled = new Array(n).fill(0)
  const inProgress = new Array(n).fill(0)
  const scheduled = new Array(n).fill(0)
  let any = false
  for (const d of daily) {
    const i = axis.indexOf(dayjs(d.date))
    if (i >= 0) {
      completed[i] += d.completed
      cancelled[i] += d.cancelled
      inProgress[i] += d.inProgress
      scheduled[i] += d.scheduled
      any = true
    }
  }
  return { labels: axis.labels, completed, cancelled, inProgress, scheduled, hasData: any }
}
