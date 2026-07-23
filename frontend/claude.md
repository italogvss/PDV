# PDV-Ultra — Frontend

React + TypeScript + MUI. Interface de gestão para pequenos comércios. **Em produção** — toda mudança nasce em branch própria e passa por `npx tsc -b` + `npm run build` + validação funcional antes do merge (ver CLAUDE.md da raiz).

## Stack

React 19, TypeScript, **MUI v9** (`@mui/material` + `@mui/system` + `@mui/icons-material`), **MUI X** (DataGrid, Charts, DatePickers, Scheduler[beta]), **React Router v7**, Axios, **TanStack React Query v5**, Redux Toolkit, React Hook Form + **Zod v4**, dayjs, Vite.

Auxiliares: `react-markdown` (conteúdo de Ajuda/anúncios), `mui-color-input` (cor de cargo/categoria). Pagamentos são pelo **Stripe Checkout hospedado** — o frontend só redireciona para a URL que o backend devolve; não há SDK de pagamento no bundle.

**Typecheck**: `npx tsc -b` (o root `tsconfig.json` é só de references — `tsc --noEmit` sozinho **não checa nada**). Build completo: `npm run build` (= `tsc -b && vite build`).

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
├── admin/             ← área do admin da plataforma (ver "Área /admin")
├── components/{ComponentName}/index.tsx + types.ts   ← primitivos reutilizáveis (ver "Biblioteca de primitivos")
├── constants/         ← modules.ts, entitlements.ts, subscription.ts, address.ts, payment.ts (ver "Constantes")
├── context/           ← ToastContext, ThemeModeContext
├── hooks/             ← um arquivo por feature (use{Feature}.ts) + utilitários (useToast, useApiError, useUserPermissions, useEntitlements...)
├── layouts/DashboardLayout/   ← shell autenticado; constants.ts define NAV_SECTIONS
├── pages/{PageName}/index.tsx + components/ + types.ts
├── router/index.tsx
├── services/api.ts + {feature}.service.ts
├── store/index.ts + slices/auth.slice.ts
├── theme/             ← createAppTheme(mode, textSize, accent) — ver "Tema"
├── types/{feature}.types.ts
└── utils/             ← masks.ts, currency.ts, image.utils.ts, apiError.ts, chart.ts, plans.ts, planSelection.ts, premium.ts
```

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

## Controle de acesso (dois eixos) + billing

**Eixo de acesso (tenant/role).** `useUserPermissions()` → `{ permissions, hasPermission(p), isOwner, modules, isModuleEnabled(m) }`.
- `isOwner` = role `Owner` ou `Admin`. `hasPermission` = `isOwner || permissions.includes(p)`.
- `isModuleEnabled` vale para **todos** (inclusive Owner) — módulos são do tenant, não do papel.
- Permissões: `types/employee.types.ts` (`PERMISSIONS` mapa→rótulo, tipo `Permission`). Módulos: `constants/modules.ts` (`OperationModule`, `OPERATION_MODULES`, `ALL_MODULES`, `permissionToModule`). Metadados completos (módulos × permissões) vêm do backend via `useAccessMetadata` (`GET /api/access/metadata`, cache infinito).

Enforcement nos 3 lugares:
1. **Rota** — `<PermissionGuard permission="ViewStock">` envolve a página; redireciona para `/` se faltar.
2. **Navegação** — `Sidebar` filtra `NAV_SECTIONS` por `ownerOnly` / `module` / `requiredPermission`.
3. **Query** — gate no `enabled` do hook: `enabled: isModuleEnabled('inventory') && hasPermission('ViewStock')`.

**Eixo de billing (plano).** `useEntitlements()` → `{ has(feature), limit(key), isLoaded }` — lê o espelho síncrono `auth.subscription` do Redux. Chaves em `constants/entitlements.ts` (`FEATURES`, `PLAN_LIMITS`, `UNLIMITED = -1`); comparação **case-insensitive** (backend manda lowercase, chaves canônicas são camelCase).

> Regra: o plano **não esconde UI**. Feature **com endpoint** → renderize normal; o backend barra com 402 e vira toast de upgrade. Feature **sem endpoint** (ex.: painel analítico) → cadeado/CTA de upsell com `has(key)`. Componentes prontos: `PremiumLock`, `PremiumIconBadge`, `UpsellButton`, `UpsellCard`, `UpsellFeatureRow`, `UpsellModal`, `PlansGrid`; superfície tracejada dourada via `premiumDashedSurfaceSx` (`utils/premium.ts`). Todo CTA de upsell navega para `PLANS_ROUTE` (`constants/subscription.ts`) — nunca duplicar a string da rota.

---

## Rotas

`createBrowserRouter` com **`RouterGuard`** unificado:

```tsx
<RouterGuard type="public" />        // só não autenticado (/login)
<RouterGuard type="onboarding" />    // autenticado, sem tenant (/criar-negocio)
<RouterGuard type="change-password" />  // mustChangePassword (/trocar-senha)
<RouterGuard type="protected" />     // autenticado com tenant → DashboardLayout
<RouterGuard type="admin" />         // role Admin → AdminLayout (/admin)
```

`DashboardLayout` é o shell de `protected`; cada página sensível vem envolta em `<PermissionGuard>`. Rotas em português (`/vendas`, `/estoque`, `/despesas`, `/relatorios`, `/planos`...). Catch-all `*` → `Navigate to="/"`.

---

## Área /admin (`src/admin`)

Mini-app isolado do admin da plataforma (role `Admin`), com **estrutura paralela própria**: `AdminLayout` + `pages/` (Overview, Subscriptions, Payments, Plans, Coupons, Webhooks, Support, Announcements, LegalDocuments, Observability, Compliance) + `components/`, `hooks/`, `services/`, `constants/`, `types/`, `utils/` próprios. Não importa nada das páginas do app do lojista (primitivos de `src/components` podem ser reusados). Os padrões deste documento (service → hook → página, tema, tipagem) valem lá também.

---

## Constantes (`src/constants`)

Espelham as **chaves** dos catálogos do backend (`PDV.Domain/Constants`) — a fonte de verdade é o backend; os rótulos PT-BR ficam aqui (ver CLAUDE.md da raiz, "Constantes compartilhadas"):

| Arquivo | Conteúdo |
|---|---|
| `modules.ts` | `OperationModule` (keys lowercase = enum do backend), `OPERATION_MODULES` (label+descrição+permissões), `permissionToModule` |
| `entitlements.ts` | `FEATURES` + `FEATURE_LABELS`, `PLAN_LIMITS`, `UNLIMITED = -1` — espelho de `EntitlementCatalog`/`PlanLimits` |
| `subscription.ts` | `PLANS_ROUTE` (rota única de todo CTA de upsell), `CHOOSE_PLAN_ROUTE` |
| `payment.ts` | chave do enum backend → rótulo/cor (`PAYMENT_METHOD_LABELS`/`_COLORS` — mesma paleta em todos os gráficos) |
| `address.ts` | `STATES` (UFs) |

Nunca redefinir um valor fixo que o backend já define — espelhar a chave ou buscar via `useAccessMetadata`.

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
1. **402 com `code`** de gating de plano → mensagem amigável de upgrade (`PLAN_LIMIT_EXCEEDED`, `NOT_IN_PLAN`).
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
| Detalhe/dados | `DetailProfileHeader`, `DetailFieldCell`, `ChartCard`, `DonutChart`, `RankingList`, `InfoTooltip` |
| Entrada/seleção | `ChipSelect`, `CategoryStrip`, `CategoryFormModal`, `ImageUpload`, `AddressEditFields` |
| Premium/upsell | `PremiumLock`, `PremiumIconBadge`, `UpsellButton`, `UpsellCard`, `UpsellFeatureRow`, `UpsellModal`, `PlansGrid` |
| Billing (estados) | `PaymentFailedModal`, `SubscriptionExpiredModal` |
| Exclusão de conta | `AccountDeletionBanner`, `AccountDeletionOverlay`, `DataDeletionBanner` |
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

Fluxo: valida → converte p/ WebP no navegador (Canvas) → presigned URL → PUT direto no storage (MinIO em dev, R2 em produção) → confirma no backend → invalida a query.

```
useUploadImage(category, queryKey) / useRemoveImage(category, queryKey)   ← hooks/useMediaUpload.ts
  → GET  /media/presigned-url?category=&entityId=
  → PUT  {uploadUrl}            (fetch direto, NÃO o `api` — URL absoluta do storage)
  → PATCH /media/confirm        { category, entityId }
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
- Tabelas → `DataGrid` (MUI X). Gráficos → MUI X Charts, com helpers de cor em `utils/chart.ts` e cores fixas por método de pagamento em `constants/payment.ts`. Overrides globais em `theme/components.ts` — nunca CSS externo.

---

## Skills (`frontend/.claude/skills/`)

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
- Esconder/desabilitar UI por causa do **plano** quando a feature tem endpoint — deixe o 402 barrar (sem endpoint → cadeado/upsell via `has()`).
- Duplicar a rota de planos em string — usar `PLANS_ROUTE` de `constants/subscription.ts`.
- `TenantId` em query key ou header manual (já vem do interceptor).
- `any` ou `as` para forçar tipo; duplicar tipagem que o Zod infere.
- `process.env` — usar `import.meta.env`.
- Redefinir constante/chave que a fonte é o backend (`PDV.Domain/Constants`) — espelhar em `constants/`.
