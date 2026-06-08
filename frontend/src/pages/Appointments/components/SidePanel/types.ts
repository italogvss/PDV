import type { Dayjs } from 'dayjs'
import type { Appointment, Professional } from '../../../../types/appointment.types'

export interface SidePanelProps {
  appointments: Appointment[]
  professionals: Professional[]
  selectedDate: Dayjs
  isToday: boolean
  onOpenDetail: (id: string) => void
}
