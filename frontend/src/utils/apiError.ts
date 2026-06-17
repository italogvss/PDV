import { isAxiosError } from 'axios'

// Mensagens amigáveis para o gating de plano (402 com `code` no Problem Details).
const PLAN_GATING_MESSAGES: Record<string, string> = {
  PLAN_LIMIT_EXCEEDED: 'Você atingiu o limite do seu plano. Faça upgrade para continuar.',
  MODULE_NOT_IN_PLAN: 'Este recurso não está incluído no seu plano. Faça upgrade para liberá-lo.',
}

export function getApiErrorMessage(error: unknown, fallback: string): string {
  if (!isAxiosError(error)) return fallback

  const status = error.response?.status
  const data = error.response?.data

  // 402 de gating de plano — mensagem amigável + dica de upgrade a partir do `code`.
  if (status === 402 && typeof data?.code === 'string' && data.code in PLAN_GATING_MESSAGES) {
    return PLAN_GATING_MESSAGES[data.code]
  }

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
