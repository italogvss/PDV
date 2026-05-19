Tarefa: Implementar lógica da página de Produtos + Categorias

1. Leitura obrigatória antes de qualquer código
Leia os seguintes arquivos antes de escrever qualquer linha:

CLAUDE.md — regras e convenções do projeto
Todo o backend relacionado a produtos e categorias:

Controllers (procure por Product e Category nos controllers)
DTOs/Models de entrada e saída
Rotas registradas (procure no arquivo de configuração de rotas)

Após a leitura, liste:

Todos os endpoints encontrados (método + rota + payload + response)
Os campos de Produto e Categoria que o backend espera e retorna
Se o backend já suporta multitenancy via header X-Tenant-Id ou via outro mecanismo

Se o backend estiver incompleto para suportar alguma operação necessária, liste o que precisa ser criado no backend antes de continuar.

2. O que precisa ser implementado
Entidades

ProductCategory: CRUD completo (listar, criar, editar, excluir)
Product: CRUD completo (listar, criar, editar, excluir)
Produto pertence a uma categoria — o formulário de produto deve listar categorias disponíveis para seleção

Funcionalidades da página

Listagem de produtos em DataGrid com colunas: nome, categoria, preço, estoque, status (ativo/inativo)
Busca/filtro por nome e categoria
Botão criar produto → abre modal com formulário
Editar produto → abre modal preenchido
Excluir produto → confirmação antes de deletar
Aba ou seção separada para gerenciar categorias (listar, criar, editar, excluir)


3. O que criar
Siga rigorosamente a ordem abaixo:
Passo 1 — Types
Crie src/types/product.types.ts e src/types/productCategory.types.ts com base nos contratos reais do backend.
Passo 2 — Services
Crie src/services/product.service.ts e src/services/productCategory.service.ts seguindo o padrão em .claude/examples/services.md.
Passo 3 — Hooks
Crie src/hooks/useProducts.ts e src/hooks/useProductCategories.ts seguindo o padrão em .claude/examples/hooks.md.

Inclua tenantId na queryKey
Use enabled: !!tenantId em todos os useQuery
Crie hooks para todas as mutações necessárias (create, update, delete)

Passo 4 — Componentes da página
Crie dentro de src/pages/Products/components/:

ProductTable/ — DataGrid com listagem, busca e ações
ProductForm/ — formulário de criar/editar com validação Zod
ProductDeleteDialog/ — modal de confirmação de exclusão
CategorySection/ — listagem + CRUD de categorias

Passo 5 — Página principal
Atualize src/pages/Products/index.tsx conectando todos os componentes acima.

4. Regras que nunca podem ser violadas

Nunca usar cores hardcoded — sempre via tema MUI
Nunca usar React.FC ou arrow function para componentes
Nunca buscar dados fora de um hook React Query
Nunca usar any ou as para forçar tipo
Inferir tipos do Zod via z.infer<typeof schema>
Botões com ação assíncrona devem ter ícone de loading enquanto a mutation está pendente
Nunca usar process.env — sempre import.meta.env


5. Ao finalizar

Confirme quais arquivos foram criados ou modificados
Se precisou alterar o backend, liste exatamente o que mudou e por quê
Se ficou alguma decisão em aberto (campo sem tipo claro, endpoint ambíguo), liste para revisão