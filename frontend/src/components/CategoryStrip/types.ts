export interface Category {
  id: string
  name: string
  color: string
}

export interface CategoryStripProps {
  categories: Category[]
  countByCategory: Record<string, number>
  isLoading: boolean
  onAdd: () => void
  onEdit: (category: Category) => void
  onDelete: (categoryId: string) => void
}
