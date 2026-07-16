import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { accountDeletionService } from '../services/account.service'
import { useAppSelector } from '../store'
import { useToast } from './useToast'
import { useApiError } from './useApiError'
import type { AccountDeletionPath } from '../types/account.types'

export const ACCOUNT_DELETION_QUERY_KEY = ['account-deletion'] as const

// Estado do encerramento — alimenta a faixa/tela global de "conta em exclusão". Roda para todo
// usuário autenticado; devolve pending=false quando não há pedido.
export function useAccountDeletionStatus() {
  const isAuthenticated = useAppSelector((s) => s.auth.isAuthenticated)
  return useQuery({
    queryKey: ACCOUNT_DELETION_QUERY_KEY,
    queryFn: () => accountDeletionService.getStatus(),
    enabled: isAuthenticated,
    staleTime: 1000 * 30,
  })
}

// Simulação do encerramento (estado da assinatura + caminhos) para o diálogo de confirmação. Só
// busca quando o diálogo abre e apenas para Owner.
export function useAccountDeletionPreview(enabled: boolean) {
  const isOwner = useAppSelector((s) => s.auth.role === 'Owner' || s.auth.role === 'Admin')
  return useQuery({
    queryKey: [...ACCOUNT_DELETION_QUERY_KEY, 'preview'],
    queryFn: () => accountDeletionService.preview(),
    enabled: enabled && isOwner,
    staleTime: 0,
    gcTime: 0,
    retry: false,
  })
}

export function useRequestAccountDeletion() {
  const queryClient = useQueryClient()
  const showToast = useToast()
  const handleError = useApiError()
  return useMutation({
    mutationFn: (path: AccountDeletionPath) => accountDeletionService.request(path),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ACCOUNT_DELETION_QUERY_KEY })
      showToast('Encerramento solicitado. Você pode reativar sua conta durante o período de carência.', 'info')
    },
    onError: (error) => handleError(error, 'Erro ao solicitar o encerramento da conta.'),
  })
}

// Reativar não ressuscita a assinatura — para voltar a ter plano é preciso assinar novamente.
export function useCancelAccountDeletion() {
  const queryClient = useQueryClient()
  const showToast = useToast()
  const handleError = useApiError()
  return useMutation({
    mutationFn: () => accountDeletionService.cancel(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ACCOUNT_DELETION_QUERY_KEY })
      showToast('Conta reativada. Para voltar a ter um plano, assine novamente.', 'success')
    },
    onError: (error) => handleError(error, 'Erro ao reativar a conta.'),
  })
}
