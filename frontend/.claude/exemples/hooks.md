# Hooks — React Query

```ts
// hooks/useProducts.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAppSelector } from '../store'
import { productsService } from '../services/products.service'
import { CreateProductInput } from '../types/product.types'

export const PRODUCTS_KEY = (tenantId: string) => ['products', tenantId] as const

export function useProducts() {
  const tenantId = useAppSelector((state) => state.auth.tenantId)

  return useQuery({
    queryKey: PRODUCTS_KEY(tenantId!),
    queryFn: productsService.getAll,
    enabled: !!tenantId,
  })
}

export function useCreateProduct() {
  const queryClient = useQueryClient()
  const tenantId = useAppSelector((state) => state.auth.tenantId)

  return useMutation({
    mutationFn: (input: CreateProductInput) => productsService.create(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: PRODUCTS_KEY(tenantId!) }),
  })
}
```
