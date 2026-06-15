import { api } from './api'
import type {
  Product,
  ProductCategory,
  CreateProductPayload,
  UpdateProductPayload,
  CreateCategoryPayload,
  UpdateCategoryPayload,
} from '../types/product.types'

interface PaginatedResponse<T> {
  data: T[]
  page: number
  pageSize: number
  totalCount: number
  totalPages: number
}

interface BackendProduct {
  id: string
  name: string
  barcode?: string | null
  ncm?: string | null
  price: number
  purchasePrice?: number | null
  stock: number
  minStock?: number | null
  minCriticalStock?: number | null
  isActive: boolean
  createdAt: string
  category: ProductCategory | null
  imageUrl?: string | null
}

function mapProduct(p: BackendProduct): Product {
  return {
    id: p.id,
    name: p.name,
    barcode: p.barcode ?? undefined,
    category: p.category,
    costPrice: p.purchasePrice ?? 0,
    price: p.price,
    stock: p.stock,
    isActive: p.isActive,
    minStock: p.minStock ?? undefined,
    criticalStock: p.minCriticalStock ?? undefined,
    imageUrl: p.imageUrl ?? undefined,
  }
}

export const productService = {
  getAll: async (): Promise<Product[]> => {
    const { data } = await api.get<PaginatedResponse<BackendProduct>>('/products', {
      params: { page: 1, pageSize: 500 },
    })
    return data.data.map(mapProduct)
  },

  create: async (payload: CreateProductPayload): Promise<Product> => {

    const { data } = await api.post<BackendProduct>('/products', payload)
    return mapProduct(data)
  },

  update: async (id: string, payload: UpdateProductPayload): Promise<Product> => {
    const { data } = await api.put<BackendProduct>(`/products/${id}`, payload)
    return mapProduct(data)
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/products/${id}`)
  },

  adjustStock: async (id: string, quantity: number): Promise<Product> => {
    const { data } = await api.patch<BackendProduct>(`/products/${id}/stock`, { quantity })
    return mapProduct(data)
  },

  getAllCategories: async (): Promise<ProductCategory[]> => {
    const { data } = await api.get<ProductCategory[]>('/product-categories')
    return data
  },

  createCategory: async (payload: CreateCategoryPayload): Promise<ProductCategory> => {
    const { data } = await api.post<ProductCategory>('/product-categories', payload)
    return data
  },

  updateCategory: async (id: string, payload: UpdateCategoryPayload): Promise<ProductCategory> => {
    const { data } = await api.put<ProductCategory>(`/product-categories/${id}`, payload)
    return data
  },

  deleteCategory: async (id: string): Promise<void> => {
    await api.delete(`/product-categories/${id}`)
  },

  getInactiveProducts: async (): Promise<{ id: string; name: string }[]> => {
    const { data } = await api.get<BackendProduct[]>('/products/inactive')
    return data.map((p) => ({ id: p.id, name: p.name }))
  },

  restoreProduct: async (id: string): Promise<void> => {
    await api.patch(`/products/${id}/restore`)
  },

  hardDeleteProduct: async (id: string): Promise<void> => {
    await api.delete(`/products/${id}/permanent`)
  },

  getInactiveCategories: async (): Promise<{ id: string; name: string }[]> => {
    const { data } = await api.get<{ id: string; name: string; color?: string }[]>('/product-categories/inactive')
    return data.map((c) => ({ id: c.id, name: c.name }))
  },

  restoreCategory: async (id: string): Promise<void> => {
    await api.patch(`/product-categories/${id}/restore`)
  },

  hardDeleteCategory: async (id: string): Promise<void> => {
    await api.delete(`/product-categories/${id}/permanent`)
  },
}
