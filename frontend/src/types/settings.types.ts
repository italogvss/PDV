import type { OperationModule } from '../constants/modules'

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
  modules: OperationModule[]
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
  allowDiscounts: boolean
  discountLimitPercent: number
  inventoryControlEnabled: boolean
  defaultMinStock: number
  defaultCriticalStock: number
  stockFieldsEditable: boolean
  requireCustomerOnSale: boolean
  requireCustomerOnAppointment: boolean
}

// Pagamentos — cada método aceito tem um flag de habilitado e a taxa por venda (%).
export interface PaymentMethodConfig {
  enabled: boolean
  fee: number
}

export interface PaymentsSettings {
  feesEnabled: boolean
  pix: PaymentMethodConfig
  cardCredit: PaymentMethodConfig
  cardDebit: PaymentMethodConfig
  cash: PaymentMethodConfig
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

export type BusinessHours = Record<DayOfWeek, BusinessHoursDay>

export type HoursPreset = 'comercial' | 'estendido' | '24horas' | 'personalizado'

export type BackupFrequency = 'daily' | 'weekly' | 'monthly'
export type RetentionDays = 7 | 14 | 30 | 90

export interface BackupSettings {
  autoBackup: boolean
  frequency: BackupFrequency
  backupTime: string
  retentionDays: RetentionDays
}

export interface AdvancedSettings {
  apiPublicKey: string
  webhookUrl: string
  devMode: boolean
  auditLogs: boolean
  storeId: string
  appVersion: string
}


