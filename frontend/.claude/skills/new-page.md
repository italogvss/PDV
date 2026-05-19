# Skill — Nova página com rota

Use esta skill sempre que precisar criar uma nova página em `/frontend/src/pages/`.

## Checklist obrigatório

1. Criar pasta `/pages/{PageName}/`
2. Criar `index.tsx` com o componente da página
3. Criar subpasta `components/` para componentes exclusivos desta página
4. Registrar a rota em `/router/index.tsx`
5. Página autenticada entra dentro do `ProtectedRoute`
6. Página não faz fetch direto — delegar para hooks React Query

## Estrutura

```
pages/
└── Products/
    ├── index.tsx
    └── components/
        ├── ProductTable/
        │   ├── index.tsx
        │   └── types.ts
        └── ProductFormModal/
            ├── index.tsx
            └── types.ts
```

## Template de página

```tsx
// pages/{PageName}/index.tsx
import { Box, Typography, Button } from '@mui/material'
import { use{Feature}s } from '../../hooks/use{Feature}'

export default function {PageName}Page() {
  const { data, isLoading } = use{Feature}s()

  if (isLoading) return <Box>Carregando...</Box>

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h5" color="text.primary">
          Título da Página
        </Typography>
        <Button variant="contained" color="primary">
          Nova ação
        </Button>
      </Box>
    </Box>
  )
}
```

## Template de rota

```tsx
// router/index.tsx
import { createBrowserRouter } from 'react-router-dom'
import ProtectedRoute from '../components/ProtectedRoute'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <ProtectedRoute />,
    children: [
      { path: 'products', element: <ProductsPage /> },
    ],
  },
  { path: '/login', element: <LoginPage /> },
])
```

## Regras

- Componentes exclusivos da página ficam em `pages/{PageName}/components/`
- Componentes reutilizados em mais de uma página migram para `/components/`
- Toda página autenticada fica dentro do `ProtectedRoute`
