# PDV-Ultra — Frontend

React + TypeScript + MUI v6. Interface de gestão para pequenos comércios. Consome API REST via Axios + React Query.

## Stack
React, TypeScript, MUI v6, React Router DOM v6, Axios, TanStack React Query, Redux Toolkit, React Hook Form + Zod

## Estrutura de pastas
```
/src
├── assets/
├── components/{ComponentName}/index.tsx + types.ts
├── layouts/DashboardLayout
├── design/              ← somente leitura, referência visual
├── hooks/
├── pages/{PageName}/index.tsx + components/
├── router/index.tsx
├── services/api.ts + {feature}.service.ts
├── store/index.ts + slices/{feature}.slice.ts
├── theme/index.ts + palette.ts + typography.ts + components.ts
├── types/{feature}.types.ts
└── utils/
```

## Princípios de estado
- **TanStack Query** → tudo que vem da API (produtos, categorias, vendas, despesas). Gerencia cache, loading, erro e invalidação automaticamente.
- **Redux** → estado da sessão e UI global (usuário autenticado, tenantId, tema, sidebar, toasts). Nunca buscar dados da API via Redux.
- **Axios** → transporte apenas. O interceptor lê `tenantId` e `token` do Redux/localStorage e injeta em todo request.

Ver exemplos: @.claude/examples/services.md | @.claude/examples/hooks.md | @.claude/examples/components.md | @.claude/examples/redux.md | @.claude/examples/forms.md

## Tema MUI
- Informações detalhadas em `theme/README.md`
- Tabelas de dados usam DataGrid
- Botões com ações assíncronas têm ícone de loading
- **Nunca usar cores hardcoded** — sempre via tema (`primary.main`, `error.main`, etc.)
- Cores fora do padrão MUI: estender via module augmentation em `theme/palette.ts`
- Customizações globais de componentes: via `theme.components`, nunca CSS externo

Ver exemplo de extensão de paleta: @.claude/examples/theme.md

## Pasta `/design`
Somente leitura. Ao converter para componente, criar em `/components` ou `/pages`. Nunca copiar hex direto — mapear para tokens do tema.

## Regras de componente
- `export default function NomeDoComponente({ }: Props) {}` — sempre
- Props em `types.ts` separado na mesma pasta
- Nunca usar `React.FC` ou `const Component = () =>`
- Nunca exportar props no mesmo arquivo do componente

## Tipagem
- Nunca usar `any` — usar `unknown` com narrowing
- Nunca usar `as` para forçar tipo
- Inferir tipos do Zod via `z.infer<typeof schema>` — nunca duplicar manualmente

## Variáveis de ambiente
- Sempre `import.meta.env` — nunca `process.env`
- Nunca commitar `.env` — apenas `.env.example`

## O que nunca fazer
- Cores hardcoded
- `React.FC` ou arrow function para componentes
- Buscar dados da API fora de um hook React Query
- `any` ou `as` para forçar tipo
- Editar arquivos em `/design`
- Duplicar tipagem que o Zod já infere
- Redux para estado de servidor
- `process.env`

## Skills disponíveis
| Tarefa | Skill |
|---|---|
| Criar novo componente reutilizável | `skills/new-component.md` |
| Criar nova página com rota | `skills/new-page.md` |
| Criar service + hook React Query | `skills/new-service.md` |