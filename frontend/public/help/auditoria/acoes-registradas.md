# O que é registrado na auditoria

Nem toda ação do sistema vira um registro de auditoria — apenas mudanças sensíveis, que valem a pena rastrear depois. São elas:

## Preço de produto / Preço de serviço

Registrado sempre que o preço de venda de um produto ou serviço é alterado. O detalhe mostra o valor antigo e o novo, com destaque em vermelho (aumento) ou verde (redução).

---

## Movimentação de estoque

Toda entrada ou saída de estoque gera um registro, com a quantidade movimentada e o tipo:

- **Entrada** — ajuste manual que soma unidades.
- **Saída (Venda)** — baixa automática por uma venda.
- **Estorno** — devolução ao estoque por cancelamento de venda.
- **Ajuste Manual** — correção feita em *Ajustar estoque*.

---

## Status de agendamento

Registrado a cada mudança de status de um agendamento (ex: de "Confirmado" para "Em atendimento"), mostrando o status anterior e o novo.

## Produto / Serviço / Cliente / Funcionário desativado

Um registro é criado sempre que um desses itens é desativado — útil para saber quem desativou o quê e quando, mesmo que o item já esteja em **Itens desativados**.

## Permissões de cargo

Registrado quando as permissões de um papel são alteradas na matriz de permissões (em **Funcionários**), com a quantidade de permissões adicionadas e removidas.

## Observações

> **Nota:** a auditoria é somente leitura — não é possível editar ou apagar um registro por aqui.

Cancelamento de vendas, criação de registros e outras ações que não estão nesta lista não aparecem na auditoria; elas ficam registradas nos próprios históricos de cada área (ex: **Vendas > Histórico**).
