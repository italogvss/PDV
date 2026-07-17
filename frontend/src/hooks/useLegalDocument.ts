import { useQuery } from '@tanstack/react-query'
import { legalService, type LegalDocumentSlug } from '../services/legal.service'

export function useLegalDocument(slug: LegalDocumentSlug) {
  return useQuery({
    queryKey: ['legal-document', slug] as const,
    queryFn: () => legalService.getBySlug(slug),
    staleTime: Infinity,
  })
}
