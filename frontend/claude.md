# PDV-Ultra — Frontend

React + TypeScript + MUI. Interface de gestão para pequenos comércios.

## Stack

React 19, TypeScript, **MUI v9** (`@mui/material` + `@mui/system` + `@mui/icons-material`), **MUI X** (DataGrid, Charts, DatePickers, Scheduler[beta]), **React Router v7**, Axios, **TanStack React Query v5**, Redux Toolkit, React Hook Form + **Zod v4**, dayjs, Vite.

Auxiliares: `react-markdown` (conteúdo de Ajuda/anúncios), `mui-color-input` (cor de cargo/categoria), `@abacatepay/sdk` (pagamentos).

## Composição do app (`App.tsx`)

Árvore de providers — a ordem importa:

```
ReduxProvider → QueryClientProvider → ThemeModeProvider → LocalizationProvider(dayjs, pt-br) → AuthProvider → ToastProvider → RouterProvider
```

- `loadGeistFont()` roda no load do módulo; `main.tsx` só monta `<App/>` em `StrictMode`.
- `QueryClient` global: `retry: 1`, `refetchOnWindowFocus: false`, `staleTime: 60s`.

## Estrutura de pastas

```
/src
├── components/{ComponentName}/index.tsx + types.ts   ← primitivos reutilizáveis (ver "Biblioteca de primitivos")
├── constants/         ← modules.ts, address.ts (STATES), payment.ts (labels)
├── context/           ← ToastContext, ThemeModeContext
├── hooks/             ← um arquivo por feature (use{Feature}.ts) + utilitários (useToast, useApiError, useUserPermissions)
├── layouts/DashboardLayout/   ← shell autenticado; constants.ts define NAV_SECTIONS
├── pages/{PageName}/index.tsx + components/ + types.ts
├── router/index.tsx
├── services/api.ts + {feature}.service.ts
├── store/index.ts + slices/auth.slice.ts
├── theme/             ← createAppTheme(mode, textSize, accent) — ver "Tema"
├── types/{feature}.types.ts
└── utils/             ← masks.ts, currency.ts, image.utils.ts, apiError.ts
```

`/frontend/design` (irmão de `/src`, **não** dentro dele) — referências visuais, somente leitura.

---

## Estado — onde cada coisa vive

**React Query** → tudo que vem da API. Cache, loading, erro e invalidação.

**Redux (`auth` slice)** → estado de sessão, alimentado pelo `/auth/me` (não é cache de API). Campos: identidade (`userId`, `tenantId`, `role`, `name`, `email`, `phone`, `document`, `birthDate`, `avatarUrl`), flags (`isAuthenticated`, `isLoading`, `mustChangePassword`), `tenants[]` (troca de loja), **`permissions[]` + `modules[]`** (controle de acesso), aparência (`theme`, `accentColor`, `textSize`) e `subscription` (espelho síncrono do entitlement de plano — **não** é cache; a fonte é o React Query). Actions: `setAuth`, `clearAuth`, `setLoading`, `setTenant`, `setMustChangePassword`, `setProfile`, `setAppearance`, `setModules`, `setSubscription`. Sempre via `useAppSelector` / `useAppDispatch` (tipados em `store/index.ts`).

**Estado local** (`useState`) → UI do componente (modal aberto, busca, sort, tab).

---

## Autenticação e tenant

- `AuthProvider` chama `authService.getMe()` no mount → `setAuth(user)` ou `clearAuth()`. É o bootstrap da sessão.
- `api.ts` injeta `X-Tenant-Id` (lido do Redux) e usa `withCredentials` (cookie de sessão) em todo request.
- Interceptor de resposta: em **401**, faz `POST /auth/refresh` uma vez e repete o request; se falhar, dispara `clearAuth()`. Nunca tratar refresh manualmente.

---

## Controle de acesso (dois eixos)

> Não confundir com **billing**. O plano **nunca** esconde ou desabilita UI — o backend bloqueia com **402** e o erro vira toast amigável (ver "Tratamento de erro"). Renderize a UI; deixe o 402 barrar.

**Eixo de acesso (tenant/role).** `useUserPermissions()` → `{ permissions, hasPermission(p), isOwner, modules, isModuleEnabled(m) }`.
- `isOwner` = role `Owner` ou `Admin`. `hasPermission` = `isOwner || permissions.includes(p)`.
- `isModuleEnabled` vale para **todos** (inclusive Owner) — módulos são do tenant, não do papel.
- Permissões: `types/employee.types.ts` (`PERMISSIONS` mapa→rótulo, tipo `Permission`). Módulos: `constants/modules.ts` (`OperationModule`, `OPERATION_MODULES`, `ALL_MODULES`, `permissionToModule`). Um módulo agrupa permissões; permissões fora do mapa (ex.: `ManageEmployees`) são "core", sempre visíveis.

Enforcement nos 3 lugares:
1. **Rota** — `<PermissionGuard permission="ViewStock">` envolve a página; redireciona para `/` se faltar.
2. **Navegação** — `Sidebar` filtra `NAV_SECTIONS` por `ownerOnly` / `module` / `requiredPermission`.
3. **Query** — gate no `enabled` do hook: `enabled: isModuleEnabled('inventory') && hasPermission('ViewStock')`.

---

## Rotas

`createBrowserRouter` com **`RouterGuard`** unificado (substitui os antigos `PublicRoute`/`OnboardingRoute`/`ProtectedRoute`):

```tsx
<RouterGuard type="public" />        // só não autenticado (/login)
<RouterGuard type="onboarding" />    // autenticado, sem tenant (/criar-negocio)
<RouterGuard type="change-password" />  // mustChangePassword (/trocar-senha)
<RouterGuard type="protected" />     // autenticado com tenant → DashboardLayout
```

`DashboardLayout` é o shell de `protected`; cada página sensível vem envolta em `<PermissionGuard>`. Rotas em português (`/vendas`, `/estoque`, `/despesas`, `/relatorios`...). Catch-all `*` → `Navigate to="/"`.

---

## Padrão de service

Um arquivo por feature em `services/`. Responsabilidade: HTTP + mapeamento backend→frontend + tipagem de payloads.

```ts
// services/product.service.ts
import { api } from './api'
import type { Product } from '../types/product.types'

interface BackendProduct { id: string; purchasePrice?: number | null; ... }

function mapProduct(p: BackendProduct): Product {
  return { id: p.id, costPrice: p.purchasePrice ?? 0, ... }
}

export const productService = {
  // Endpoint paginado → data.data; escrita → data direto
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

- `api` sempre de `./api` — nunca axios direto. Tenant já injetado pelo interceptor — nunca incluir manualmente.
- Mapeamento backend→frontend mora no service, nunca no hook ou componente.

---

## Padrão de hook React Query

Um arquivo por feature. `QUERY_KEY` como `const` no topo.

```ts
const QUERY_KEY = ['products'] as const

export function useProducts() {
  const { hasPermission, isModuleEnabled } = useUserPermissions()
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => productService.getAll(),
    // gate de acesso — não busca se o módulo/permissão não permitem
    enabled: isModuleEnabled('inventory') && hasPermission('ViewStock'),
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

- Query de leitura de feature gateada por módulo/permissão → `enabled`.
- `onSuccess` → `invalidateQueries` + `showToast`. `onError` → sempre `handleError(error, 'fallback')`.
- Tenant **nunca** entra na query key (já vem do interceptor).
- Mutations que navegam usam `useNavigate` + `useAppDispatch` no hook (ver `useCreateTenant`).

---

## Tratamento de erro

`useApiError()` retorna `handleError(error, fallback)` — usar em todo `onError`. Resolve a mensagem via `getApiErrorMessage` (`utils/apiError.ts`), nesta ordem:
1. **402 com `code`** de gating de plano → mensagem amigável de upgrade (`PLAN_LIMIT_EXCEEDED`, `MODULE_NOT_IN_PLAN`).
2. `detail` (BusinessException / FluentValidation via ExceptionMiddleware).
3. `errors` (ValidationProblemDetails do `[ApiController]`).
4. `title` ou o fallback. Sufixo `[status]` quando houver.

Em `import.meta.env.DEV` loga o request no console.

---

## Padrão de componente

```tsx
// components/ProductCard/index.tsx
import type { Props } from './types'
export default function ProductCard({ name, price }: Props) { return (...) }
// components/ProductCard/types.ts
export interface Props { name: string; price: number }
```

- `export default function NomeDoComponente({ }: Props)` — sempre. Nunca `React.FC` nem arrow.
- Props em `types.ts` separado, na mesma pasta.

---

## Composição de página

Padrão recorrente (ver `pages/Suppliers`, `Inventory`, `Customers`):

```
PageHeader (título + descrição + ações; injeta botão "Ajuda" automático)
PageKpiGrid › PageKpiCard ...        ← KPIs no topo
Card › toolbar (busca/sort/filtros) + DataGrid
```

- Busca/sort/filtro são `useState` locais + `useMemo` sobre os dados do hook — não refazem fetch.
- `DataGrid` (`@mui/x-data-grid`) com `slots={{ noRowsOverlay: DataGridNoRowsOverlay }}`; clique de linha navega para o detalhe.

---

## Biblioteca de primitivos (`components/`)

Reusar antes de recriar. Nunca duplicar header/footer/label de modal inline.

| Grupo | Componentes |
|---|---|
| Modal | `ModalHeader` (título+subtítulo+X), `FormModalActions` (rodapé Cancelar+primário com spinner), `FieldLabel`, `CurrencyField`, `ConfirmDialog`, `ConfirmPhraseDialog` (digitar frase p/ ação destrutiva) |
| Página | `PageHeader`, `PageKpiCard`+`PageKpiGrid`, `DataGridNoRowsOverlay`, `FilterTabs`, `FiltersPopover` |
| Entrada/seleção | `ChipSelect`, `CategoryStrip`, `CategoryFormModal`, `ImageUpload` |
| Configurações | `SettingCard`, `SettingRow` |
| Acesso/infra | `RouterGuard`, `PermissionGuard`, `AuthProvider` |
| Diversos | `MarkdownRenderer`, `GoogleSignInButton`, `AnnouncementCenter` |

---

## Padrão de modal e formulário

Formulários com **React Hook Form + `zodResolver`** (schema Zod no topo do arquivo; tipo via `z.infer`).

- Campo simples → `register('campo')`. Campo com máscara/moeda/select → `Controller`.
- Máscaras em `utils/masks.ts`: `formatPhone`, `maskCPF`, `maskCNPJ`, `maskCEP`, `maskDocument` (CPF≤11 díg., senão CNPJ). CEP → `viacepService.lookup` preenche endereço; UF de `constants/address.ts` (`STATES`).
- Labels externos via `FieldLabel` (nunca a prop `label=` flutuante do MUI). Rodapé via `FormModalActions` (`formId` p/ submit ou `onSubmit`).
- `reset()` no abrir/fechar; `isPending` (`mutation.isPending`) é fonte única de `disabled`/spinner/guarda do `handleClose`. Não gatear por `formState.isSubmitting`.
- Container: `<Box component="form" id="{feature}-form" sx={{ display:'flex', flexDirection:'column', gap:2.5 }}>`.
- `fullScreen` no mobile via `useMediaQuery(theme.breakpoints.down('sm'))`. `maxWidth` por densidade: `xs` (1–2 campos) · `sm` (padrão) · `md` (multi-coluna).
- Não sobrescrever padding de `DialogTitle/Content/Actions` — o tema (`theme/components.ts`) já padroniza.

---

## Upload de mídia (implementado)

Fluxo: valida → converte p/ WebP no navegador (Canvas) → presigned URL → PUT direto no MinIO → confirma no backend → invalida a query.

```
useUploadImage(category, queryKey) / useRemoveImage(category, queryKey)   ← hooks/useMediaUpload.ts
  → GET  /media/presigned-url?category=&entityId=
  → PUT  {uploadUrl}            (fetch direto, NÃO o `api` — URL absoluta do MinIO)
  → PATCH /media/confirm        { category, entityId, relativePath }
```

- `utils/image.utils.ts`: `convertToWebp` (qualidade 0.85) + `validateImageFile` (JPEG/PNG/WebP, máx 5MB).
- `types/media.types.ts`: `MediaCategory` (`Profile` | `Product` | `Service` | `Tenant`). Componente `ImageUpload`. Banco guarda só o path relativo.

---

## Tipagem

- Nunca `any` — `unknown` com narrowing. Nunca `as` para forçar tipo.
- Tipos de formulário via `z.infer<typeof schema>` — nunca duplicar manualmente.
- Env via `import.meta.env.VITE_*` — nunca `process.env`.

---

## Tema

Tema **dinâmico** construído por `createAppTheme(mode, textSize, accent)` e provido pelo `ThemeModeProvider`, que lê `auth.theme` / `accentColor` / `textSize` do Redux e aceita **preview ao vivo** (`setPreview` / `resetPreview`, usados na tela de Aparência). `zeloTheme` (export estático light) é **legado** — manter só por imports antigos.

- **Light + Dark**; 6 accents (`green`, `blue`, `orange`, `purple`, `pink`, `graphite`); `textSize` configurável (14–20).
- Nunca cor hardcoded — sempre token. Tokens custom (via `theme/augment.ts`): `neutral`, `accent`, `premium`, `surface` (`default/paper/sunken/raised`), `border` (`subtle/strong`), `data`, `text.tertiary`, semânticos com `.soft`/`.ink`, e `customShadows`.
- Variantes de Button custom: `variant="ghost"` (transparente, vira filled no hover) e `variant="soft"`. `Chip` ganha `color="premium"` e `size="large"`.
- `spacing` base 5px; breakpoints custom (`sm:540 md:760 lg:900 xl:1280`); locale `ptBR`; fonte Geist.
- Tabelas → `DataGrid` (MUI X). Gráficos → MUI X Charts. Overrides globais em `theme/components.ts` — nunca CSS externo.

---

## /design (em `/frontend/design`)

Somente leitura — referências visuais por feature, **fora** de `/src`. Ao implementar, criar em `/components` ou `/pages`; nunca copiar hex direto — mapear para tokens do tema.

---

## Skills (`.claude/skills/`)

| Tarefa | Skill |
|---|---|
| Novo componente reutilizável | `new-component.md` |
| Nova página com rota | `new-page.md` |
| Service + hooks React Query | `new-service.md` |

> Os templates das skills antecedem o `RouterGuard`/`PermissionGuard` e o gate por `enabled` — siga este documento para rotas e acesso.

---

## O que nunca fazer

- Cores ou espaçamentos hardcoded — sempre tema.
- `React.FC` ou arrow function para componentes.
- Buscar dados da API fora de um hook React Query; `api` direto na página.
- Axios direto — sempre `api` de `./services/api`.
- Redux para cache de dados da API (só sessão).
- Esconder/desabilitar UI por causa do **plano** — deixe o backend retornar 402.
- `TenantId` em query key ou header manual (já vem do interceptor).
- `any` ou `as` para forçar tipo; duplicar tipagem que o Zod infere.
- `process.env` — usar `import.meta.env`.
- Editar arquivos em `/design`.
