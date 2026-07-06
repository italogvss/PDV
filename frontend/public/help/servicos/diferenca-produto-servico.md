# Diferença entre produto e serviço

O sistema trabalha com dois tipos de item vendável: **produtos** (Estoque) e **serviços** (Serviços). Ambos aparecem no catálogo da tela de Vender, mas funcionam de formas diferentes.

## Produto

- Tem **estoque** — uma quantidade física que diminui a cada venda e some do catálogo quando chega a zero.
- Pode ter **estoque mínimo e crítico** para alertas de reposição (plano Pro).
- Pode ter **código de barras** e **foto** (plano Pro).
- Não tem duração — é vendido e entregue na hora.

## Serviço

- **Não tem estoque** — pode ser vendido quantas vezes forem necessárias, sem limite de quantidade.
- Tem **duração em minutos**, usada para calcular o horário de término em um **agendamento**.
- Pode **consumir produtos do estoque** durante a execução (plano Pro) — por exemplo, um corte de cabelo que usa produtos de finalização. Isso reduz o estoque desses produtos, mesmo o serviço em si não tendo estoque próprio.
- É o único tipo de item que pode ser reservado em **Agendamentos**.

---

## Em comum

- Ambos têm nome, preço de venda, preço de custo (para cálculo de margem/lucro) e categoria própria.
- Ambos aparecem juntos no carrinho da tela de Vender — uma venda pode misturar produtos e serviços na mesma transação.
- Ambos podem ser desativados sem perder o histórico de vendas já realizado, e restaurados depois em **Configurações > Itens desativados**.

---

## Quando usar cada um

> Use **produto** para qualquer item físico controlado por quantidade (mercadoria, insumo revendido).
>
> Use **serviço** para mão de obra, atendimento ou qualquer coisa que tenha duração e não dependa de estoque — especialmente se o negócio usa a agenda para marcar horários.

