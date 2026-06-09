import type {
  Appointment,
  AppointmentStatus,
  Professional,
} from '../../../../types/appointment.types'

export interface AppointmentDetailModalProps {
  open: boolean
  appointment: Appointment | null
  professional?: Professional
  onClose: () => void
  onChangeStatus: (id: string, status: AppointmentStatus) => void
  onChangeColor?: (id: string, color: string) => void
}
