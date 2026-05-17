# PDV-Ultra — Frontend

Aplicação React + TypeScript + MUI. Interface de gestão para pequenos comércios, focada em simplicidade. Consome a API REST do backend via Axios + React Query.

# Inicialização do Projeto
```
npm create vite@latest frontend -- --template react-ts
```
---

## Stack

| Item | Tecnologia |
|---|---|
| Framework | React + TypeScript |
| UI | Material UI (MUI) v6 |
| Roteamento | React Router DOM v6 |
| HTTP | Axios |
| Server state | TanStack React Query |
| Client state | Redux Toolkit |
| Formulários | React Hook Form + Zod |

---

## Estrutura de pastas

```
/frontend/src
├── assets/              ← imagens estáticas, ícones SVG
├── components/          ← componentes reutilizáveis sem lógica de negócio
│   └── {ComponentName}/
│       ├── index.tsx
│       └── types.ts
├── design/              ← arquivos HTML, CSS e JSX gerados pelo Claude Design
│                           (referência visual — não editar diretamente)
├── hooks/               ← custom hooks reutilizáveis
├── pages/               ← uma pasta por página/rota
│   └── {PageName}/
│       ├── index.tsx
│       └── components/  ← componentes exclusivos desta página
├── router/
│   └── index.tsx        ← definição de todas as rotas
├── services/            ← chamadas à API (Axios)
│   ├── api.ts           ← instância base do Axios
│   └── {feature}.service.ts
├── store/               ← Redux Toolkit
│   ├── index.ts
│   └── slices/
│       └── {feature}.slice.ts
├── theme/               ← configuração do MUI Theme
│   ├── index.ts
│   ├── components.ts ← estilização dos componentes bases 
│   ├── typography.ts  ← estilo da tipografia 
│   └── palette.ts ← paleta e cores extras
├── types/               ← tipos e interfaces globais
│   └── {feature}.types.ts
└── utils/               ← funções utilitárias puras
```

---

## Tema MUI — regras obrigatórias

Informações sobre o tema estão em `theme\README.md`
### Sempre usar o tema e os componentes MUI

Tabelas de dados utilizam DataGrid
Botões com ações assincronas precisam ter icone de loading

### Nunca usar cores hardcoded

```tsx
// Nunca fazer isso
<Box sx={{ color: '#1976d2', backgroundColor: '#fff' }} />
<Typography style={{ color: 'red' }} />

// Sempre usar o tema
<Box sx={{ color: 'primary.main', backgroundColor: 'background.paper' }} />
<Typography color="error.main" />
```

### Extensão de paleta com TypeScript
Quando precisar de cor fora do padrão MUI (primary, secondary, error, warning, info, success), estender via module augmentation — nunca usar hex avulso:

```ts
// theme/palette.ts
declare module '@mui/material/styles' {
  interface Palette {
    neutral: Palette['primary'];
    revenue: Palette['primary'];
  }
  interface PaletteOptions {
    neutral?: PaletteOptions['primary'];
    revenue?: PaletteOptions['primary'];
  }
}

export const palette = {
  neutral: {
    main: '#64748b',
    light: '#94a3b8',
    dark: '#475569',
    contrastText: '#fff',
  },
  revenue: {
    main: '#0f6e56',
    light: '#1d9e75',
    dark: '#085041',
    contrastText: '#fff',
  },
}
```

### Estilização global de componentes MUI
Customizar via `theme.components`, nunca sobrescrever com CSS externo:

```ts
// theme/index.ts
export const theme = createTheme({
  palette,
  typography: {
    fontFamily: '"Inter", "Roboto", sans-serif',
    h1: { fontSize: '2rem', fontWeight: 600 },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: ({ theme }) => ({
          borderRadius: theme.spacing(1),
          textTransform: 'none',
        }),
      },
    },
    MuiCard: {
      styleOverrides: {
        root: ({ theme }) => ({
          borderRadius: theme.spacing(2),
          boxShadow: theme.shadows[1],
        }),
      },
    },
  },
})
```

---

## Pasta `/design`

Arquivos HTML, CSS e JSX gerados pelo Claude Design. São referência visual — somente leitura.

- Nunca editar arquivos dentro de `/design`
- Ao converter para componente React, criar em `/components` ou `/pages`
- Extrair cores do design e mapear para tokens do tema MUI — nunca copiar hex direto

---

## Padrão de componente React

Todo componente segue este padrão sem exceção:

```tsx
// components/ProductCard/types.ts
export interface ComponentProps {
  id: string
  name: string
  price: number
  imageUrl?: string
  onEdit: (id: string) => void
}

// components/ProductCard/index.tsx
import { Card, CardContent, Typography, Box } from '@mui/material'
import { ProductCardProps } from './types'

export default function Component({ id, name, price, onEdit }: ComponentProps) {
  return (
    
  )
}
```

Regras:
- `export default function NomeDoComponente({ }: Props) {}` — sempre
- Props em `types.ts` separado na mesma pasta do componente
- Nunca usar `React.FC` ou `const Component = () =>`
- Nunca exportar tipo de props junto com o componente no mesmo arquivo

---

## Services — Axios

```ts
// services/api.ts
import axios from 'axios'

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  const tenantId = localStorage.getItem('tenantId') // ou vir do Redux

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

---

## Hooks — React Query

```ts
// hooks/useProducts.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { productsService } from '../services/products.service'
import { CreateProductInput } from '../types/product.types'

export const PRODUCTS_KEY = ['products'] as const

export function useProducts() {
  return useQuery({
    queryKey: PRODUCTS_KEY,
    queryFn: productsService.getAll,
  })
}

export function useCreateProduct() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateProductInput) => productsService.create(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: PRODUCTS_KEY }),
  })
}
```

---

## Formulários — React Hook Form + Zod

```tsx
// Sempre definir o schema Zod primeiro
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

---

## Redux Toolkit — apenas estado global de UI

React Query cuida do estado do servidor. Redux cuida apenas de:
- Usuário autenticado (dados do token decodificado)
- Preferências de tema (dark/light mode)
- Estado de sidebar (aberta/fechada)
- Notificações/toasts globais

```ts
// store/slices/auth.slice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit'

interface AuthState {
  userId: string | null
  tenantId: string | null 
  role: 'Owner' | 'Employee' | null
  isAuthenticated: boolean
}

const initialState: AuthState = { userId: null, role: null, isAuthenticated: false }

export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setAuth: (state, action: PayloadAction<AuthState>) => ({ ...state, ...action.payload }),
    clearAuth: () => initialState,
  },
})
```

Nunca buscar dados da API via Redux.

---

## Tipagem

- Nunca usar `any` — usar `unknown` com narrowing se necessário
- Nunca usar `as` para forçar tipo
- Inferir tipos do Zod via `z.infer<typeof schema>` — nunca duplicar manualmente
- Tipos de entidades em `types/{feature}.types.ts`
- Tipos de props em `types.ts` dentro da pasta do componente

---

## Variáveis de ambiente

```env
VITE_API_URL=http://localhost:5000/api
```

Nunca usar `process.env` — sempre `import.meta.env`.
Nunca commitar `.env` — apenas `.env.example`.

---

## Skills disponíveis

Antes de executar qualquer tarefa abaixo, leia a skill correspondente em `/frontend/skills/`:

| Tarefa | Skill |
|---|---|
| Criar novo componente reutilizável | `skills/new-component.md` |
| Criar nova página com rota | `skills/new-page.md` |
| Criar service + hook React Query | `skills/new-service.md` |

---

## O que não fazer

- Nunca usar cores hardcoded — sempre via tema MUI
- Nunca usar `React.FC` ou arrow function para componentes
- Nunca buscar dados da API fora de um hook React Query
- Nunca usar `any` ou `as` para forçar tipo
- Nunca editar arquivos dentro de `/design`
- Nunca duplicar tipagem que o Zod já infere
- Nunca usar Redux para estado de servidor
- Nunca usar `process.env` — usar `import.meta.env`