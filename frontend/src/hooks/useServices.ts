import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  serviceService,
  type CreateServicePayload,
  type UpdateServicePayload,
} from '../services/service.service'
import { useToast } from './useToast'
import { useApiError } from './useApiError'

const QUERY_KEY = ['services'] as const

export function useServices() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => serviceService.getAll(),
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
