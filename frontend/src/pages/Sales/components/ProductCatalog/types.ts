import type { Product, ProductCategory } from '../../../../types/product.types'
import type { Service, ServiceCategory } from '../../../../types/service.types'

export type CategoryValue = string | 'all'
export type CatalogMode = 'products' | 'services'

export interface ProductCatalogProps {
  mode: CatalogMode
  onModeChange: (mode: CatalogMode) => void
  products: Product[]
  productCategories: ProductCategory[]
  services: Service[]
  serviceCategories: ServiceCategory[]
  search: string
  onSearchChange: (value: string) => void
  category: CategoryValue
  onCategoryChange: (value: CategoryValue) => void
  onAddProduct: (productId: string) => void
  onAddService: (serviceId: string) => void
  isLoading?: boolean
}
