import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { serviceService } from '../services/service.service'
import type { CreateServicePayload, UpdateServicePayload } from '../types/service.types'
import { useToast } from './useToast'
import { useApiError } from './useApiError'
import { useUserPermissions } from './useUserPermissions'

const QUERY_KEY = ['services'] as const

export function useServices() {
  const { isModuleEnabled } = useUserPermissions()
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => serviceService.getAll(),
    enabled: isModuleEnabled('services'),
  })
}

export function useCreateService() {
  const queryClient = useQueryClient()
  const showToast = useToast()
  const handleError = useApiError()
  return useMutation({
    mutationFn: (payload: CreateServicePayload) => serviceService.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY })
      showToast('Serviço cadastrado com sucesso!', 'success')
    },
    onError: (error) => handleError(error, 'Erro ao cadastrar serviço.'),
  })
}

export function useUpdateService() {
  const queryClient = useQueryClient()
  const showToast = useToast()
  const handleError = useApiError()
  return useMutation({
    mutationFn: ({ id, ...payload }: { id: string } & UpdateServicePayload) =>
      serviceService.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY })
      showToast('Serviço atualizado com sucesso!', 'success')
    },
    onError: (error) => handleError(error, 'Erro ao atualizar serviço.'),
  })
}

export function useDeleteService() {
  const queryClient = useQueryClient()
  const showToast = useToast()
  const handleError = useApiError()
  return useMutation({
    mutationFn: (id: string) => serviceService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY })
      showToast('Serviço excluído.', 'info')
    },
    onError: (error) => handleError(error, 'Erro ao excluir serviço.'),
  })
}

const INACTIVE_SERVICES_KEY = ['services', 'inactive'] as const

export function useInactiveServices() {
  const { isModuleEnabled, isOwner } = useUserPermissions()
  return useQuery({
    queryKey: INACTIVE_SERVICES_KEY,
    queryFn: () => serviceService.getInactiveServices(),
    enabled: isModuleEnabled('services') && isOwner,
  })
}

export function useRestoreService() {
  const queryClient = useQueryClient()
  const showToast = useToast()
  const handleError = useApiError()
  return useMutation({
    mutationFn: (id: string) => serviceService.restoreService(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INACTIVE_SERVICES_KEY })
      queryClient.invalidateQueries({ queryKey: QUERY_KEY })
      showToast('Serviço reativado com sucesso!', 'success')
    },
    onError: (error) => handleError(error, 'Erro ao reativar serviço.'),
  })
}

export function useHardDeleteService() {
  const queryClient = useQueryClient()
  const showToast = useToast()
  const handleError = useApiError()
  return useMutation({
    mutationFn: (id: string) => serviceService.hardDeleteService(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INACTIVE_SERVICES_KEY })
      showToast('Serviço excluído definitivamente.', 'info')
    },
    onError: (error) => handleError(error, 'Erro ao excluir serviço.'),
  })
}
