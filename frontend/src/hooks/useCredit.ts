import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { creditService } from '../services/credit.service'
import type {
  CreateCreditAccountPayload,
  CreditFilters,
  ReceiveInstallmentPayload,
} from '../types/credit.types'
import { FEATURES } from '../constants/entitlements'
import { useToast } from './useToast'
import { useApiError } from './useApiError'
import { useUserPermissions } from './useUserPermissions'
import { useEntitlements } from './useSubscription'

const QUERY_KEY = ['credit'] as const
const ACCOUNTS_KEY = (filters: CreditFilters) => ['credit', 'accounts', filters] as const
const ACCOUNT_KEY = (id: string | null) => ['credit', 'account', id] as const
const INSTALLMENTS_KEY = (filters: CreditFilters) => ['credit', 'installments', filters] as const
const SUMMARY_KEY = ['credit', 'summary'] as const
const AGING_KEY = ['credit', 'aging'] as const

function useCreditEnabled(): boolean {
  const { hasPermission, isModuleEnabled } = useUserPermissions()
  return isModuleEnabled('credit') && (hasPermission('ViewCredit') || hasPermission('ManageCredit'))
}

export function useCreditAccounts(filters: CreditFilters = {}) {
  const enabled = useCreditEnabled()
  return useQuery({
    queryKey: ACCOUNTS_KEY(filters),
    queryFn: () => creditService.getAccounts(filters),
    enabled,
  })
}

export function useCreditAccount(id: string | null) {
  const enabled = useCreditEnabled()
  return useQuery({
    queryKey: ACCOUNT_KEY(id),
    queryFn: () => creditService.getAccount(id!),
    enabled: id !== null && enabled,
  })
}

export function useCreditInstallments(filters: CreditFilters = {}) {
  const enabled = useCreditEnabled()
  return useQuery({
    queryKey: INSTALLMENTS_KEY(filters),
    queryFn: () => creditService.getInstallments(filters),
    enabled,
  })
}

export function useCreditSummary() {
  const enabled = useCreditEnabled()
  return useQuery({
    queryKey: SUMMARY_KEY,
    queryFn: () => creditService.getSummary(),
    enabled,
  })
}

// O painel de aging vive atrás de [RequireEntitlement(creditDashboard)] no backend — o gate de
// plano fica aqui (e não na página) para que nenhum hook dispare uma requisição que o backend
// garantidamente responderia 402, não importa de onde seja chamado.
export function useCreditAging() {
  const enabled = useCreditEnabled()
  const { has } = useEntitlements()
  return useQuery({
    queryKey: AGING_KEY,
    queryFn: () => creditService.getAging(),
    enabled: enabled && has(FEATURES.creditDashboard),
  })
}

export function useCreateCreditAccount() {
  const queryClient = useQueryClient()
  const showToast = useToast()
  const handleError = useApiError()
  return useMutation({
    mutationFn: (payload: CreateCreditAccountPayload) => creditService.createAccount(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY })
      showToast('Crediário aberto com sucesso!', 'success')
    },
    onError: (error) => handleError(error, 'Erro ao abrir o crediário.'),
  })
}

export function useReceiveInstallment() {
  const queryClient = useQueryClient()
  const showToast = useToast()
  const handleError = useApiError()
  return useMutation({
    mutationFn: ({
      installmentId,
      ...payload
    }: { installmentId: string } & ReceiveInstallmentPayload) =>
      creditService.receive(installmentId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY })
      showToast('Recebimento registrado!', 'success')
    },
    onError: (error) => handleError(error, 'Erro ao registrar o recebimento.'),
  })
}

export function useReverseCreditPayment() {
  const queryClient = useQueryClient()
  const showToast = useToast()
  const handleError = useApiError()
  return useMutation({
    mutationFn: (paymentId: string) => creditService.reverse(paymentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY })
      showToast('Recebimento estornado.', 'info')
    },
    onError: (error) => handleError(error, 'Erro ao estornar o recebimento.'),
  })
}

export function useCancelCreditAccount() {
  const queryClient = useQueryClient()
  const showToast = useToast()
  const handleError = useApiError()
  return useMutation({
    mutationFn: (id: string) => creditService.cancelAccount(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY })
      showToast('Crediário cancelado.', 'info')
    },
    onError: (error) => handleError(error, 'Erro ao cancelar o crediário.'),
  })
}

// Lembrete de cobrança (feature Pro). Buscado sob demanda no clique — por isso mutation,
// e o 402 vira toast de upgrade pelo handleError, como manda a convenção.
export function useCreditReminder() {
  const handleError = useApiError()
  return useMutation({
    mutationFn: (installmentId: string) => creditService.getReminder(installmentId),
    onError: (error) => handleError(error, 'Erro ao gerar o lembrete de cobrança.'),
  })
}
