/**
 * Tipos do módulo de Agendamentos.
 *
 * Fase atual: frontend-first com dados mock — a entidade `Appointment` ainda não
 * existe no backend. Estes tipos já nascem alinhados ao esquema-alvo:
 *   Appointment(Id, CustomerId, EmployeeId, Start, DurationMinutes, Price, Status, Note)
 *   + junção AppointmentService (serviços denormalizados no momento da criação).
 */

export type AppointmentStatus =
  | 'pendente'
  | 'confirmado'
  | 'em_atendimento'
  | 'concluido'
  | 'cancelado'

/**
 * Profissional que atende — subconjunto de `Employee` usado na agenda.
 * `specialty` vem de `Employee.position` (exibido no header/legenda).
 */
export interface Professional {
  id: string
  name: string
  specialty: string
}

/** Serviço denormalizado dentro de um agendamento (snapshot do catálogo). */
export interface AppointmentServiceRef {
  id: string
  name: string
  durationMinutes: number
  /** Cor (hex) da categoria do serviço — usada nos dots do modal. */
  categoryColor: string
  price: number
}

export interface Appointment {
  id: string
  /** FK para Customer. `null` apenas em walk-in sem cadastro (não usado nesta fase). */
  customerId: string | null
  customerName: string
  customerPhone?: string
  employeeId: string | null
  employeeName: string
  services: AppointmentServiceRef[]
  /** Início — ISO 8601. */
  start: string
  durationMinutes: number
  price: number
  status: AppointmentStatus
  note: string
  /** Cor hex customizada do agendamento. Vazio = usa cor derivada do profissional. */
  color?: string
}

export const APPOINTMENT_STATUS_LABELS: Record<AppointmentStatus, string> = {
  pendente: 'A confirmar',
  confirmado: 'Confirmado',
  em_atendimento: 'Em atendimento',
  concluido: 'Concluído',
  cancelado: 'Cancelado',
}

/** Ordem de exibição dos status (picker de situação, etc). */
export const APPOINTMENT_STATUSES: AppointmentStatus[] = [
  'pendente',
  'confirmado',
  'em_atendimento',
  'concluido',
  'cancelado',
]

export interface CreateAppointmentPayload {
  customerId: string | null
  customerName: string
  customerPhone?: string
  employeeId: string
  serviceIds: string[]
  start: string
  durationMinutes: number
  price: number
  status: AppointmentStatus
  note: string
  color?: string
}

export type UpdateAppointmentPayload = CreateAppointmentPayload
