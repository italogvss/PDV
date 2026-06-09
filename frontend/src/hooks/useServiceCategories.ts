import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { serviceService } from '../services/service.service'
import type { CreateServiceCategoryPayload, UpdateServiceCategoryPayload } from '../types/service.types'
import { useToast } from './useToast'
import { useApiError } from './useApiError'

const CATEGORIES_KEY = ['service-categories'] as const
const SERVICES_KEY = ['services'] as const

export function useServiceCategories() {
  return useQuery({
    queryKey: CATEGORIES_KEY,
    queryFn: () => serviceService.getAllCategories(),
  })
}

export function useCreateServiceCategory() {
  const queryClient = useQueryClient()
  const showToast = useToast()
  const handleError = useApiError()
  return useMutation({
    mutationFn: (payload: CreateServiceCategoryPayload) => serviceService.createCategory(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CATEGORIES_KEY })
      showToast('Categoria criada com sucesso!', 'success')
    },
    onError: (error) => handleError(error, 'Erro ao criar categoria.'),
  })
}

export function useUpdateServiceCategory() {
  const queryClient = useQueryClient()
  const showToast = useToast()
  const handleError = useApiError()
  return useMutation({
    mutationFn: ({ id, ...payload }: { id: string } & UpdateServiceCategoryPayload) =>
      serviceService.updateCategory(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CATEGORIES_KEY })
      queryClient.invalidateQueries({ queryKey: SERVICES_KEY })
      showToast('Categoria atualizada com sucesso!', 'success')
    },
    onError: (error) => handleError(error, 'Erro ao atualizar categoria.'),
  })
}

export function useDeleteServiceCategory() {
  const queryClient = useQueryClient()
  const showToast = useToast()
  const handleError = useApiError()
  return useMutation({
    mutationFn: (id: string) => serviceService.deleteCategory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CATEGORIES_KEY })
      queryClient.invalidateQueries({ queryKey: SERVICES_KEY })
      showToast('Categoria excluída.', 'info')
    },
    onError: (error) => handleError(error, 'Erro ao excluir categoria.'),
  })
}
