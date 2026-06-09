import { api } from './api'
import type { CreateTenantFormData } from '../pages/CreateTenant/types'
import type { CreateTenantResponse } from '../types/tenant.types'

export const tenantService = {
  async create(form: CreateTenantFormData): Promise<CreateTenantResponse> {
    const res = await api.post<CreateTenantResponse>('/tenants', {
      // Step 1
      fantasyName: form.fantasyName,
      phone:       form.phone || null,
      segment:     form.segment,
      logoUrl:     null, // upload via presigned URL — a implementar

      // Step 2
      skipDocuments:    form.skipDocuments,
      cnpj:             form.skipDocuments ? null : form.cnpj  || null,
      companyName:      form.skipDocuments ? null : form.companyName || null,
      stateRegistration: form.skipDocuments ? null : form.stateRegistration || null,
      taxRegime:        form.taxRegime,

      // Step 3
      cep:          form.cep          || null,
      street:       form.street       || null,
      number:       form.number       || null,
      complement:   form.complement   || null,
      neighborhood: form.neighborhood || null,
      city:         form.city         || null,
      state:        form.state        || null,

      // Step 4
      skipHours:    form.skipHours,
      hoursPreset:  form.skipHours ? null : form.hoursPreset,
      businessHours: form.skipHours ? null : form.businessHours,
    })
    return res.data
  },
}
