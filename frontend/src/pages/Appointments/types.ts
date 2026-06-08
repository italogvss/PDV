/** View ativa da agenda — subconjunto do `CalendarView` do scheduler. */
export type AgendaView = 'day' | 'week'

/** Pré-preenchimento do modal "Novo agendamento". */
export interface NewAppointmentPrefill {
  employeeId?: string
  /** Início sugerido — ISO 8601. */
  start?: string
}
