# Prompt — Frontend: Módulo Employee (Login Local + CRUD + Permissões)

## Contexto do projeto

- React 18 + TypeScript + MUI v6 + React Router DOM v6
- TanStack React Query v5 para dados da API
- Redux Toolkit apenas para estado de sessão (`auth` slice)
- React Hook Form + Zod para formulários
- Axios via `api` de `./services/api` — nunca axios direto
- Rotas em português (`/funcionarios`)
- Nunca `any` ou `as` para forçar tipo
- Nunca `React.FC` ou arrow function para componentes
- Nunca cores hardcoded — sempre tokens do tema
- Props sempre em `types.ts` separado na mesma pasta
- Mapeamento backend → frontend feito no service, nunca no hook ou componente
- `QUERY_KEY` como `const` no topo de cada hook file
- `onSuccess` → `invalidateQueries` + `showToast`
- `onError` → sempre `handleError(error, 'Mensagem de fallback.')`

---

## Visão geral do que implementar

1. Types de Employee e Permission
2. `employee.service.ts`
3. `useEmployees.ts` — hooks React Query
4. Atualizar `auth.service.ts` — login local e troca de senha
5. Atualizar `auth.slice.ts` — campo `mustChangePassword`
6. Nova rota `/trocar-senha` com guard próprio
7. Página `ChangePasswordPage`
8. Atualizar `LoginPage` — adicionar aba de login por senha(só funcionarios utilizam esse login)
9. Página `EmployeesPage` — CRUD completo no Datagrid
10. Atualizar modal de novo funcionario com as informações relevantes construidas ate auqi para o usuario
10. Página de configuração de permissões por tipo

---

## PASSO 1 — Types

### `src/types/employee.types.ts`

```ts
export type EmployeeType = 'Manager' | 'Employee'

export type Permission =
  | 'SellProducts'
  | 'CancelSales'
  | 'ViewStock'
  | 'ManageStock'
  | 'ViewExpenses'
  | 'ManageExpenses'
  | 'ViewReports'
  | 'ManageEmployees'

export interface Employee {
  id: string
  userId: string
  name: string
  email: string
  employeeType: EmployeeType
  position: string
  salary?: number
  phone?: string
  avatarPath?: string
  isActive: boolean
  createdAt: string
}

export interface EmployeePermissions {
  employeeType: EmployeeType
  permissions: Permission[]
}

// Labels em português para exibição na UI
export const EMPLOYEE_TYPE_LABELS: Record<EmployeeType, string> = {
  Manager: 'Gerente',
  Employee: 'Funcionário',
}

export const PERMISSION_LABELS: Record<Permission, string> = {
  SellProducts: 'Registrar vendas',
  CancelSales: 'Cancelar vendas',
  ViewStock: 'Ver estoque',
  ManageStock: 'Ajustar estoque',
  ViewExpenses: 'Ver despesas',
  ManageExpenses: 'Gerenciar despesas',
  ViewReports: 'Ver relatórios',
  ManageEmployees: 'Gerenciar funcionários',
}
```

---

## PASSO 2 — employee.service.ts

Arquivo: `src/services/employee.service.ts`

Seguir o mesmo padrão de `product.service.ts` — tipo backend separado, função `mapEmployee`, payloads tipados.

```ts
import { api } from './api'
import type { Employee, EmployeePermissions, EmployeeType, Permission } from '../types/employee.types'

interface PaginatedResponse<T> {
  data: T[]
  page: number
  pageSize: number
  totalCount: number
  totalPages: number
}

interface BackendEmployee {
  id: string
  userId: string
  name: string
  email: string
  employeeType: string
  position: string
  salary?: number | null
  phone?: string | null
  avatarPath?: string | null
  isActive: boolean
  createdAt: string
}

function mapEmployee(e: BackendEmployee): Employee {
  return {
    id: e.id,
    userId: e.userId,
    name: e.name,
    email: e.email,
    employeeType: e.employeeType as EmployeeType,
    position: e.position,
    salary: e.salary ?? undefined,
    phone: e.phone ?? undefined,
    avatarPath: e.avatarPath ?? undefined,
    isActive: e.isActive,
    createdAt: e.createdAt,
  }
}

export interface CreateEmployeePayload {
  name: string
  email: string
  temporaryPassword: string
  employeeType: EmployeeType
  position: string
  salary?: number
  phone?: string
}

export interface UpdateEmployeePayload {
  employeeType: EmployeeType
  position: string
  salary?: number
  phone?: string
}

export const employeeService = {
  getAll: async (page = 1, pageSize = 20): Promise<{ data: Employee[]; totalCount: number }> => {
    const { data } = await api.get<PaginatedResponse<BackendEmployee>>('/employees', {
      params: { page, pageSize },
    })
    return { data: data.data.map(mapEmployee), totalCount: data.totalCount }
  },

  getById: async (id: string): Promise<Employee> => {
    const { data } = await api.get<BackendEmployee>(`/employees/${id}`)
    return mapEmployee(data)
  },

  create: async (payload: CreateEmployeePayload): Promise<Employee> => {
    const { data } = await api.post<BackendEmployee>('/employees', payload)
    return mapEmployee(data)
  },

  update: async (id: string, payload: UpdateEmployeePayload): Promise<Employee> => {
    const { data } = await api.put<BackendEmployee>(`/employees/${id}`, payload)
    return mapEmployee(data)
  },

  deactivate: async (id: string): Promise<void> => {
    await api.delete(`/employees/${id}`)
  },

  reactivate: async (id: string): Promise<void> => {
    await api.patch(`/employees/${id}/reactivate`)
  },

  getPermissions: async (employeeType: EmployeeType): Promise<EmployeePermissions> => {
    const { data } = await api.get<EmployeePermissions>(`/employees/permissions/${employeeType}`)
    return data
  },

  setPermissions: async (
    employeeType: EmployeeType,
    permissions: Permission[]
  ): Promise<EmployeePermissions> => {
    const { data } = await api.put<EmployeePermissions>('/employees/permissions', {
      employeeType,
      permissions,
    })
    return data
  },
}
```

---

## PASSO 3 — useEmployees.ts

Arquivo: `src/hooks/useEmployees.ts`

Seguir o padrão de `useProducts.ts` — `QUERY_KEY` no topo, `invalidateQueries` no `onSuccess`, `handleError` no `onError`.

```ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { employeeService, type CreateEmployeePayload, type UpdateEmployeePayload } from '../services/employee.service'
import type { EmployeeType, Permission } from '../types/employee.types'
import { useToast } from './useToast'
import { useApiError } from './useApiError'

const QUERY_KEY = ['employees'] as const
const PERMISSIONS_KEY = (type: EmployeeType) => ['employee-permissions', type] as const

export function useEmployees(page = 1, pageSize = 20) {
  return useQuery({
    queryKey: [...QUERY_KEY, page, pageSize],
    queryFn: () => employeeService.getAll(page, pageSize),
  })
}

export function useCreateEmployee() {
  const queryClient = useQueryClient()
  const showToast = useToast()
  const handleError = useApiError()

  return useMutation({
    mutationFn: (payload: CreateEmployeePayload) => employeeService.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY })
      showToast('Funcionário cadastrado com sucesso!', 'success')
    },
    onError: (error) => handleError(error, 'Erro ao cadastrar funcionário.'),
  })
}

export function useUpdateEmployee() {
  const queryClient = useQueryClient()
  const showToast = useToast()
  const handleError = useApiError()

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateEmployeePayload }) =>
      employeeService.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY })
      showToast('Funcionário atualizado com sucesso!', 'success')
    },
    onError: (error) => handleError(error, 'Erro ao atualizar funcionário.'),
  })
}

export function useDeactivateEmployee() {
  const queryClient = useQueryClient()
  const showToast = useToast()
  const handleError = useApiError()

  return useMutation({
    mutationFn: (id: string) => employeeService.deactivate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY })
      showToast('Funcionário desativado.', 'success')
    },
    onError: (error) => handleError(error, 'Erro ao desativar funcionário.'),
  })
}

export function useReactivateEmployee() {
  const queryClient = useQueryClient()
  const showToast = useToast()
  const handleError = useApiError()

  return useMutation({
    mutationFn: (id: string) => employeeService.reactivate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY })
      showToast('Funcionário reativado.', 'success')
    },
    onError: (error) => handleError(error, 'Erro ao reativar funcionário.'),
  })
}

export function useEmployeePermissions(employeeType: EmployeeType) {
  return useQuery({
    queryKey: PERMISSIONS_KEY(employeeType),
    queryFn: () => employeeService.getPermissions(employeeType),
  })
}

export function useSetEmployeePermissions() {
  const queryClient = useQueryClient()
  const showToast = useToast()
  const handleError = useApiError()

  return useMutation({
    mutationFn: ({ employeeType, permissions }: { employeeType: EmployeeType; permissions: Permission[] }) =>
      employeeService.setPermissions(employeeType, permissions),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: PERMISSIONS_KEY(data.employeeType) })
      showToast('Permissões salvas com sucesso!', 'success')
    },
    onError: (error) => handleError(error, 'Erro ao salvar permissões.'),
  })
}
```

---

## PASSO 4 — Atualizar auth.service.ts

Adicionar dois métodos ao `authService` existente — não alterar nenhum método existente:

```ts
loginWithLocal: async (email: string, password: string): Promise<void> => {
  await api.post('/auth/local', { email, password })
},

changePassword: async (currentPassword: string, newPassword: string): Promise<void> => {
  await api.post('/auth/change-password', { currentPassword, newPassword })
},
```

---

## PASSO 5 — Atualizar auth.slice.ts

Adicionar campo `mustChangePassword` ao estado — o backend coloca esse claim no JWT quando `LocalAuth.MustChangePassword = true`. O frontend lê esse campo no `/auth/me` e redireciona para `/trocar-senha` antes de liberar o sistema.

Adicionar ao `AuthState`:
```ts
mustChangePassword: boolean
```

Valor inicial: `false`

Atualizar `setAuth` para mapear o campo:
```ts
mustChangePassword: action.payload.mustChangePassword ?? false,
```

Atualizar `clearAuth` para resetar o campo:
```ts
mustChangePassword: false,
```

Adicionar reducer:
```ts
setMustChangePassword: (state, action: PayloadAction<boolean>) => ({
  ...state,
  mustChangePassword: action.payload,
}),
```

---

## PASSO 6 — Atualizar auth.types.ts

Adicionar campo ao `AuthUser`:
```ts
mustChangePassword: boolean
```

---

## PASSO 7 — Atualizar auth.service.ts — getMe

O backend passa `mustChangePassword` como claim no JWT. O `/auth/me` já retorna os dados do usuário — adicionar o campo ao mapeamento:

```ts
// No MeApiResponse, adicionar:
mustChangePassword?: boolean

// No return do getMe, adicionar:
mustChangePassword: data.mustChangePassword ?? false,
```

---

## PASSO 8 — Guard ChangePasswordRoute

Arquivo: `src/components/ChangePasswordRoute/index.tsx`

Guard que permite acesso a `/trocar-senha` apenas para usuários autenticados com `mustChangePassword = true`. Se autenticado e `mustChangePassword = false`, redireciona para `/`. Se não autenticado, redireciona para `/login`.

```tsx
import { Navigate, Outlet } from 'react-router-dom'
import { useAppSelector } from '../../store/hooks'

export default function ChangePasswordRoute() {
  const { isAuthenticated, isLoading, mustChangePassword } = useAppSelector((s) => s.auth)

  if (isLoading) return null

  if (!isAuthenticated) return <Navigate to="/login" replace />

  if (!mustChangePassword) return <Navigate to="/" replace />

  return <Outlet />
}
```

---

## PASSO 9 — Atualizar ProtectedRoute

O `ProtectedRoute` existente deve checar `mustChangePassword`. Se `true`, redirecionar para `/trocar-senha` em vez de renderizar o conteúdo protegido.

```tsx
// Dentro do ProtectedRoute, após checar isAuthenticated:
if (mustChangePassword) return <Navigate to="/trocar-senha" replace />
```

---

## PASSO 10 — Atualizar router/index.tsx

Adicionar duas rotas novas — não alterar nenhuma rota existente:

```tsx
import ChangePasswordRoute from '../components/ChangePasswordRoute'
import ChangePasswordPage from '../pages/ChangePassword'

// Adicionar junto às outras rotas de guard:
{
  element: <ChangePasswordRoute />,
  children: [{ path: '/trocar-senha', element: <ChangePasswordPage /> }],
},
```

---

## PASSO 11 — ChangePasswordPage

Arquivo: `src/pages/ChangePassword/index.tsx`

Página simples, centralizada, sem `DashboardLayout`. Usa React Hook Form + Zod.

Schema Zod:
- `currentPassword`: string mínimo 1
- `newPassword`: string mínimo 6
- `confirmPassword`: string — deve ser igual a `newPassword` (`.refine`)

Comportamento:
1. Submeter chama `authService.changePassword`
2. Em caso de sucesso: despachar `setMustChangePassword(false)` no Redux + `showToast('Senha alterada com sucesso!', 'success')` + navegar para `/`
3. Em caso de erro: `handleError(error, 'Erro ao alterar senha.')`
4. Mostrar estado de loading no botão durante submissão

Layout sugerido: card centralizado na tela com título "Criar nova senha", subtítulo explicando que é o primeiro acesso, três campos de senha e botão de confirmar.

---

## PASSO 12 — Atualizar LoginPage

A `LoginPage` existente só tem login com Google. Adicionar uma segunda aba ou seção para login com e-mail e senha.

Estrutura sugerida: duas abas — "Entrar com Google" (comportamento atual, intocado) e "Entrar com senha" (nova, somente para empregados).

Schema Zod para login local:
- `email`: string email válido
- `password`: string mínimo 1

Comportamento do login local:
1. Chamar `authService.loginWithLocal(email, password)`
2. Em caso de sucesso: chamar `authService.getMe()` + despachar `setAuth` no Redux + navegar (igual ao fluxo Google existente)
3. Em caso de erro: `handleError(error, 'E-mail ou senha incorretos.')`
4. Mostrar estado de loading no botão durante submissão

Não alterar nada do fluxo Google existente.

---

## PASSO 13 — EmployeesPage

Arquivo: `src/pages/Employees/index.tsx`

Implementar CRUD na pagina existente, utilize as opções no DataGrid para editar e deletar. Modifique a modal que aparece ao clicar em adicionar para inserir as informações que existem no employee.

**Modal de criação** — campos:
- Nome (`name`)
- E-mail (`email`)
- Senha temporária (`temporaryPassword`)
- Tipo (`employeeType`) — Select com opções "Gerente" e "Funcionário" — nunca exibir "Owner"
- Cargo (`position`)
- Salário (`salary`) — opcional
- Telefone (`phone`) — opcional

Schema Zod de criação:
- `name`: string min 1 max 200
- `email`: string email
- `temporaryPassword`: string min 6
- `employeeType`: enum ['Manager', 'Employee']
- `position`: string min 1 max 100
- `salary`: number positivo opcional
- `phone`: string max 20 opcional

**Modal de edição** — mesmos campos exceto `name`, `email` e `temporaryPassword` (não editáveis após criação).

### Aba Permissões

Duas seções lado a lado (ou tabs internas): uma para "Gerente", outra para "Funcionário".

Para cada tipo, exibir lista de todas as permissões disponíveis com checkboxes. Owner marca/desmarca e salva. Ao salvar, chama `useSetEmployeePermissions` com a lista completa de permissões marcadas.

Lista de permissões com labels em português — usar `PERMISSION_LABELS` do `employee.types.ts`.


## Regras críticas — nunca violar

- O select de tipo de funcionário **nunca** exibe "Owner" como opção
- Login local e Google são abas separadas — o fluxo Google não deve ser alterado
- `mustChangePassword = true` bloqueia acesso ao sistema até a senha ser trocada — o guard `ChangePasswordRoute` e a atualização do `ProtectedRoute` são obrigatórios
- Mapeamento backend → frontend feito no service, nunca no hook ou componente
- Nunca usar `any` ou `as` para forçar tipo
- Nunca axios direto — sempre via `api` de `./services/api`

---

## O que NÃO fazer

- Não alterar nenhum hook, service ou página existente além do indicado
- Não alterar o fluxo de login com Google
- Não implementar upload de foto de funcionário — `avatarPath` existe no type mas sem UI
- Não usar Redux para cache de dados de Employee — apenas React Query
- Não duplicar tipagem que o Zod já infere — usar `z.infer<typeof schema>`
- Não hardcodar cores ou espaçamentos — sempre tokens do tema