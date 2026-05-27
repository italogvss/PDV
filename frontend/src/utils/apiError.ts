import { isAxiosError } from 'axios'

export function getApiErrorMessage(error: unknown, fallback: string): string {
  if (!isAxiosError(error)) return fallback

  const status = error.response?.status
  const serverMessage =
    typeof error.response?.data?.title === 'string' ? error.response.data.title : null

  const base = serverMessage ?? fallback
  return status ? `${base} [${status}]` : base
}
