import { isAxiosError } from 'axios'
import { useToast } from './useToast'
import { getApiErrorMessage } from '../utils/apiError'

export function useApiError() {
  const showToast = useToast()

  return (error: unknown, fallback: string) => {
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
