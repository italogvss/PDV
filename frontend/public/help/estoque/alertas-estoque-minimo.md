# Alertas de estoque mínimo

O sistema pode avisar quando um produto está acabando, com base em dois limites configuráveis por produto: **estoque mínimo** e **estoque crítico**.

> Esse é um recurso do plano **Pro**.

---

## Como funcionam os níveis

- **OK** — estoque acima do mínimo definido.
- **Baixo** — estoque igual ou abaixo do mínimo.
- **Crítico** — estoque igual ou abaixo do crítico (tem prioridade sobre o mínimo).

## Configurando estoque mínimo e crítico

**Por produto:** ao cadastrar ou editar um produto em **Estoque**, preencha os campos **Estoque mínimo** e **Estoque crítico**.

**Padrão para novos produtos:** em **Configurações > Operação**, card **Estoque**, ative **Controlar estoque mínimo e crítico** e defina:
- **Estoque mínimo padrão** e **Estoque crítico padrão** — pré-preenchidos automaticamente ao cadastrar um novo produto.
- **Campos editáveis no cadastro e edição** — permite alterar esses valores por produto; se desativado, todos os produtos usam os padrões definidos aqui.

---

## Onde os alertas aparecem

- Na lista de **Estoque**, a coluna **Nível** mostra uma barra de progresso e um chip (OK / Baixo / Crítico) por produto.
- Os KPIs **Estoque baixo** e **Crítico**, no topo da tela de Estoque, somam quantos produtos estão em cada situação.
- No **Painel** (Dashboard), o card **Alertas de estoque** lista os produtos mais urgentes, ordenados por criticidade.

## Observações

> **Importante:** definir estoque mínimo, crítico e os padrões de estoque é um recurso do plano **Pro** — no plano padrão, esses campos e alertas ficam bloqueados.

Um produto com estoque **zerado** não conta como alerta de estoque baixo/crítico — ele simplesmente some do catálogo de vendas por estar fora de estoque.

