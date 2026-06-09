import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { teamRolesService, type CreateRolePayload, type UpdateRolePayload } from '../services/teamRoles.service'
import { useToast } from './useToast'
import { useApiError } from './useApiError'

const QUERY_KEY = ['team-roles'] as const

export function useTeamRoles() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => teamRolesService.getAll(),
  })
}

export function useCreateRole() {
  const queryClient = useQueryClient()
  const showToast = useToast()
  const handleError = useApiError()

  return useMutation({
    mutationFn: (payload: CreateRolePayload) => teamRolesService.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY })
      showToast('Papel criado com sucesso!', 'success')
    },
    onError: (error) => handleError(error, 'Erro ao criar papel.'),
  })
}

export function useUpdateRole() {
  const queryClient = useQueryClient()
  const showToast = useToast()
  const handleError = useApiError()

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateRolePayload }) =>
      teamRolesService.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY })
      showToast('Papel atualizado com sucesso!', 'success')
    },
    onError: (error) => handleError(error, 'Erro ao atualizar papel.'),
  })
}

export function useDeactivateRole() {
  const queryClient = useQueryClient()
  const showToast = useToast()
  const handleError = useApiError()

  return useMutation({
    mutationFn: (id: string) => teamRolesService.deactivate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY })
      showToast('Papel removido.', 'success')
    },
    onError: (error) => handleError(error, 'Erro ao remover papel.'),
  })
}

export function useSetRolePermissions() {
  const queryClient = useQueryClient()
  const showToast = useToast()
  const handleError = useApiError()

  return useMutation({
    mutationFn: ({ id, permissions }: { id: string; permissions: string[] }) =>
      teamRolesService.setPermissions(id, permissions),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY })
      showToast('Permissões salvas!', 'success')
    },
    onError: (error) => handleError(error, 'Erro ao salvar permissões.'),
  })
}
