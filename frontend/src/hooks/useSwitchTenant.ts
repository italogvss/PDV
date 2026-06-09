import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useAppDispatch } from '../store'
import { setTenant } from '../store/slices/auth.slice'
import { authService } from '../services/auth.service'
import { useApiError } from './useApiError'

export function useSwitchTenant() {
  const queryClient = useQueryClient()
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const handleError = useApiError()

  return useMutation({
    mutationFn: (tenantId: string) => authService.switchTenant(tenantId),
    onSuccess: (_, tenantId) => {
      dispatch(setTenant({ tenantId }))
      queryClient.clear()
      navigate('/')
    },
    onError: (error) => handleError(error, 'Erro ao trocar de loja.'),
  })
}
