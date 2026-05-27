# PDV-Ultra — Frontend

React + TypeScript + MUI v6. Interface de gestão para pequenos comércios.

## Stack

React 18, TypeScript, MUI v6, React Router DOM v6, Axios, TanStack React Query v5, Redux Toolkit, React Hook Form + Zod, Vite

## Estrutura de pastas

```
/src
├── components/{ComponentName}/index.tsx + types.ts
├── context/                    ← ToastContext
├── hooks/                      ← hooks reutilizáveis (useToast, useApiError, useProducts...)
├── layouts/DashboardLayout/
├── pages/{PageName}/index.tsx + components/ + types.ts
├── router/index.tsx
├── services/api.ts + {feature}.service.ts
├── store/index.ts + slices/{feature}.slice.ts
├── theme/                      ← zeloTheme — não modificar sem necessidade
├── types/{feature}.types.ts
├── utils/
└── design/                     ← somente leitura (referências visuais por feature)
```

---

## Estado — onde cada coisa vive

**TanStack React Query** → tudo que vem da API (produtos, despesas, vendas). Gerencia cache, loading, erro e invalidação.

**Redux** → somente estado global de sessão: `auth` slice com `userId`, `tenantId`, `role`, `name`, `email`, `avatarUrl`, `isAuthenticated`, `isLoading`. Nunca buscar dados da API via Redux.

**Estado local** (`useState`) → estado de UI restrito ao componente (modal aberto, tab ativa, etc).

---

## Autenticação e tenant

O `api.ts` injeta automaticamente o header `X-Tenant-Id` lendo do Redux em todo request:

```ts
api.interceptors.request.use((config) => {
  const { tenantId } = store.getState().auth
  if (tenantId) config.headers['X-Tenant-Id'] = tenantId
  return config
})
```

O interceptor de resposta faz refresh automático em 401 antes de rejeitar. Nunca lidar com refresh manualmente nos hooks ou services.

---

## Padrão de service

Um arquivo por feature em `services/`. Responsabilidades: chamada HTTP, mapeamento backend → frontend, tipagem dos payloads.

```ts
// services/product.service.ts
import { api } from './api'
import type { Product } from '../types/product.types'

// Tipo do backend (snake_case ou diferente do frontend)
interface BackendProduct { id: string; purchasePrice?: number | null; ... }

// Mapeamento centralizado no service
function mapProduct(p: BackendProduct): Product {
  return { id: p.id, costPrice: p.purchasePrice ?? 0, ... }
}

export interface CreateProductPayload { name: string; price: number; ... }

export const productService = {
  getAll: async (): Promise<Product[]> => {
    const { data } = await api.get('/products', { params: { page: 1, pageSize: 500 } })
    return data.data.map(mapProduct)
  },
  create: async (payload: CreateProductPayload): Promise<Product> => {
    const { data } = await api.post<BackendProduct>('/products', payload)
    return mapProduct(data)
  },
}
```

Regras:
- `api` sempre importado de `./api` — nunca axios direto
- Mapeamento backend → frontend feito no service, nunca no hook ou componente
- Payloads tipados com interfaces exportadas do próprio service

---

## Padrão de hook React Query

Um arquivo por feature em `hooks/`. Exporta múltiplas funções do mesmo arquivo quando a feature é coesa.

```ts
// hooks/useProducts.ts
const QUERY_KEY = ['products'] as const

export function useProducts() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => productService.getAll(),
  })
}

export function useCreateProduct() {
  const queryClient = useQueryClient()
  const showToast = useToast()
  const handleError = useApiError()

  return useMutation({
    mutationFn: (payload: CreateProductPayload) => productService.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY })
      showToast('Produto cadastrado com sucesso!', 'success')
    },
    onError: (error) => handleError(error, 'Erro ao cadastrar produto.'),
  })
}
```

Regras:
- `QUERY_KEY` como `const` no topo do arquivo — nunca string inline no `useQuery`
- `onSuccess` → `invalidateQueries` + `showToast`
- `onError` → sempre `handleError(error, 'Mensagem de fallback.')`
- Mutations que navegam usam `useNavigate` + `useAppDispatch` no hook (ver `useCreateTenant`)

---

## Tratamento de erro

`useApiError` retorna uma função `handleError(error, fallback)` que lê o `title` do Problem Details da API e exibe via toast. Usar em todo `onError` de mutation.

```ts
const handleError = useApiError()
// no onError:
onError: (error) => handleError(error, 'Mensagem se a API não retornar title.')
```

---

## Padrão de componente

```tsx
// components/ProductCard/index.tsx
import type { Props } from './types'

export default function ProductCard({ name, price }: Props) {
  return (...)
}

// components/ProductCard/types.ts
export interface Props { name: string; price: number }
```

Regras:
- `export default function NomeDoComponente({ }: Props)` — sempre
- Props em `types.ts` separado na mesma pasta, nunca exportadas junto com o componente
- Nunca `React.FC` ou `const Component = () =>`

---

## Tipagem

- Nunca `any` — usar `unknown` com narrowing
- Nunca `as` para forçar tipo
- Inferir tipos do Zod via `z.infer<typeof schema>` — nunca duplicar manualmente
- Variáveis de ambiente via `import.meta.env.VITE_*` — nunca `process.env`

---

## Tema (zeloTheme)

Tema light, neutral + green accent. Fonte: Geist (carregada via `loadGeistFont()`).

- Nunca usar cores hardcoded — sempre tokens do tema (`primary.main`, `error.soft`, etc)
- Cores semânticas customizadas disponíveis: `success.soft`, `error.soft`, `warning.soft`, `info.soft` e seus `*.ink`
- Tabelas de dados: `DataGrid` do MUI X
- Graficos de dados: MUI X Charts
- Botões com ações assíncronas: incluir estado de loading
- Customizações globais de componentes: via `theme/components.ts` — nunca CSS externo

---

## Pasta /design

Somente leitura. Pode conter subpastas por feature com imagens de referência visual.
Ao implementar: criar em `/components` ou `/pages`. Nunca copiar hex direto — mapear para tokens do tema.

---

## Rotas

Três guards: `PublicRoute` (só não autenticado), `OnboardingRoute` (autenticado sem tenant), `ProtectedRoute` (autenticado com tenant). Rotas em português (`/vendas`, `/estoque`, `/despesas`).

---

## Skills disponíveis

| Tarefa | Skill |
|---|---|
| Criar novo componente reutilizável | `skills/new-component.md` |
| Criar nova página com rota | `skills/new-page.md` |
| Criar service + hooks React Query | `skills/new-service.md` |

---

## O que nunca fazer

- Cores ou espaçamentos hardcoded — sempre tema
- `React.FC` ou arrow function para componentes
- Buscar dados da API fora de um hook React Query
- `any` ou `as` para forçar tipo
- Editar arquivos em `/design`
- Duplicar tipagem que o Zod já infere
- Redux para cache de dados da API
- `process.env` — usar `import.meta.env`
- Axios direto — sempre via `api` de `./services/api`