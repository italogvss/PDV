import { useMutation } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useAppDispatch } from '../store'
import { setTenant } from '../store/slices/auth.slice'
import { tenantService } from '../services/tenant.service'
import { useToast } from './useToast'
import { useApiError } from './useApiError'
import type { CreateTenantFormData } from '../pages/CreateTenant/types'

export function useCreateTenant() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const showToast = useToast()
  const handleError = useApiError()

  return useMutation({
    mutationFn: (data: CreateTenantFormData) => tenantService.create(data),
    onSuccess: (response) => {
      dispatch(setTenant({ tenantId: response.tenantId }))
      showToast('Negócio criado com sucesso!', 'success')
      navigate('/')
    },
    onError: (error) => handleError(error, 'Erro ao criar negócio.'),
  })
}
