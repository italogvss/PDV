// Tema no formato do backend (claim de /auth/me).
export type Theme = 'Light' | 'Dark'

export interface UserSettingsDTO {
  theme: Theme
  accentColor: AccentColor
  textSize: number
}

// Preferências pessoais persistidas (GET/PUT /api/account/settings).
export type AppTheme = 'light' | 'dark'
export type AccentColor = 'green' | 'blue' | 'orange' | 'purple' | 'pink' | 'graphite'

export interface AppearancePrefs {
  theme: AppTheme
  accentColor: AccentColor
  textSize: number
}

/** Limites do tamanho do texto (espelha a validação do backend). */
export const TEXT_SIZE_MIN = 14
export const TEXT_SIZE_MAX = 20
export const TEXT_SIZE_DEFAULT = 15

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
