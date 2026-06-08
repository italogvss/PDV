import type { Dayjs } from 'dayjs'
import type { Appointment } from '../../../../types/appointment.types'

export interface WeekStripProps {
  selectedDate: Dayjs
  appointments: Appointment[]
  onSelectDay: (day: Dayjs) => void
}
