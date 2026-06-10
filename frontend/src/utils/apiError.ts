import { isAxiosError } from 'axios'

export function getApiErrorMessage(error: unknown, fallback: string): string {
  if (!isAxiosError(error)) return fallback

  const status = error.response?.status
  const data = error.response?.data

  // detail — vem do ExceptionMiddleware (FluentValidation, BusinessException)
  if (typeof data?.detail === 'string') {
    return status ? `${data.detail} [${status}]` : data.detail
  }

  // errors — vem do ValidationProblemDetails padrão do [ApiController]
  if (data?.errors && typeof data.errors === 'object') {
    const messages = (Object.values(data.errors) as unknown[]).flat().join(' | ')
    if (messages) return status ? `${messages} [${status}]` : messages
  }

  const base = typeof data?.title === 'string' ? data.title : fallback
  return status ? `${base} [${status}]` : base
}
