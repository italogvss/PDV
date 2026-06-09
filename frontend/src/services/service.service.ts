import { api } from './api'
import type {
  Service,
  ServiceCategory,
  CreateServicePayload,
  UpdateServicePayload,
  CreateServiceCategoryPayload,
  UpdateServiceCategoryPayload,
} from '../types/service.types'

interface BackendService {
  id: string
  name: string
  description?: string | null
  durationMinutes?: number | null
  price: number
  isActive: boolean
  category: ServiceCategory | null
}

interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
}

function mapService(s: BackendService): Service {
  return {
    id: s.id,
    name: s.name,
    description: s.description ?? undefined,
    durationMinutes: s.durationMinutes ?? undefined,
    price: s.price,
    category: s.category,
    isActive: s.isActive,
  }
}

export const serviceService = {
  getAll: async (): Promise<Service[]> => {
    const { data } = await api.get<PaginatedResponse<BackendService>>('/services', {
      params: { page: 1, pageSize: 500 },
    })
    return data.data.map(mapService)
  },

  create: async (payload: CreateServicePayload): Promise<Service> => {
    const { data } = await api.post<BackendService>('/services', payload)
    return mapService(data)
  },

  update: async (id: string, payload: UpdateServicePayload): Promise<Service> => {
    const { data } = await api.put<BackendService>(`/services/${id}`, payload)
    return mapService(data)
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/services/${id}`)
  },

  getAllCategories: async (): Promise<ServiceCategory[]> => {
    const { data } = await api.get<ServiceCategory[]>('/service-categories')
    return data
  },

  createCategory: async (payload: CreateServiceCategoryPayload): Promise<ServiceCategory> => {
    const { data } = await api.post<ServiceCategory>('/service-categories', payload)
    return data
  },

  updateCategory: async (id: string, payload: UpdateServiceCategoryPayload): Promise<ServiceCategory> => {
    const { data } = await api.put<ServiceCategory>(`/service-categories/${id}`, payload)
    return data
  },

  deleteCategory: async (id: string): Promise<void> => {
    await api.delete(`/service-categories/${id}`)
  },
}
