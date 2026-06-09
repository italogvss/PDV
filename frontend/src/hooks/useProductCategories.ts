import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { productService } from '../services/product.service'
import type { CreateCategoryPayload, UpdateCategoryPayload } from '../types/product.types'
import { useToast } from './useToast'
import { useApiError } from './useApiError'

const CATEGORIES_KEY = ['product-categories'] as const
const PRODUCTS_KEY = ['products'] as const

export function useProductCategories() {
  return useQuery({
    queryKey: CATEGORIES_KEY,
    queryFn: () => productService.getAllCategories(),
  })
}

export function useCreateProductCategory() {
  const queryClient = useQueryClient()
  const showToast = useToast()
  const handleError = useApiError()
  return useMutation({
    mutationFn: (payload: CreateCategoryPayload) => productService.createCategory(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CATEGORIES_KEY })
      showToast('Categoria criada com sucesso!', 'success')
    },
    onError: (error) => handleError(error, 'Erro ao criar categoria.'),
  })
}

export function useUpdateProductCategory() {
  const queryClient = useQueryClient()
  const showToast = useToast()
  const handleError = useApiError()
  return useMutation({
    mutationFn: ({ id, ...payload }: { id: string } & UpdateCategoryPayload) =>
      productService.updateCategory(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CATEGORIES_KEY })
      queryClient.invalidateQueries({ queryKey: PRODUCTS_KEY })
      showToast('Categoria atualizada com sucesso!', 'success')
    },
    onError: (error) => handleError(error, 'Erro ao atualizar categoria.'),
  })
}

export function useDeleteProductCategory() {
  const queryClient = useQueryClient()
  const showToast = useToast()
  const handleError = useApiError()
  return useMutation({
    mutationFn: (id: string) => productService.deleteCategory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CATEGORIES_KEY })
      queryClient.invalidateQueries({ queryKey: PRODUCTS_KEY })
      showToast('Categoria excluída.', 'info')
    },
    onError: (error) => handleError(error, 'Erro ao excluir categoria.'),
  })
}
