import { api } from './api'
import type {
  BusinessSettings,
  BusinessHours,
  OperationSettings,
  TenantSettings,
} from '../types/settings.types'

// Tipos do backend (campos opcionais chegam como null)
interface BackendAddress {
  cep: string | null
  street: string | null
  number: string | null
  complement: string | null
  neighborhood: string | null
  city: string | null
  state: string | null
}

interface BackendBusiness {
  logoUrl: string | null
  fantasyName: string
  companyName: string | null
  cnpj: string | null
  stateRegistration: string | null
  segment: string | null
  phone: string | null
  taxRegime: string
  address: BackendAddress
  businessHours: BusinessHours | null
}

interface BackendSettings {
  business: BackendBusiness
  operation: OperationSettings
}

function mapBusiness(b: BackendBusiness): BusinessSettings {
  return {
    logoUrl: b.logoUrl,
    fantasyName: b.fantasyName,
    companyName: b.companyName ?? '',
    cnpj: b.cnpj ?? '',
    stateRegistration: b.stateRegistration ?? '',
    segment: b.segment ?? 'outro',
    phone: b.phone ?? '',
    taxRegime: b.taxRegime,
    address: {
      cep: b.address.cep ?? '',
      street: b.address.street ?? '',
      number: b.address.number ?? '',
      complement: b.address.complement,
      neighborhood: b.address.neighborhood ?? '',
      city: b.address.city ?? '',
      state: b.address.state ?? '',
    },
    businessHours: b.businessHours,
  }
}

export const tenantSettingsService = {
  get: async (): Promise<TenantSettings> => {
    const { data } = await api.get<BackendSettings>('/tenants/settings')
    return { business: mapBusiness(data.business), operation: data.operation }
  },

  // O shape de BusinessSettings já bate com o DTO do backend (camelCase) — envia direto.
  updateBusiness: async (payload: BusinessSettings): Promise<BusinessSettings> => {
    const { data } = await api.put<BackendBusiness>('/tenants/settings/business', payload)
    return mapBusiness(data)
  },

  updateOperation: async (payload: OperationSettings): Promise<OperationSettings> => {
    const { data } = await api.put<OperationSettings>('/tenants/settings/operation', payload)
    return data
  },
}
