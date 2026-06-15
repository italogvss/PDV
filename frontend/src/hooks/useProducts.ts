import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { productService } from '../services/product.service'
import type { CreateProductPayload, UpdateProductPayload } from '../types/product.types'
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

const INACTIVE_PRODUCTS_KEY = ['products', 'inactive'] as const

export function useInactiveProducts() {
  return useQuery({
    queryKey: INACTIVE_PRODUCTS_KEY,
    queryFn: () => productService.getInactiveProducts(),
  })
}

export function useRestoreProduct() {
  const queryClient = useQueryClient()
  const showToast = useToast()
  const handleError = useApiError()
  return useMutation({
    mutationFn: (id: string) => productService.restoreProduct(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INACTIVE_PRODUCTS_KEY })
      queryClient.invalidateQueries({ queryKey: QUERY_KEY })
      showToast('Produto reativado com sucesso!', 'success')
    },
    onError: (error) => handleError(error, 'Erro ao reativar produto.'),
  })
}

export function useHardDeleteProduct() {
  const queryClient = useQueryClient()
  const showToast = useToast()
  const handleError = useApiError()
  return useMutation({
    mutationFn: (id: string) => productService.hardDeleteProduct(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INACTIVE_PRODUCTS_KEY })
      showToast('Produto excluído definitivamente.', 'info')
    },
    onError: (error) => handleError(error, 'Erro ao excluir produto.'),
  })
}
