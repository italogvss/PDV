export type BusinessSegment =
  | 'cafeteria'
  | 'restaurante'
  | 'mercado'
  | 'varejo'
  | 'farmacia'
  | 'vestuario'
  | 'eletronicos'
  | 'servicos'
  | 'outro'

export type DayOfWeek =
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday'

  // Configurações persistidas do tenant. Negócio, Operação e Pagamentos têm endpoint
// (GET /api/tenants/settings + PUT por seção); as demais seções ainda são apenas UI.
export interface TenantSettings {
  business: BusinessSettings
  operation: OperationSettings
  payments: PaymentsSettings
}

export interface BusinessHoursDay {
  open: boolean
  openTime: string
  closeTime: string
}

export interface BusinessAddress {
  cep: string
  street: string
  number: string
  complement: string | null
  neighborhood: string
  city: string
  state: string
}

export interface BusinessSettings {
  logoUrl: string | null
  fantasyName: string
  companyName: string
  cnpj: string
  stateRegistration: string
  segment: string
  phone: string
  taxRegime: string
  address: BusinessAddress
  businessHours: BusinessHours | null
}

export interface OperationSettings {
  autoOpen: boolean
  requireOperator: boolean
  cashFundAmount: number
  inactivityLockMinutes: number
  allowDiscounts: boolean
  discountLimitPercent: number
  requireManagerCancel: boolean
  barcodeReader: boolean
}

// Pagamentos — cada método aceito tem um flag de habilitado e a taxa por venda (%).
export interface PaymentMethodConfig {
  enabled: boolean
  fee: number
}

export interface PaymentsSettings {
  pix: PaymentMethodConfig
  cardCredit: PaymentMethodConfig
  cardDebit: PaymentMethodConfig
  cash: PaymentMethodConfig
}

export interface AppearanceSettings {
  theme: AppTheme
  accentColor: AccentColor
  density: UiDensity
  language: AppLanguage
  currencyFormat: CurrencyFormat
}

export type TaxRegime = 'simples' | 'presumido' | 'real' | 'mei'

export interface FiscalSettings {
  taxRegime: TaxRegime
  cfop: string
  csosn: string
  nfceSerie: string
  nfceNextNumber: number
  autoEmitNfce: boolean
  offlineContingency: boolean
}

export type PaperWidthMm = 58 | 80

export interface PrintingSettings {
  paperWidthMm: PaperWidthMm
  autoPrint: boolean
  includeLogo: boolean
  printCopy: boolean
  qrCode: boolean
  footerMessage: string
}

export type AppTheme = 'light' | 'dark' | 'auto'
export type AccentColor = 'green' | 'blue' | 'orange' | 'purple' | 'pink' | 'graphite'
export type UiDensity = 'compact' | 'comfortable'
export type AppLanguage = 'pt-BR' | 'en-US' | 'es'
export type CurrencyFormat = 'brl' | 'usd'



export type BusinessHours = Record<DayOfWeek, BusinessHoursDay>

export type HoursPreset = 'comercial' | 'estendido' | '24horas' | 'personalizado'



export type InactivityLockMinutes = 0 | 1 | 5 | 10 | 30


export type BackupFrequency = 'daily' | 'weekly' | 'monthly'
export type RetentionDays = 7 | 14 | 30 | 90

export interface BackupSettings {
  autoBackup: boolean
  frequency: BackupFrequency
  backupTime: string
  retentionDays: RetentionDays
}

export type IntegrationStatus = 'connected' | 'available'

export interface IntegrationsSettings {
  ifood: IntegrationStatus
  stone: IntegrationStatus
  nuvemshop: IntegrationStatus
  contaazul: IntegrationStatus
}

export interface AdvancedSettings {
  apiPublicKey: string
  webhookUrl: string
  devMode: boolean
  auditLogs: boolean
  storeId: string
  appVersion: string
}


