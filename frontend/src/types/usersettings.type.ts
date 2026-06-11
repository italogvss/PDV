// Tema no formato do backend (claim de /auth/me).
export type Theme = 'Light' | 'Dark'

export interface UserSettingsDTO {
  theme: Theme
}

// Preferências pessoais persistidas (GET/PUT /api/account/settings).
export type AppTheme = 'light' | 'dark'
export type AccentColor = 'green' | 'blue' | 'orange' | 'purple' | 'pink' | 'graphite'

export interface AppearancePrefs {
  theme: AppTheme
  accentColor: AccentColor
}

export interface NotificationPrefs {
  newSales: boolean
  stockAlerts: boolean
  invoices: boolean
  teamActivity: boolean
}

export interface UserSettings {
  appearance: AppearancePrefs
  notifications: NotificationPrefs
}
