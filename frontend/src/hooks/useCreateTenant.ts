import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useAppDispatch } from '../store'
import { setTenant, setAuth } from '../store/slices/auth.slice'
import { tenantService } from '../services/tenant.service'
import { authService } from '../services/auth.service'
import { mediaService } from '../services/media.service'
import { convertToWebp, validateImageFile } from '../utils/image.utils'
import { useToast } from './useToast'
import { useApiError } from './useApiError'
import type { CreateTenantFormData } from '../pages/CreateTenant/types'

export function useCreateTenant() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const showToast = useToast()
  const handleError = useApiError()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateTenantFormData) => tenantService.create(data),
    onSuccess: async (response, variables) => {
      dispatch(setTenant({ tenantId: response.tenantId }))

      if (variables.logoFile) {
        const validationError = validateImageFile(variables.logoFile)
        if (!validationError) {
          try {
            const webpBlob = await convertToWebp(variables.logoFile)
            const { uploadUrl, relativePath } = await mediaService.getPresignedUrl('Tenant', response.tenantId)
            await mediaService.uploadToMinio(uploadUrl, webpBlob)
            await mediaService.confirm('Tenant', response.tenantId, relativePath)
            queryClient.invalidateQueries({ queryKey: ['tenant-settings'] })
          } catch {
            // falha no upload do logo não impede o onboarding
          }
        }
      }

      const user = await authService.getMe()
      dispatch(setAuth(user))
      showToast('Negócio criado com sucesso!', 'success')
      navigate('/')
    },
    onError: (error) => handleError(error, 'Erro ao criar negócio.'),
  })
}
