import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { employeeService } from '../services/employee.service'
import type { CreateEmployeePayload, UpdateEmployeePayload } from '../types/employee.types'
import { useToast } from './useToast'
import { useApiError } from './useApiError'

const QUERY_KEY = ['employees'] as const

export function useEmployees(page = 1, pageSize = 50) {
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

const INACTIVE_EMPLOYEES_KEY = ['employees', 'inactive'] as const

export function useInactiveEmployees() {
  return useQuery({
    queryKey: INACTIVE_EMPLOYEES_KEY,
    queryFn: () => employeeService.getInactive(),
  })
}

export function useHardDeleteEmployee() {
  const queryClient = useQueryClient()
  const showToast = useToast()
  const handleError = useApiError()
  return useMutation({
    mutationFn: (id: string) => employeeService.hardDelete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INACTIVE_EMPLOYEES_KEY })
      showToast('Funcionário excluído definitivamente.', 'info')
    },
    onError: (error) => handleError(error, 'Erro ao excluir funcionário.'),
  })
}
