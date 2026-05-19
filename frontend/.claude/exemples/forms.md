# Formulários — React Hook Form + Zod

```tsx
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

const createProductSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(100),
  price: z.number({ invalid_type_error: 'Preço inválido' }).positive(),
  stock: z.number().int().min(0),
})

// Nunca tipar manualmente o que o Zod já infere
type CreateProductForm = z.infer<typeof createProductSchema>

const { control, handleSubmit, formState: { errors } } = useForm<CreateProductForm>({
  resolver: zodResolver(createProductSchema),
})
```
