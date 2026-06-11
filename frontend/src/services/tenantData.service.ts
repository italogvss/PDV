import { api } from './api'

type EntityKey = 'products' | 'sales' | 'services' | 'appointments' | 'expenses' | 'customers' | 'suppliers'

const ENDPOINT: Record<EntityKey, string> = {
  products: '/products/all',
  sales: '/sales/all',
  services: '/services/all',
  appointments: '/appointments/all',
  expenses: '/expenses/all',
  customers: '/customers/all',
  suppliers: '/suppliers/all',
}

export const tenantDataService = {
  purge: async (entity: EntityKey): Promise<number> => {
    const { data } = await api.delete<{ deleted: number }>(ENDPOINT[entity])
    return data.deleted
  },
}

export type { EntityKey }
