import { api } from './api'
import type {
  Appointment,
  AppointmentServiceRef,
  AppointmentStatus,
  CreateAppointmentPayload,
  UpdateAppointmentPayload,
} from '../types/appointment.types'

interface BackendServiceRef {
  id: string
  name: string
  durationMinutes: number
  price: number
  categoryColor: string
}

interface BackendAppointment {
  id: string
  customerId: string | null
  customerName: string
  customerPhone: string | null
  employeeId: string | null
  employeeName: string
  services: BackendServiceRef[]
  start: string
  durationMinutes: number
  price: number
  status: string
  note: string
  color: string
  createdAt: string
}

function mapServiceRef(s: BackendServiceRef): AppointmentServiceRef {
  return {
    id: s.id,
    name: s.name,
    durationMinutes: s.durationMinutes,
    price: s.price,
    categoryColor: s.categoryColor,
  }
}

// Pomelo lê datetime do MySQL como DateTimeKind.Unspecified e o System.Text.Json serializa
// sem sufixo de timezone (ex: "2026-07-01T18:35:00"). dayjs interpreta strings sem timezone
// como hora local — em UTC-3 isso causaria um desvio de 3h. Força tratamento como UTC.
function toUtcIso(dt: string): string {
  return dt.endsWith('Z') || dt.includes('+') ? dt : dt + 'Z'
}

function mapAppointment(a: BackendAppointment): Appointment {
  return {
    id: a.id,
    customerId: a.customerId,
    customerName: a.customerName,
    customerPhone: a.customerPhone ?? undefined,
    employeeId: a.employeeId,
    employeeName: a.employeeName,
    services: a.services.map(mapServiceRef),
    start: toUtcIso(a.start),
    durationMinutes: a.durationMinutes,
    price: a.price,
    status: a.status as AppointmentStatus,
    note: a.note,
    color: a.color || undefined,
  }
}

export const appointmentService = {
  getByDateRange: async (startDate: string, endDate: string): Promise<Appointment[]> => {
    const { data } = await api.get<BackendAppointment[]>('/appointments', {
      params: { startDate, endDate },
    })
    return data.map(mapAppointment)
  },

  create: async (payload: CreateAppointmentPayload): Promise<Appointment> => {
    const { data } = await api.post<BackendAppointment>('/appointments', payload)
    return mapAppointment(data)
  },

  update: async (id: string, payload: UpdateAppointmentPayload): Promise<Appointment> => {
    const { data } = await api.put<BackendAppointment>(`/appointments/${id}`, payload)
    return mapAppointment(data)
  },

  changeStatus: async (id: string, status: AppointmentStatus): Promise<Appointment> => {
    const { data } = await api.patch<BackendAppointment>(`/appointments/${id}/status`, { status })
    return mapAppointment(data)
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/appointments/${id}`)
  },
}
