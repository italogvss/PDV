import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useAppDispatch } from '../store'
import { setTenant, setAuth } from '../store/slices/auth.slice'
import { authService } from '../services/auth.service'
import { useApiError } from './useApiError'

export function useSwitchTenant() {
  const queryClient = useQueryClient()
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const handleError = useApiError()

  return useMutation({
    mutationFn: (tenantId: string) => authService.switchTenant(tenantId),
    onSuccess: async (_, tenantId) => {
      dispatch(setTenant({ tenantId })) // otimista: X-Tenant-Id correto no getMe
      queryClient.clear()
      const user = await authService.getMe()
      dispatch(setAuth(user))
      navigate('/')
    },
    onError: (error) => handleError(error, 'Erro ao trocar de loja.'),
  })
}
