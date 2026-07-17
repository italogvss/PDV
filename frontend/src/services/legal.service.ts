import { api } from './api'

export type LegalDocumentSlug = 'termos-de-uso' | 'politica-de-privacidade'

interface BackendLegalDocument {
  type: string
  content: string
  updatedAt: string
}

export const legalService = {
  getBySlug: async (slug: LegalDocumentSlug): Promise<string> => {
    const { data } = await api.get<BackendLegalDocument>(`/legal/${slug}`)
    return data.content
  },
}
