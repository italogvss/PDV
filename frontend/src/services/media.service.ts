import { api } from './api'
import type { MediaCategory, PresignedUrlResponse } from '../types/media.types'

export const mediaService = {
  getPresignedUrl: async (
    category: MediaCategory,
    entityId: string,
  ): Promise<PresignedUrlResponse> => {
    const { data } = await api.get<PresignedUrlResponse>('/media/presigned-url', {
      params: { category, entityId },
    })
    return data
  },

  // PUT direto no MinIO — não usa o `api` (a presigned URL é absoluta, sem baseURL do backend).
  uploadToMinio: async (uploadUrl: string, blob: Blob): Promise<void> => {
    const response = await fetch(uploadUrl, {
      method: 'PUT',
      body: blob,
      headers: { 'Content-Type': 'image/webp' },
    })
    if (!response.ok) throw new Error('Falha ao enviar a imagem para o storage.')
  },

  confirm: async (
    category: MediaCategory,
    entityId: string,
    relativePath: string,
  ): Promise<void> => {
    await api.patch('/media/confirm', { category, entityId, relativePath })
  },

  remove: async (category: MediaCategory, entityId: string): Promise<void> => {
    await api.delete('/media', { params: { category, entityId } })
  },
}
