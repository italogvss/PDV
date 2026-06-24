import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { appointmentService } from '../services/appointment.service'
import type {
  AppointmentStatus,
  CreateAppointmentPayload,
  UpdateAppointmentPayload,
} from '../types/appointment.types'
import { useToast } from './useToast'
import { useApiError } from './useApiError'
import { useUserPermissions } from './useUserPermissions'

const QUERY_KEY = ['appointments'] as const

export function useAppointments(startDate: string, endDate: string) {
  const { hasPermission, isModuleEnabled } = useUserPermissions()
  return useQuery({
    queryKey: [...QUERY_KEY, startDate, endDate],
    queryFn: () => appointmentService.getByDateRange(startDate, endDate),
    enabled:
      !!startDate &&
      !!endDate &&
      isModuleEnabled('appointments') &&
      (hasPermission('ViewAppointments') || hasPermission('ManageAppointments')),
  })
}

export function useCreateAppointment() {
  const queryClient = useQueryClient()
  const showToast = useToast()
  const handleError = useApiError()

  return useMutation({
    mutationFn: (payload: CreateAppointmentPayload) => appointmentService.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY })
      showToast('Agendamento criado com sucesso!', 'success')
    },
    onError: (error) => handleError(error, 'Erro ao criar agendamento.'),
  })
}

export function useUpdateAppointment() {
  const queryClient = useQueryClient()
  const handleError = useApiError()

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateAppointmentPayload }) =>
      appointmentService.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY })
    },
    onError: (error) => handleError(error, 'Erro ao atualizar agendamento.'),
  })
}

export function useChangeAppointmentStatus() {
  const queryClient = useQueryClient()
  const showToast = useToast()
  const handleError = useApiError()

  const STATUS_TOAST: Record<AppointmentStatus, string> = {
    pendente: 'Agendamento marcado como pendente.',
    confirmado: 'Agendamento confirmado!',
    em_atendimento: 'Atendimento iniciado.',
    concluido: 'Atendimento concluído!',
    cancelado: 'Agendamento cancelado.',
  }

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: AppointmentStatus }) =>
      appointmentService.changeStatus(id, status),
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY })
      showToast(STATUS_TOAST[status], status === 'cancelado' ? 'info' : 'success')
    },
    onError: (error) => handleError(error, 'Erro ao atualizar status do agendamento.'),
  })
}

export function useDeleteAppointment() {
  const queryClient = useQueryClient()
  const showToast = useToast()
  const handleError = useApiError()

  return useMutation({
    mutationFn: (id: string) => appointmentService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY })
      showToast('Agendamento removido.', 'info')
    },
    onError: (error) => handleError(error, 'Erro ao remover agendamento.'),
  })
}
