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
import { getStoredPlanSlug, clearStoredPlanSlug } from '../utils/planSelection'
import type { CreateTenantFormData } from '../pages/CreateTenant/types'

export function useCreateTenant() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const showToast = useToast()
  const handleError = useApiError()
  const queryClient = useQueryClient()

  return useMutation({
    // Plano escolhido na landing (?plano=) inicia o trial PDV-side de 30 dias na criação do tenant.
    mutationFn: (data: CreateTenantFormData) => tenantService.create(data, getStoredPlanSlug()),
    onSuccess: async (response, variables) => {
      clearStoredPlanSlug()
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
