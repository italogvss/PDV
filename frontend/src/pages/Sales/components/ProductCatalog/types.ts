import { Product, ProductCategory } from '../../types'

export type CategoryValue = ProductCategory | 'all'

export interface ProductCatalogProps {
  products: Product[]
  search: string
  onSearchChange: (value: string) => void
  category: CategoryValue
  onCategoryChange: (value: CategoryValue) => void
  onAddProduct: (productId: string) => void
}
