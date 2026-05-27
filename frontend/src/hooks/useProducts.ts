import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  productService,
  type CreateProductPayload,
  type UpdateProductPayload,
} from '../services/product.service'
import { useToast } from './useToast'
import { useApiError } from './useApiError'

const QUERY_KEY = ['products'] as const

export function useProducts() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => productService.getAll(),
  })
}

export function useCreateProduct() {
  const queryClient = useQueryClient()
  const showToast = useToast()
  const handleError = useApiError()
  return useMutation({
    mutationFn: (payload: CreateProductPayload) => productService.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY })
      showToast('Produto cadastrado com sucesso!', 'success')
    },
    onError: (error) => handleError(error, 'Erro ao cadastrar produto.'),
  })
}

export function useUpdateProduct() {
  const queryClient = useQueryClient()
  const showToast = useToast()
  const handleError = useApiError()
  return useMutation({
    mutationFn: ({ id, ...payload }: { id: string } & UpdateProductPayload) =>
      productService.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY })
      showToast('Produto atualizado com sucesso!', 'success')
    },
    onError: (error) => handleError(error, 'Erro ao atualizar produto.'),
  })
}

export function useDeleteProduct() {
  const queryClient = useQueryClient()
  const showToast = useToast()
  const handleError = useApiError()
  return useMutation({
    mutationFn: (id: string) => productService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY })
      showToast('Produto excluído.', 'info')
    },
    onError: (error) => handleError(error, 'Erro ao excluir produto.'),
  })
}

export function useAdjustStock() {
  const queryClient = useQueryClient()
  const showToast = useToast()
  const handleError = useApiError()
  return useMutation({
    mutationFn: ({ id, quantity }: { id: string; quantity: number }) =>
      productService.adjustStock(id, quantity),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY })
      showToast('Estoque ajustado com sucesso!', 'success')
    },
    onError: (error) => handleError(error, 'Erro ao ajustar estoque.'),
  })
}
