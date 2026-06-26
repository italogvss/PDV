import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useAppDispatch } from '../store'
import { setAuth } from '../store/slices/auth.slice'
import { api } from '../services/api'
import { authService } from '../services/auth.service'
import { useApiError } from './useApiError'

export function useDeactivateTenant() {
  const queryClient = useQueryClient()
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const handleError = useApiError()

  return useMutation({
    mutationFn: () => api.delete('/tenants/current'),
    onSuccess: async () => {
      queryClient.clear()
      const user = await authService.getMe()
      dispatch(setAuth(user))
      navigate('/')
    },
    onError: (error) => handleError(error, 'Erro ao encerrar o estabelecimento.'),
  })
}
