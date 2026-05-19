# Services — Axios

```ts
// services/api.ts
import axios from 'axios'

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  const tenantId = localStorage.getItem('tenantId')
  if (token) config.headers.Authorization = `Bearer ${token}`
  if (tenantId) config.headers['X-Tenant-Id'] = tenantId
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)
```

```ts
// services/products.service.ts
import { api } from './api'
import { Product, CreateProductInput, UpdateProductInput } from '../types/product.types'

export const productsService = {
  getAll: async (): Promise<Product[]> => {
    const { data } = await api.get('/products')
    return data.data
  },
  getById: async (id: string): Promise<Product> => {
    const { data } = await api.get(`/products/${id}`)
    return data.data
  },
  create: async (input: CreateProductInput): Promise<Product> => {
    const { data } = await api.post('/products', input)
    return data.data
  },
  update: async (id: string, input: UpdateProductInput): Promise<Product> => {
    const { data } = await api.patch(`/products/${id}`, input)
    return data.data
  },
  delete: async (id: string): Promise<void> => {
    await api.delete(`/products/${id}`)
  },
}
```
