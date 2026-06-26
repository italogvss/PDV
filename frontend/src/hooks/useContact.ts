import { useMutation } from '@tanstack/react-query'
import { contactService } from '../services/contact.service'
import { useToast } from './useToast'
import { useApiError } from './useApiError'
import type { CreateContactMessagePayload } from '../types/contact.types'

export function useCreateContactMessage() {
  const showToast = useToast()
  const handleError = useApiError()

  return useMutation({
    mutationFn: (payload: CreateContactMessagePayload) => contactService.create(payload),
    onSuccess: () => {
      showToast('Mensagem enviada com sucesso!', 'success')
    },
    onError: (error) => handleError(error, 'Erro ao enviar mensagem.'),
  })
}
