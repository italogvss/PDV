import { api } from './api'
import type {
  AppearancePrefs,
  AppTheme,
  NotificationPrefs,
  UserSettings,
} from '../types/usersettings.type'

// Tipos do backend — o tema vem capitalizado (enum Theme: "Light" | "Dark").
interface BackendAppearance {
  theme: 'Light' | 'Dark'
  accentColor: AppearancePrefs['accentColor']
  textSize: number
}

interface BackendUserSettings {
  appearance: BackendAppearance
  notifications: NotificationPrefs
}

const themeFromBackend = (t: BackendAppearance['theme']): AppTheme =>
  t === 'Dark' ? 'dark' : 'light'
const themeToBackend = (t: AppTheme): BackendAppearance['theme'] =>
  t === 'dark' ? 'Dark' : 'Light'

const mapAppearance = (a: BackendAppearance): AppearancePrefs => ({
  theme: themeFromBackend(a.theme),
  accentColor: a.accentColor,
  textSize: a.textSize,
})

export const userSettingsService = {
  get: async (): Promise<UserSettings> => {
    const { data } = await api.get<BackendUserSettings>('/account/settings')
    return { appearance: mapAppearance(data.appearance), notifications: data.notifications }
  },

  updateAppearance: async (payload: AppearancePrefs): Promise<AppearancePrefs> => {
    const { data } = await api.put<BackendAppearance>('/account/settings/appearance', {
      theme: themeToBackend(payload.theme),
      accentColor: payload.accentColor,
      textSize: payload.textSize,
    })
    return mapAppearance(data)
  },

  updateNotifications: async (payload: NotificationPrefs): Promise<NotificationPrefs> => {
    const { data } = await api.put<NotificationPrefs>('/account/settings/notifications', payload)
    return data
  },
}
