import { isAxiosError } from 'axios'
import { useToast } from './useToast'
import { getApiErrorMessage } from '../utils/apiError'

export function useApiError() {
  const showToast = useToast()

  return (error: unknown, fallback: string) => {
    // Conta em processo de exclusão (423): a tela de bloqueio já comunica o estado — não emitir toast
    // (as queries de fundo respondem 423 e gerariam spam de erro).
    if (isAxiosError(error) && error.response?.status === 423) return

    const message = getApiErrorMessage(error, fallback)
    showToast(message, 'error')

    if (import.meta.env.DEV) {
      if (isAxiosError(error)) {
        console.error('[API Error]', {
          status: error.response?.status,
          url: error.config?.url,
          method: error.config?.method?.toUpperCase(),
          title: error.response?.data?.title,
          detail: error.response?.data?.detail,
        })
      } else {
        console.error('[Unexpected Error]', error)
      }
    }
  }
}
