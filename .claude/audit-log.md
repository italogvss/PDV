# Refatoração: Sistema centralizado de logs de auditoria

## Contexto

Hoje existem 4 entidades separadas para log de operações:
- `AppointmentStatusLog`
- `ProductPriceHistory`
- `ServicePriceHistory`
- `StockMovement`

O problema é que cada uma tem sua própria tabela, sua própria lógica de criação espalhada pelas services, e nenhum padrão comum entre elas.

## O que precisa ser feito

### Conceito

Substituir as 4 entidades por uma única entidade `AuditLog` com um cabeçalho fixo (quem fez, quando, em qual entidade) e um campo `DetailsJson` livre para armazenar o payload específico de cada tipo de operação — que varia conforme a ação registrada.

Um serviço centralizado `IAuditLogger` deve encapsular toda a lógica de criação desses logs, sendo injetado nas services de domínio que hoje criam os logs manualmente.

### Ações que devem ser logadas

Além de migrar o que já existe, adicionar logs para:
- Desativação (soft-delete) de produto, serviço, cliente e funcionário
- Mudança de permissões de um cargo (`TenantRole`)

### Migration

- Criar a tabela `AuditLogs` com índices adequados para as queries mais comuns (por entidade e por data)
- **Dropar completamente** as tabelas antigas
- Remover as entidades e configurações antigas do codebase

### Frontend

- Criar tipos TypeScript para os logs e seus detalhes
- Criar um hook de consulta reutilizável
- ajustar pagina Logs com os novos tipos

## Restrições

- O `IAuditLogger` é chamado diretamente dentro das services
- Banco em desenvolvimento — pode dropar as tabelas antigas sem preocupação com migração de dados
