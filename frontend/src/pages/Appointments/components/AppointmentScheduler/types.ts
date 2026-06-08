import type { SchedulerEvent } from '@mui/x-scheduler/models'
import type { Appointment, Professional } from '../../../../types/appointment.types'
import type { AgendaView } from '../../types'

export interface AppointmentSchedulerProps {
  appointments: Appointment[]
  professionals: Professional[]
  view: AgendaView
  visibleDate: Date
  /** Mapa de visibilidade por profissional (filtro de colunas/legenda). */
  visibleResources: Record<string, boolean>
  onViewChange: (view: AgendaView) => void
  onVisibleDateChange: (date: Date) => void
  /** Disparado quando o usuário move/redimensiona/exclui um evento na grade nativa. */
  onEventsChange: (next: SchedulerEvent[]) => void
}
