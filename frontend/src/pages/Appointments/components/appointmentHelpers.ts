import dayjs, { type Dayjs } from 'dayjs'
import type { SchedulerEvent, SchedulerEventColor, SchedulerResource } from '@mui/x-scheduler/models'
import type {
  Appointment,
  AppointmentServiceRef,
  AppointmentStatus,
  Professional,
} from '../../../types/appointment.types'
import { APPOINTMENT_STATUS_LABELS } from '../../../types/appointment.types'

/** Expediente exibido na grade (em minutos a partir da meia-noite). 09:00–19:00. */
export const DAY_START_MIN = 540
export const DAY_END_MIN = 1140
export const EXPEDIENTE_MIN = DAY_END_MIN - DAY_START_MIN

// ─── Status ────────────────────────────────────────────────────────────────

/** Tom semântico do tema usado por chips/blocos de cada status. */
export type StatusTone = 'warning' | 'success' | 'info' | 'error' | 'neutral'

export interface StatusMeta {
  label: string
  tone: StatusTone
  /** Cor nomeada equivalente no MUI X Scheduler (paleta fixa do componente). */
  scheduler: SchedulerEventColor
}

export const STATUS_META: Record<AppointmentStatus, StatusMeta> = {
  pendente: { label: APPOINTMENT_STATUS_LABELS.pendente, tone: 'warning', scheduler: 'amber' },
  confirmado: { label: APPOINTMENT_STATUS_LABELS.confirmado, tone: 'success', scheduler: 'green' },
  em_atendimento: {
    label: APPOINTMENT_STATUS_LABELS.em_atendimento,
    tone: 'info',
    scheduler: 'blue',
  },
  concluido: { label: APPOINTMENT_STATUS_LABELS.concluido, tone: 'neutral', scheduler: 'grey' },
  cancelado: { label: APPOINTMENT_STATUS_LABELS.cancelado, tone: 'error', scheduler: 'red' },
}

// ─── Cor do profissional (derivada — Employee não tem cor no backend) ────────

/** Chaves de cor de profissional; todas válidas também como `SchedulerEventColor`. */
export type ProColorKey = 'purple' | 'blue' | 'teal' | 'orange' | 'pink' | 'green'

const PRO_COLORS: ProColorKey[] = ['purple', 'blue', 'teal', 'orange', 'pink', 'green']

/** Cor determinística por profissional (hash do id), estável entre renders. */
export function proColorKey(id: string): ProColorKey {
  let hash = 0
  for (let i = 0; i < id.length; i++) hash = (hash + id.charCodeAt(i)) % PRO_COLORS.length
  return PRO_COLORS[hash]
}

export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export function firstName(name: string): string {
  return name.trim().split(/\s+/)[0]
}

// ─── Tempo ───────────────────────────────────────────────────────────────────

export function endIso(start: string, durationMinutes: number): string {
  return dayjs(start).add(durationMinutes, 'minute').toISOString()
}

export function minutesOfDay(iso: string): number {
  const d = dayjs(iso)
  return d.hour() * 60 + d.minute()
}

export function formatHM(iso: string): string {
  return dayjs(iso).format('HH:mm')
}

/** "HH:MM–HH:MM" a partir do início + duração. */
export function formatRange(start: string, durationMinutes: number): string {
  return `${formatHM(start)}–${formatHM(endIso(start, durationMinutes))}`
}

export function isSameDay(iso: string, day: Dayjs): boolean {
  return dayjs(iso).isSame(day, 'day')
}

// ─── Serviços ────────────────────────────────────────────────────────────────

export function sumServices(services: AppointmentServiceRef[]): {
  duration: number
  price: number
} {
  return services.reduce(
    (acc, s) => ({ duration: acc.duration + s.durationMinutes, price: acc.price + s.price }),
    { duration: 0, price: 0 },
  )
}

// ─── Consultas sobre a lista ─────────────────────────────────────────────────

export function appointmentsOfDay(appts: Appointment[], day: Dayjs): Appointment[] {
  return appts.filter((a) => isSameDay(a.start, day))
}

/**
 * Agendamentos do mesmo profissional/dia que se sobrepõem ao intervalo informado.
 * Ignora cancelados e o próprio agendamento (edição). R4: apenas aviso.
 */
export function conflictsFor(
  appts: Appointment[],
  employeeId: string,
  start: string,
  durationMinutes: number,
  ignoreId?: string,
): Appointment[] {
  const s = dayjs(start).valueOf()
  const e = dayjs(start).add(durationMinutes, 'minute').valueOf()
  return appts.filter((a) => {
    if (a.id === ignoreId) return false
    if (a.employeeId !== employeeId) return false
    if (a.status === 'cancelado') return false
    if (!dayjs(a.start).isSame(dayjs(start), 'day')) return false
    const aS = dayjs(a.start).valueOf()
    const aE = dayjs(a.start).add(a.durationMinutes, 'minute').valueOf()
    return aS < e && s < aE
  })
}

export interface DayKpis {
  count: number
  pendentes: number
  confirmados: number
  confirmedPct: number
  revenue: number
  occupancy: number
  bookedMin: number
  availMin: number
}

/** KPIs do DIA SELECIONADO (R7). Cancelados ficam de fora (R6). */
export function computeKpis(
  appts: Appointment[],
  professionals: Professional[],
  day: Dayjs,
): DayKpis {
  const selAppts = appointmentsOfDay(appts, day)
  const active = selAppts.filter((a) => a.status !== 'cancelado')
  const confirmados = active.filter(
    (a) => a.status === 'confirmado' || a.status === 'em_atendimento',
  )
  const pendentes = selAppts.filter((a) => a.status === 'pendente')
  const revenue = active.reduce((sum, a) => sum + a.price, 0)
  const bookedMin = active.reduce((sum, a) => sum + a.durationMinutes, 0)
  const availMin = professionals.length * EXPEDIENTE_MIN
  return {
    count: active.length,
    pendentes: pendentes.length,
    confirmados: confirmados.length,
    confirmedPct: active.length ? Math.round((confirmados.length / active.length) * 100) : 0,
    revenue,
    bookedMin,
    availMin,
    occupancy: availMin ? Math.round((bookedMin / availMin) * 100) : 0,
  }
}

/** Ocupação (0–100) de um profissional no dia, contando só não cancelados. */
export function occupancyForPro(appts: Appointment[], employeeId: string, day: Dayjs): number {
  const minutes = appointmentsOfDay(appts, day)
    .filter((a) => a.employeeId === employeeId && a.status !== 'cancelado')
    .reduce((sum, a) => sum + a.durationMinutes, 0)
  return Math.min(100, Math.round((minutes / EXPEDIENTE_MIN) * 100))
}

export function bookedMinutesForPro(appts: Appointment[], employeeId: string, day: Dayjs): number {
  return appointmentsOfDay(appts, day)
    .filter((a) => a.employeeId === employeeId && a.status !== 'cancelado')
    .reduce((sum, a) => sum + a.durationMinutes, 0)
}

/**
 * "A seguir" (§6.3): não cancelado e não concluído; se o dia for hoje, apenas os
 * que ainda não terminaram; ordenados por horário; até `limit`.
 */
export function upcomingForDay(
  appts: Appointment[],
  day: Dayjs,
  isToday: boolean,
  limit = 6,
): Appointment[] {
  const nowMs = dayjs().valueOf()
  return appointmentsOfDay(appts, day)
    .filter((a) => a.status !== 'cancelado' && a.status !== 'concluido')
    .filter((a) => !isToday || dayjs(a.start).add(a.durationMinutes, 'minute').valueOf() >= nowMs)
    .sort((a, b) => dayjs(a.start).valueOf() - dayjs(b.start).valueOf())
    .slice(0, limit)
}

// ─── Mapeamento p/ o MUI X Scheduler ─────────────────────────────────────────

export function toSchedulerEvents(appts: Appointment[]): SchedulerEvent[] {
  return appts.map((a) => ({
    id: a.id,
    title: a.services.map((s) => s.name).join(' + ') || 'Agendamento',
    start: a.start,
    end: endIso(a.start, a.durationMinutes),
    resource: a.employeeId,
    color: STATUS_META[a.status].scheduler,
    // Concluídos/cancelados não são editáveis pela UI nativa do scheduler.
    readOnly: a.status === 'concluido' || a.status === 'cancelado',
  }))
}

export function toSchedulerResources(professionals: Professional[]): SchedulerResource[] {
  return professionals.map((p) => ({
    id: p.id,
    title: p.name,
    eventColor: proColorKey(p.id),
  }))
}
