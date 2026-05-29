import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  employeeService,
  type CreateEmployeePayload,
  type UpdateEmployeePayload,
} from '../services/employee.service'
import type { EmployeeType, Permission } from '../types/employee.types'
import { useToast } from './useToast'
import { useApiError } from './useApiError'

const QUERY_KEY = ['employees'] as const
const PERMISSIONS_KEY = (type: EmployeeType) => ['employee-permissions', type] as const

export function useEmployees(page = 1, pageSize = 20) {
  return useQuery({
    queryKey: [...QUERY_KEY, page, pageSize],
    queryFn: () => employeeService.getAll(page, pageSize),
  })
}

export function useCreateEmployee() {
  const queryClient = useQueryClient()
  const showToast = useToast()
  const handleError = useApiError()

  return useMutation({
    mutationFn: (payload: CreateEmployeePayload) => employeeService.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY })
      showToast('Funcionário cadastrado com sucesso!', 'success')
    },
    onError: (error) => handleError(error, 'Erro ao cadastrar funcionário.'),
  })
}

export function useUpdateEmployee() {
  const queryClient = useQueryClient()
  const showToast = useToast()
  const handleError = useApiError()

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateEmployeePayload }) =>
      employeeService.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY })
      showToast('Funcionário atualizado com sucesso!', 'success')
    },
    onError: (error) => handleError(error, 'Erro ao atualizar funcionário.'),
  })
}

export function useDeactivateEmployee() {
  const queryClient = useQueryClient()
  const showToast = useToast()
  const handleError = useApiError()

  return useMutation({
    mutationFn: (id: string) => employeeService.deactivate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY })
      showToast('Funcionário desativado.', 'success')
    },
    onError: (error) => handleError(error, 'Erro ao desativar funcionário.'),
  })
}

export function useReactivateEmployee() {
  const queryClient = useQueryClient()
  const showToast = useToast()
  const handleError = useApiError()

  return useMutation({
    mutationFn: (id: string) => employeeService.reactivate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY })
      showToast('Funcionário reativado.', 'success')
    },
    onError: (error) => handleError(error, 'Erro ao reativar funcionário.'),
  })
}

export function useEmployeePermissions(employeeType: EmployeeType) {
  return useQuery({
    queryKey: PERMISSIONS_KEY(employeeType),
    queryFn: () => employeeService.getPermissions(employeeType),
  })
}

export function useSetEmployeePermissions() {
  const queryClient = useQueryClient()
  const showToast = useToast()
  const handleError = useApiError()

  return useMutation({
    mutationFn: ({
      employeeType,
      permissions,
    }: {
      employeeType: EmployeeType
      permissions: Permission[]
    }) => employeeService.setPermissions(employeeType, permissions),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: PERMISSIONS_KEY(data.employeeType) })
      showToast('Permissões salvas com sucesso!', 'success')
    },
    onError: (error) => handleError(error, 'Erro ao salvar permissões.'),
  })
}
