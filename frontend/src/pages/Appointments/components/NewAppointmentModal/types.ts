import type { Dayjs } from 'dayjs'
import type { Service } from '../../../../types/service.types'
import type { Customer } from '../../../../types/customers.types'
import type { Appointment, Professional } from '../../../../types/appointment.types'
import type { NewAppointmentPrefill } from '../../types'

export interface NewAppointmentModalProps {
  open: boolean
  onClose: () => void
  professionals: Professional[]
  services: Service[]
  customers: Customer[]
  /** Lista atual — usada na detecção de conflito (R4). */
  appointments: Appointment[]
  prefill: NewAppointmentPrefill | null
  /** Dia selecionado na agenda — usado como data padrão. */
  defaultDate: Dayjs
  onCreate: (appointment: Appointment) => void
  requireCustomerOnAppointment: boolean
}
