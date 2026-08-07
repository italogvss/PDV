import { useQuery, type QueryClient } from '@tanstack/react-query'
import { notificationService } from '../services/notification.service'
import { FEATURES } from '../constants/entitlements'
import { useAppSelector } from '../store'
import { useEntitlements } from './useSubscription'

const QUERY_KEY = ['notifications'] as const

export function useNotifications() {
  const { has } = useEntitlements()
  const tenantId = useAppSelector((s) => s.auth.tenantId)

  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => notificationService.get(),
    // Sem o plano o endpoint responde 402 — não adianta insistir a cada 60s.
    enabled: !!tenantId && has(FEATURES.notifications),
    refetchInterval: 60_000,
    // O poll pausa com a aba oculta; sem isto, voltar a uma aba aberta desde ontem
    // mostraria as contagens de ontem até o próximo tick.
    refetchOnWindowFocus: true,
    staleTime: 30_000,
  })
}

// As contagens mudam quando o usuário mexe em estoque, despesa ou agendamento. Chamar isto
// no onSuccess dessas mutations mantém o sino certo sem esperar o poll de 60s.
export function invalidateNotifications(queryClient: QueryClient) {
  queryClient.invalidateQueries({ queryKey: QUERY_KEY })
}
