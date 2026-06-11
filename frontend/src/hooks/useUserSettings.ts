import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { userSettingsService } from '../services/userSettings.service'
import type { AppearancePrefs, NotificationPrefs } from '../types/usersettings.type'
import { useToast } from './useToast'
import { useApiError } from './useApiError'

const QUERY_KEY = ['user-settings'] as const

export function useUserSettings() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => userSettingsService.get(),
  })
}

export function useUpdateAppearanceSettings() {
  const queryClient = useQueryClient()
  const showToast = useToast()
  const handleError = useApiError()

  return useMutation({
    mutationFn: (payload: AppearancePrefs) => userSettingsService.updateAppearance(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY })
      showToast('Preferências salvas!', 'success')
    },
    onError: (error) => handleError(error, 'Erro ao salvar preferências.'),
  })
}

export function useUpdateNotificationSettings() {
  const queryClient = useQueryClient()
  const showToast = useToast()
  const handleError = useApiError()

  return useMutation({
    mutationFn: (payload: NotificationPrefs) => userSettingsService.updateNotifications(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY })
      showToast('Preferências salvas!', 'success')
    },
    onError: (error) => handleError(error, 'Erro ao salvar preferências.'),
  })
}
