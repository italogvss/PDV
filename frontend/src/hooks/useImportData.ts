import { useMutation, useQueryClient } from '@tanstack/react-query'
import { reportService, type ImportType } from '../services/report.service'
import { useApiError } from './useApiError'
import { useToast } from './useToast'

// Query keys das listagens afetadas por cada tipo de importação (invalidadas no sucesso).
const INVALIDATE_KEYS: Record<ImportType, string[]> = {
  products: ['products'],
  customers: ['customers'],
  services: ['services'],
}

export function useImportData() {
  const queryClient = useQueryClient()
  const showToast = useToast()
  const handleError = useApiError()

  return useMutation({
    mutationFn: ({ type, file }: { type: ImportType; file: File }) =>
      reportService.importCsv(type, file),
    onSuccess: (result, { type }) => {
      queryClient.invalidateQueries({ queryKey: INVALIDATE_KEYS[type] })
      const suffix =
        result.createdCategories > 0
          ? ` (${result.createdCategories} ${result.createdCategories === 1 ? 'categoria criada' : 'categorias criadas'})`
          : ''
      showToast(`${result.importedCount} registros importados com sucesso!${suffix}`, 'success')
    },
    onError: (error) => handleError(error, 'Erro ao importar dados.'),
  })
}
