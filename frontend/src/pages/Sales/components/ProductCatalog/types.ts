import type { Product, ProductCategory } from '../../../../types/product.types'

export type CategoryValue = string | 'all'

export interface ProductCatalogProps {
  products: Product[]
  categories: ProductCategory[]
  search: string
  onSearchChange: (value: string) => void
  category: CategoryValue
  onCategoryChange: (value: CategoryValue) => void
  onAddProduct: (productId: string) => void
  isLoading?: boolean
}
