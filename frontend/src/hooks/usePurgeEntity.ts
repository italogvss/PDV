import { useMutation, useQueryClient } from '@tanstack/react-query'
import { tenantDataService, type EntityKey } from '../services/tenantData.service'
import { useToast } from './useToast'
import { useApiError } from './useApiError'

const ENTITY_LABELS: Record<EntityKey, string> = {
  products: 'Produtos',
  sales: 'Vendas',
  services: 'Serviços',
  appointments: 'Agendamentos',
  expenses: 'Despesas',
  customers: 'Clientes',
  suppliers: 'Fornecedores',
}

const INVALIDATE_KEYS: Record<EntityKey, readonly string[]> = {
  products: ['products'],
  sales: ['sales'],
  services: ['services'],
  appointments: ['appointments'],
  expenses: ['expenses'],
  customers: ['customers'],
  suppliers: ['suppliers'],
}

export function usePurgeEntity() {
  const queryClient = useQueryClient()
  const showToast = useToast()
  const handleError = useApiError()

  return useMutation({
    mutationFn: (entity: EntityKey) => tenantDataService.purge(entity),
    onSuccess: (_, entity) => {
      queryClient.invalidateQueries({ queryKey: INVALIDATE_KEYS[entity] })
      showToast(`Todos os ${ENTITY_LABELS[entity]} foram excluídos permanentemente.`, 'success')
    },
    onError: (error, entity) => handleError(error, `Erro ao excluir os ${ENTITY_LABELS[entity]}.`),
  })
}
