import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { adminService } from '../services/admin.service'
import type { AnnouncementPayload, UpdatePlanPayload } from '../types/admin.types'
import { useAppSelector } from '../../store'
import { useToast } from '../../hooks/useToast'
import { useApiError } from '../../hooks/useApiError'

const KEYS = {
  overview: ['admin', 'overview'] as const,
  subscriptions: ['admin', 'subscriptions'] as const,
  payments: ['admin', 'payments'] as const,
  plans: ['admin', 'plans'] as const,
  webhooks: ['admin', 'webhook-events'] as const,
  config: ['admin', 'config'] as const,
  contactMessages: ['admin', 'contact-messages'] as const,
  announcements: ['admin', 'announcements'] as const,
  health: ['admin', 'health'] as const,
  systemLogs: ['admin', 'system-logs'] as const,
  platformEvents: ['admin', 'platform-events'] as const,
  accountDeletions: ['admin', 'account-deletions'] as const,
  retentionTenants: ['admin', 'retention-tenants'] as const,
  accessLogs: ['admin', 'access-logs'] as const,
}

// Todas as queries de admin ficam atrás do gate de role — a rota já é admin-guarded, mas o `enabled`
// evita disparos durante o bootstrap da sessão.
function useIsAdmin() {
  return useAppSelector((s) => s.auth.role === 'Admin')
}

export function useAdminOverview() {
  const enabled = useIsAdmin()
  return useQuery({ queryKey: KEYS.overview, queryFn: () => adminService.getOverview(), enabled })
}

export function useAdminSubscriptions() {
  const enabled = useIsAdmin()
  return useQuery({ queryKey: KEYS.subscriptions, queryFn: () => adminService.getSubscriptions(), enabled })
}

export function useAdminPayments() {
  const enabled = useIsAdmin()
  return useQuery({ queryKey: KEYS.payments, queryFn: () => adminService.getPayments(), enabled })
}

export function useAdminPlans() {
  const enabled = useIsAdmin()
  return useQuery({ queryKey: KEYS.plans, queryFn: () => adminService.getPlans(), enabled })
}

export function useAdminWebhookEvents() {
  const enabled = useIsAdmin()
  return useQuery({ queryKey: KEYS.webhooks, queryFn: () => adminService.getWebhookEvents(), enabled })
}

export function useAdminConfig() {
  const enabled = useIsAdmin()
  return useQuery({ queryKey: KEYS.config, queryFn: () => adminService.getConfig(), enabled })
}

export function useUpdatePlan() {
  const queryClient = useQueryClient()
  const showToast = useToast()
  const handleError = useApiError()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdatePlanPayload }) =>
      adminService.updatePlan(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEYS.plans })
      queryClient.invalidateQueries({ queryKey: KEYS.overview })
      showToast('Plano atualizado com sucesso!', 'success')
    },
    onError: (error) => handleError(error, 'Erro ao atualizar o plano.'),
  })
}

export function useDeactivatePlan() {
  const queryClient = useQueryClient()
  const showToast = useToast()
  const handleError = useApiError()
  return useMutation({
    mutationFn: (id: string) => adminService.deactivatePlan(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEYS.plans })
      queryClient.invalidateQueries({ queryKey: KEYS.overview })
      showToast('Plano desativado.', 'success')
    },
    onError: (error) => handleError(error, 'Erro ao desativar o plano.'),
  })
}

// ── Fase 3: Suporte & Conteúdo ────────────────────────────────────────────────────────────────

export function useAdminContactMessages() {
  const enabled = useIsAdmin()
  return useQuery({ queryKey: KEYS.contactMessages, queryFn: () => adminService.getContactMessages(), enabled })
}

export function useUpdateContactStatus() {
  const queryClient = useQueryClient()
  const showToast = useToast()
  const handleError = useApiError()
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => adminService.updateContactStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEYS.contactMessages })
      showToast('Mensagem atualizada.', 'success')
    },
    onError: (error) => handleError(error, 'Erro ao atualizar a mensagem.'),
  })
}

export function useAdminAnnouncements() {
  const enabled = useIsAdmin()
  return useQuery({ queryKey: KEYS.announcements, queryFn: () => adminService.getAnnouncements(), enabled })
}

export function useCreateAnnouncement() {
  const queryClient = useQueryClient()
  const showToast = useToast()
  const handleError = useApiError()
  return useMutation({
    mutationFn: (payload: AnnouncementPayload) => adminService.createAnnouncement(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEYS.announcements })
      showToast('Anúncio criado com sucesso!', 'success')
    },
    onError: (error) => handleError(error, 'Erro ao criar o anúncio.'),
  })
}

export function useUpdateAnnouncement() {
  const queryClient = useQueryClient()
  const showToast = useToast()
  const handleError = useApiError()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: AnnouncementPayload }) =>
      adminService.updateAnnouncement(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEYS.announcements })
      showToast('Anúncio atualizado com sucesso!', 'success')
    },
    onError: (error) => handleError(error, 'Erro ao atualizar o anúncio.'),
  })
}

export function useDeactivateAnnouncement() {
  const queryClient = useQueryClient()
  const showToast = useToast()
  const handleError = useApiError()
  return useMutation({
    mutationFn: (id: string) => adminService.deactivateAnnouncement(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEYS.announcements })
      showToast('Anúncio removido.', 'success')
    },
    onError: (error) => handleError(error, 'Erro ao remover o anúncio.'),
  })
}

// ── Fase 4: Observabilidade ───────────────────────────────────────────────────────────────────

// Saúde da API: revalida sozinha — é o painel de "está tudo de pé agora?".
export function useAdminHealth() {
  const enabled = useIsAdmin()
  return useQuery({
    queryKey: KEYS.health,
    queryFn: () => adminService.getHealth(),
    enabled,
    refetchInterval: 30_000,
    staleTime: 0,
  })
}

export function useAdminSystemLogs(level?: string) {
  const enabled = useIsAdmin()
  return useQuery({
    queryKey: [...KEYS.systemLogs, level ?? 'all'],
    queryFn: () => adminService.getSystemLogs(level),
    enabled,
  })
}

export function useAdminPlatformEvents(source?: string) {
  const enabled = useIsAdmin()
  return useQuery({
    queryKey: [...KEYS.platformEvents, source ?? 'all'],
    queryFn: () => adminService.getPlatformEvents(source),
    enabled,
  })
}

// ── Conformidade / LGPD ───────────────────────────────────────────────────────────────────────

export function useAdminAccountDeletions() {
  const enabled = useIsAdmin()
  return useQuery({ queryKey: KEYS.accountDeletions, queryFn: () => adminService.getAccountDeletions(), enabled })
}

export function useAdminRetentionTenants() {
  const enabled = useIsAdmin()
  return useQuery({ queryKey: KEYS.retentionTenants, queryFn: () => adminService.getRetentionTenants(), enabled })
}

export function useAdminAccessLogs() {
  const enabled = useIsAdmin()
  return useQuery({ queryKey: KEYS.accessLogs, queryFn: () => adminService.getAccessLogs(), enabled })
}
