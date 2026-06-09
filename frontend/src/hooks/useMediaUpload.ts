import { useMutation, useQueryClient } from '@tanstack/react-query'
import { mediaService } from '../services/media.service'
import { convertToWebp, validateImageFile } from '../utils/image.utils'
import { useToast } from './useToast'
import { useApiError } from './useApiError'
import type { MediaCategory } from '../types/media.types'

/**
 * Faz o fluxo completo de upload: valida → converte para webp → presigned URL →
 * PUT direto no MinIO → confirma no backend → invalida a query da entidade.
 */
export function useUploadImage(category: MediaCategory, queryKeyToInvalidate: readonly unknown[]) {
  const queryClient = useQueryClient()
  const showToast = useToast()
  const handleError = useApiError()

  return useMutation({
    mutationFn: async ({ file, entityId }: { file: File; entityId: string }) => {
      const validationError = validateImageFile(file)
      if (validationError) throw new Error(validationError)

      const webpBlob = await convertToWebp(file)
      const { uploadUrl, relativePath } = await mediaService.getPresignedUrl(category, entityId)
      await mediaService.uploadToMinio(uploadUrl, webpBlob)
      await mediaService.confirm(category, entityId, relativePath)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeyToInvalidate })
      showToast('Imagem atualizada com sucesso!', 'success')
    },
    onError: (error) => handleError(error, 'Erro ao fazer upload da imagem.'),
  })
}

export function useRemoveImage(category: MediaCategory, queryKeyToInvalidate: readonly unknown[]) {
  const queryClient = useQueryClient()
  const showToast = useToast()
  const handleError = useApiError()

  return useMutation({
    mutationFn: (entityId: string) => mediaService.remove(category, entityId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeyToInvalidate })
      showToast('Imagem removida com sucesso!', 'success')
    },
    onError: (error) => handleError(error, 'Erro ao remover imagem.'),
  })
}
