import { api } from './api'
import type { CreateTenantFormData } from '../pages/CreateTenant/types'
import type { CreateTenantResponse } from '../types/tenant.types'

export const tenantService = {
  async create(form: CreateTenantFormData, planSlug?: string | null): Promise<CreateTenantResponse> {
    const res = await api.post<CreateTenantResponse>('/tenants', {
      // Step 1
      fantasyName: form.fantasyName,
      phone:       form.phone || null,
      segment:     form.segment,
      customSegmentName: form.segment === 'outro' ? form.customSegmentName.trim() || null : null,
      logoUrl:     null, // upload via presigned URL — a implementar

      // Step 2
      skipDocuments:    form.skipDocuments,
      cnpj:             form.skipDocuments ? null : form.cnpj  || null,
      companyName:      form.skipDocuments ? null : form.companyName || null,
      stateRegistration: form.skipDocuments ? null : form.stateRegistration || null,
      taxRegime:        form.taxRegime,

      // Step 3 (opcional, igual Documentos)
      skipAddress:  form.skipAddress,
      cep:          form.skipAddress ? null : form.cep          || null,
      street:       form.skipAddress ? null : form.street       || null,
      number:       form.skipAddress ? null : form.number       || null,
      complement:   form.skipAddress ? null : form.complement   || null,
      neighborhood: form.skipAddress ? null : form.neighborhood || null,
      city:         form.skipAddress ? null : form.city         || null,
      state:        form.skipAddress ? null : form.state        || null,

      // Step 4
      skipHours:    form.skipHours,
      hoursPreset:  form.skipHours ? null : form.hoursPreset,
      businessHours: form.skipHours ? null : form.businessHours,

      // Plano escolhido na landing page (inicia trial de 30 dias automaticamente)
      planSlug: planSlug ?? null,
    })
    return res.data
  },
}
