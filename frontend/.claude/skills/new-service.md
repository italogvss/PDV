# Skill — Novo service + hook React Query

Use esta skill sempre que precisar conectar uma nova feature à API.

## Checklist obrigatório

1. Criar tipos em `/types/{feature}.types.ts`
2. Criar service em `/services/{feature}.service.ts`
3. Criar hook em `/hooks/use{Feature}.ts`
4. Definir `QUERY_KEY` como const tipada
5. Mutations sempre invalidam a query no `onSuccess`
6. Nunca chamar `api` diretamente na página — sempre via hook

## Template de tipos

```ts
// types/{feature}.types.ts
export interface {Feature} {
  id: string
  tenantId: string
  name: string
  createdAt: string
  updatedAt: string
}

export interface Create{Feature}Input { name: string }
export interface Update{Feature}Input { name?: string }
```

## Template de service

```ts
// services/{feature}.service.ts
import { api } from './api'
import { {Feature}, Create{Feature}Input, Update{Feature}Input } from '../types/{feature}.types'

export const {feature}Service = {
  getAll: async (): Promise<{Feature}[]> => {
    const { data } = await api.get('/{features}')
    return data.data
  },
  getById: async (id: string): Promise<{Feature}> => {
    const { data } = await api.get(`/{features}/${id}`)
    return data.data
  },
  create: async (input: Create{Feature}Input): Promise<{Feature}> => {
    const { data } = await api.post('/{features}', input)
    return data.data
  },
  update: async (id: string, input: Update{Feature}Input): Promise<{Feature}> => {
    const { data } = await api.patch(`/{features}/${id}`, input)
    return data.data
  },
  delete: async (id: string): Promise<void> => {
    await api.delete(`/{features}/${id}`)
  },
}
```

## Template de hook

```ts
// hooks/use{Feature}.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { {feature}Service } from '../services/{feature}.service'
import { Create{Feature}Input, Update{Feature}Input } from '../types/{feature}.types'

export const {FEATURE}_KEY = ['{features}'] as const

export function use{Feature}s() {
  return useQuery({ queryKey: {FEATURE}_KEY, queryFn: {feature}Service.getAll })
}

export function use{Feature}(id: string) {
  return useQuery({
    queryKey: [...{FEATURE}_KEY, id],
    queryFn: () => {feature}Service.getById(id),
    enabled: !!id,
  })
}

export function useCreate{Feature}() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: Create{Feature}Input) => {feature}Service.create(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: {FEATURE}_KEY }),
  })
}

export function useUpdate{Feature}() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Update{Feature}Input }) =>
      {feature}Service.update(id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: {FEATURE}_KEY }),
  })
}

export function useDelete{Feature}() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => {feature}Service.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: {FEATURE}_KEY }),
  })
}
```
