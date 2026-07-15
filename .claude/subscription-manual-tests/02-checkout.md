# Checkout, ativação e reativação — C1 a C9

Referência: [subscriptions.md §8.2–8.3](../../docs/subscriptions.md). Invariantes em jogo: **a ativação
vem por webhook, nunca da resposta do checkout** (RF-17); **nenhum `Payment` nasce no checkout** — o
histórico nasce do `invoice.paid`; **reativação reaproveita a mesma linha** (RF-1).

Mantenha o `stripe listen` rodando em todos os cenários.

---

## C1 — Primeiro checkout aprovado

**Pré:** usuário sem assinatura ou com trial **expirado** (T4).

**Passos**
1. Assinatura → escolher **Essencial Mensal** → Assinar.
2. Antes de pagar, confira o banco: deve estar `Pending`.
3. No Stripe Checkout, pague com `4242 4242 4242 4242`.
4. Observe o retorno (`/assinatura/retorno`) fazendo polling.

**Esperado**
- *UI:* a tela de retorno mostra "confirmando pagamento" e vira **assinatura ativa** sozinha, sem
  refresh manual. Módulos liberados.
- *Banco (após o webhook):* `Status = Active`; `GatewaySubscriptionId` = `sub_...`;
  `GatewayCustomerId` = `cus_...`; **`StartedAt` preenchido** (= `event.created`);
  `CurrentPeriodEnd ≈ +30d`; `TrialEndsAt` NULL; `GatewaySyncedAt` preenchido.
  Uma linha em `Payments`: `Status = Paid`, `AmountCents = 2999`, `GatewayChargeId = pi_...`,
  `GatewayInvoiceId = in_...`, `PeriodStart`/`PeriodEnd` cobrindo o ciclo.
  Após o `charge.succeeded`, a mesma linha ganha `CardLastFour = 4242` e `CardBrand`.
- *Gateway:* 1 customer, 1 assinatura `active`, 1 fatura paga.
- *Terminal do `stripe listen`:* todos os eventos com **200**.

**Verificação crítica:** entre o passo 2 e o 3, `Payments` está **vazio**. Um checkout não deixa linha
pendente no histórico.

---

## C2 — Fecha o checkout sem pagar

**Passos**
1. Inicie o checkout e **feche a aba** do Stripe (ou volte pelo `cancelUrl`).

**Esperado**
- *UI:* volta para a tela de assinatura; nenhum acesso concedido.
- *Banco:* `Status = Pending`, `UpdatedAt = agora`. **Nenhuma** linha em `Payments`.
- *Job (24h):* força o TTL e reinicie a API —
  ```sql
  UPDATE Subscriptions SET UpdatedAt = UTC_TIMESTAMP() - INTERVAL 25 HOUR WHERE Id = '<id>';
  ```
  → `Status = Expired`.

---

## C3 — `Expired` reassina (o teste da recorrência órfã)

**Pré:** a assinatura do C1 levada a `Expired` (via R6, ou forçando o status no banco). Anote o
`GatewaySubscriptionId` **antigo** (`sub_A`) e o `StartedAt` antigo.

**Passos**
1. Assinatura → escolher plano → pagar com `4242...`.

**Esperado**
- *Banco:* **a mesma linha** (`Subscriptions.Id` inalterado — não surgiu uma 2ª). `StartedAt` é **novo**
  (janela de reembolso reaberta — é o que o X6 explora). `GatewaySubscriptionId` = `sub_B` ≠ `sub_A`.
  `GatewaySyncedAt` foi zerado e regravado; `PendingPlanId` NULL.
- *Gateway:* **`sub_A` está `canceled`** e só **`sub_B`** está `active`.

> Este é o cenário que o `DiscardGatewaySubscriptionAsync` protege (RF-20). Duas recorrências vivas
> significariam cobrança dupla e colisão no índice único. Confira no Dashboard, não só no banco.

---

## C4 — `Canceled` ainda dentro do período reassina

**Pré:** assinatura `Canceled` com `CurrentPeriodEnd` **no futuro** (resultado do X3).

**Passos**
1. Assinatura → escolher plano → pagar.

**Esperado**
- *UI:* **permitido**; a UI avisa que a cobrança é imediata (o tempo restante do período pago não é
  creditado).
- *Banco:* mesma linha, `Status` volta a `Active`, `StartedAt` novo.

---

## C5 — `Active` tenta assinar de novo

**Pré:** assinatura `Active` e entitled.

**Passos**
1. `POST /api/subscriptions/checkout`.

**Esperado**
- **400**, com a data de fim do período na mensagem. Nenhuma sessão criada no gateway.

---

## C6 — `RefundRequested` tenta assinar

**Pré:** cancelamento dentro da janela feito, estorno ainda **não** confirmado (X1 — pause o
`stripe listen` logo após cancelar para segurar o `charge.refunded`).

**Passos**
1. Tente assinar.

**Esperado**
- **400** "reembolso em análise". Nenhuma sessão criada.

> Sem esse bloqueio, o `charge.refunded` chegando depois derrubaria a assinatura **nova** (X11).

---

## C7 — Cartão recusado no checkout

**Passos**
1. Inicie o checkout e pague com `4000 0000 0000 0002`.

**Esperado**
- *UI:* o Stripe recusa na própria tela; o usuário segue lá.
- *Banco:* `Status = Pending`; **nenhuma** linha em `Payments`; nenhum `sub_`.
- *Job:* expira em 24h (como C2).

---

## C8 — Webhook chega antes de o usuário voltar

**Passos**
1. Pague e, **antes** de o navegador redirecionar, o `stripe listen` já mostra os eventos.
   (Na prática é o caso comum; force ficando alguns segundos na tela do Stripe após aprovar.)

**Esperado**
- *UI:* a tela de retorno encontra `Active` na **primeira** chamada de `/me` — sem espera perceptível.
- *Banco:* idêntico ao C1. A ordem de chegada entre `customer.subscription.created` e `invoice.paid`
  **não importa** — nenhum handler lê datas do outro.

**Variante (ordem invertida):** com os fixtures, envie `invoice-paid.json` **antes** de
`subscription-created.json`. O resultado final deve ser idêntico ao C1.

---

## C9 — Webhook nunca chega

**Passos**
1. **Pare o `stripe listen`.**
2. Faça um checkout e pague com `4242...`.

**Esperado**
- *UI:* a tela de retorno faz polling por 60s e cai na mensagem "estamos confirmando seu pagamento" —
  **sem** falso positivo de ativação.
- *Banco:* `Status = Pending` (o pagamento existe no gateway, mas o estado local só muda por webhook).
- *Recuperação:* religue o `stripe listen` e reenvie os eventos pelo Dashboard do Stripe
  (Developers → Events → Resend). A assinatura ativa normalmente — a ativação é resiliente ao atraso.
