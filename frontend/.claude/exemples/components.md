# Padrão de Componente React

```ts
// components/ProductCard/types.ts
export interface ProductCardProps {
  id: string
  name: string
  price: number
  imageUrl?: string
  onEdit: (id: string) => void
}
```

```tsx
// components/ProductCard/index.tsx
import { Card, CardContent, Typography } from '@mui/material'
import { ProductCardProps } from './types'

export default function ProductCard({ id, name, price, onEdit }: ProductCardProps) {
  return (
    <Card>
      <CardContent>
        <Typography>{name}</Typography>
      </CardContent>
    </Card>
  )
}
```
