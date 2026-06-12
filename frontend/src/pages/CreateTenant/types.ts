import type { BusinessSegment, BusinessHours, TaxRegime, HoursPreset } from '../../types/settings.types'

export const DEFAULT_HOURS_PRESETS: Record<Exclude<HoursPreset, 'personalizado'>, BusinessHours> = {
  comercial: {
    monday:    { open: true,  openTime: '08:00', closeTime: '18:00' },
    tuesday:   { open: true,  openTime: '08:00', closeTime: '18:00' },
    wednesday: { open: true,  openTime: '08:00', closeTime: '18:00' },
    thursday:  { open: true,  openTime: '08:00', closeTime: '18:00' },
    friday:    { open: true,  openTime: '08:00', closeTime: '18:00' },
    saturday:  { open: true,  openTime: '08:00', closeTime: '13:00' },
    sunday:    { open: false, openTime: '08:00', closeTime: '13:00' },
  },
  estendido: {
    monday:    { open: true, openTime: '07:00', closeTime: '22:00' },
    tuesday:   { open: true, openTime: '07:00', closeTime: '22:00' },
    wednesday: { open: true, openTime: '07:00', closeTime: '22:00' },
    thursday:  { open: true, openTime: '07:00', closeTime: '22:00' },
    friday:    { open: true, openTime: '07:00', closeTime: '22:00' },
    saturday:  { open: true, openTime: '07:00', closeTime: '22:00' },
    sunday:    { open: true, openTime: '07:00', closeTime: '22:00' },
  },
  '24horas': {
    monday:    { open: true, openTime: '00:00', closeTime: '23:59' },
    tuesday:   { open: true, openTime: '00:00', closeTime: '23:59' },
    wednesday: { open: true, openTime: '00:00', closeTime: '23:59' },
    thursday:  { open: true, openTime: '00:00', closeTime: '23:59' },
    friday:    { open: true, openTime: '00:00', closeTime: '23:59' },
    saturday:  { open: true, openTime: '00:00', closeTime: '23:59' },
    sunday:    { open: true, openTime: '00:00', closeTime: '23:59' },
  },
}

export interface CreateTenantFormData {
  fantasyName: string
  phone: string
  segment: BusinessSegment | ''
  logoPreview: string | null
  logoFile: File | null
  skipDocuments: boolean
  skipHours: boolean
  cnpj: string
  companyName: string
  stateRegistration: string
  taxRegime: TaxRegime
  cep: string
  street: string
  number: string
  complement: string
  neighborhood: string
  city: string
  state: string
  hoursPreset: HoursPreset
  businessHours: BusinessHours
}

export const INITIAL_FORM_DATA: CreateTenantFormData = {
  fantasyName: '',
  phone: '',
  segment: '',
  logoPreview: null,
  logoFile: null,
  skipDocuments: false,
  skipHours: false,
  cnpj: '',
  companyName: '',
  stateRegistration: '',
  taxRegime: 'simples',
  cep: '',
  street: '',
  number: '',
  complement: '',
  neighborhood: '',
  city: '',
  state: '',
  hoursPreset: 'comercial',
  businessHours: DEFAULT_HOURS_PRESETS.comercial,
}

export type FormErrors = Partial<Record<keyof CreateTenantFormData, string>>

export const STEPS = [
  { label: 'Seu negócio', subtitle: 'Como ele se chama' },
  { label: 'Documentos', subtitle: 'CNPJ e razão social' },
  { label: 'Endereço', subtitle: 'Onde ele fica' },
] as const
