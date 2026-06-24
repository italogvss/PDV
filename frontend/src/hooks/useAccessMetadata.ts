import { useQuery } from '@tanstack/react-query'
import { accessService } from '../services/access.service'

const ACCESS_METADATA_KEY = ['access-metadata'] as const

// Metadados estáticos do eixo de Access Control (módulos, permissões e mapa módulo→permissões).
// Fonte: backend ModuleCatalog (GET /api/access/metadata). Cache "infinito" — praticamente imutável.
export function useAccessMetadata() {
  return useQuery({
    queryKey: ACCESS_METADATA_KEY,
    queryFn: () => accessService.getMetadata(),
    staleTime: Infinity,
  })
}
