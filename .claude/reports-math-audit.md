# Auditoria de Matemática — Página de Relatórios

> Gerado em 2026-06-28. Cobre a cadeia completa: `pages/Reports/index.tsx` → `useReports.ts` → `report.service.ts` → `ReportsController` → `ReportService.cs`.

---

## Visão geral dos dados

| Entidade | Campos relevantes |
|---|---|
| `Sale` | `Status`, `Total`, `FeeAmount`, `Discount`, `CreatedAt`, `OperatorId`, `OperatorName`, `PaymentMethod`, `CustomerId` |
| `SaleItem` | `ProductId`, `ServiceId`, `ProductName`, `Subtotal`, `Quantity`, `PurchasePriceSnapshot` |
| `Expense` | `Amount`, `DueDate`, `Category` |

**Filtro global de tenant**: `Sale` e `Expense` têm `HasQueryFilter(e => e.TenantId == tenantContext.TenantId)` — nenhuma query nos reports precisa passar TenantId manualmente.

**Filtro de status das vendas**: a maioria das queries filtra `Status == SaleStatus.Active`. Canceladas são excluídas de receita, custo e todos os demais cálculos — exceto `GetSalesMetricsAsync` que carrega tudo para calcular `cancelledCount` separadamente.

---

## KPI Cards

### 1. Receita Total

```
Endpoint: GET /reports/sales?startDate=&endDate=
Entidade: Sale
Campos:   Sale.Total, Sale.Status, Sale.CreatedAt
Cálculo:  SUM(Sale.Total) WHERE Status == Active AND CreatedAt IN [start, end]
```

### 2. Total de Vendas

```
Endpoint: GET /reports/sales
Entidade: Sale
Campos:   Sale.Status, Sale.CreatedAt
Cálculo:  COUNT(*) WHERE Status == Active AND CreatedAt IN [start, end]
```

### 3. Ticket Médio

```
Endpoint: GET /reports/sales
Entidade: Sale (mesma query de métricas)
Cálculo:  totalRevenue / totalSales  (0 se totalSales == 0)
```

### 4. Margem de Lucro Média ⚠️ calculado no FRONTEND

```
Dados:    useFinancialSummary (FinancialSummaryPoint[])
Campos:   .revenue, .netResult (por bucket)
Cálculo:  (SUM(netResult) / SUM(revenue)) * 100
Arquivo:  pages/Reports/index.tsx:109-115
```

> **Ponto de atenção**: `netResult` exclui da sua receita base (`ProfitRevenue`) os produtos sem `PurchasePriceSnapshot`, mas o denominador usa `revenue = Sale.Total` — que inclui esses produtos. Logo, quando há produtos sem custo cadastrado, `revenue > ProfitRevenue` e a margem resultante é subestimada (denominador inflado).

---

## Gráficos — série temporal (dependem de `FinancialSummary`)

Os três gráficos abaixo compartilham o mesmo endpoint e DTO `FinancialSummaryPoint`.

### FinancialSummaryPoint — como é construído

```
Endpoint: GET /reports/financial-summary?startDate=&endDate=&groupBy=(day|week|month)
Entidades: Sale, SaleItem, Expense
```

**Passo a passo do backend (`ReportService.GetFinancialSummaryAsync`)**:

```
1. Carrega Sales ativas no período:
   SELECT CreatedAt, Total, FeeAmount,
     SUM(item.Subtotal)                 WHERE item.ServiceId != null OR item.PurchasePriceSnapshot != null  → ProfitRevenue
     SUM(item.PurchasePriceSnapshot * item.Quantity)  mesmos itens                                         → Cost

2. Carrega Expenses no período por DueDate (competência):
   SELECT DueDate, Amount

3. Agrupa Sales e Expenses por bucket (dia/semana/mês)

4. Por bucket:
   Revenue      = SUM(Sale.Total)                      ← receita bruta pós-desconto
   ProfitRevenue= SUM(SaleItem.Subtotal)               ← só itens contáveis (serviço ou produto com custo)
   Cost         = SUM(PurchasePriceSnapshot * Qty)     ← só itens com custo (serviço contribui 0)
   Fees         = SUM(Sale.FeeAmount)
   Expenses     = SUM(Expense.Amount)
   GrossProfit  = ProfitRevenue - Cost
   NetResult    = GrossProfit - Fees - Expenses
```

> **Regra de inclusão de itens no lucro**:
> - Serviços (`ServiceId != null`): sempre incluídos, `PurchasePriceSnapshot = null` → custo 0, 100% lucro bruto.
> - Produtos COM `PurchasePriceSnapshot`: incluídos com custo real.
> - Produtos SEM `PurchasePriceSnapshot`: **excluídos** — nem entram em `ProfitRevenue` nem em `Cost`. Sua receita aparece em `Revenue` mas não no `GrossProfit`.

---

### 5. FinancialBarChart — "Receita × Resultado líquido"

```
Séries:   revenue (verde), netResult (azul)
Cálculo:  direto de FinancialSummaryPoint por bucket
```

### 6. AccumulatedProfitChart — "Lucro acumulado" ⚠️ calculado no FRONTEND

```
Campo:    netResult por bucket
Cálculo:  soma cumulativa — acumula no frontend ao percorrer o array
Arquivo:  components/AccumulatedProfitChart.tsx:22-26

let running = 0
accumulated[i] = running += data[i].netResult
```

### 7. RevenueLineChart — "Receita ao longo do tempo"

```
Série atual:   revenue por bucket (período selecionado)
Série anterior: revenue por bucket (período anterior equivalente)

Período anterior calculado no frontend (index.tsx:76-79):
  prevEnd   = startDate − 1 dia
  prevStart = prevEnd − (daysSpan − 1) dias
  → mesma duração, imediatamente anterior
```

Dois fetches separados para `/reports/financial-summary` com datas distintas. O gráfico sobrepõe as duas séries; os buckets do período anterior podem ter granularidade diferente (o backend usa o mesmo `groupBy`), então os labels do eixo X vêm do período atual.

---

## Gráficos — sem série temporal

### 8. RevenueByTypeDonut — "Serviços vs Produtos" ⚠️

```
Endpoint: GET /reports/revenue-by-type
Entidades: Sale, SaleItem
Campos:   SaleItem.ServiceId, SaleItem.Subtotal
Cálculo:
  servicesRevenue = SUM(SaleItem.Subtotal) WHERE ServiceId != null
  productsRevenue = SUM(SaleItem.Subtotal) WHERE ServiceId == null
```

> **Inconsistência com FinancialSummary**: aqui usa `SaleItem.Subtotal` (pré-desconto), enquanto `FinancialSummary.revenue` usa `Sale.Total` (pós-desconto). Se houver descontos de venda, `servicesRevenue + productsRevenue > Sale.Total` e o donut exibe uma receita total maior do que o KPI "Receita total".

### 9. PaymentMethodPieChart — "Vendas por forma de pagamento"

```
Endpoint: GET /reports/sales/by-payment-method
Entidades: Sale
Campos:   Sale.PaymentMethod, Sale.Total, Sale.Status, Sale.CreatedAt
Cálculo:
  Agrupa por PaymentMethod
  Fatia = SUM(Sale.Total) por método   ← pós-desconto, coerente com KPI "Receita total"
  Count = COUNT(*) por método
```

### 10. OperatorRankingChart — "Ranking por operador"

```
Endpoint: GET /reports/sales/by-operator
Entidades: Sale
Campos:   Sale.OperatorId, Sale.OperatorName, Sale.Total, Sale.Status, Sale.CreatedAt
Cálculo:
  Agrupa por (OperatorId, OperatorName)
  Barra = SUM(Sale.Total) por operador    ← pós-desconto
  totalSales = COUNT(*)
Ordenação backend: DESC por TotalRevenue
Ordenação frontend: ASC (para BarChart horizontal exibir maior no topo)
```

### 11. TopProductsChart — "Top produtos vendidos"

```
Endpoint: GET /reports/products/top?limit=10
Entidades: Sale, SaleItem
Campos:   SaleItem.ProductId, ProductName, Quantity, Subtotal
          Sale.Discount, Sale.Status, Sale.CreatedAt
          + ItemsTotal = SUM(todos SaleItem.Subtotal da venda)
Cálculo por item:
  NetRevenue = Subtotal − Discount × (Subtotal / ItemsTotal)
  → rateio proporcional do desconto da venda sobre cada item
Agrupamento por ProductName: SUM(Quantity), SUM(NetRevenue)
Top N por NetRevenue DESC
Exclui serviços (só items com ProductId != null)
```

---

## Resumo das inconsistências encontradas

| # | Onde | Problema |
|---|---|---|
| A | KPI "Margem de lucro" | Denominador (`revenue`) inclui produtos sem custo; numerador (`netResult`) os exclui → margem subestimada quando há produtos sem custo cadastrado |
| B | `RevenueByTypeDonut` | Usa `SaleItem.Subtotal` (pré-desconto) vs `Sale.Total` (pós-desconto) nos demais → total do donut ≠ KPI "Receita total" quando há descontos |
| C | `Despesas no netResult` | Inclui despesas não pagas (filtro é `DueDate`, não `PaidAt`) — é regime de competência, intencional, mas pode surpreender |
| D | `RevenueLineChart` (período anterior) | Os labels do eixo X são do período atual; o período anterior compartilha os mesmos índices de posição, mas os rótulos de data não correspondem ao período real do dado anterior |
| E | Fuso horário | `CreatedAt` é UTC sem conversão — vendas próximas de meia-noite podem cair no bucket errado |
| F | `GetSalesMetricsAsync` | `cancelledCount` é calculado e retornado na API mas não exibido em nenhum card da UI |

---

## Fluxo de datas (seleção de período)

```
Presets no frontend:
  "30d" → start = today - 29 dias, end = today  (janela de 30 dias, inclui hoje)
  "3m"  → start = today - 3 meses, end = today

daysSpan = end.diff(start, 'day') + 1

Granularidade sugerida automática:
  daysSpan ≤ 31 → 'day'
  daysSpan ≤ 92 → 'week'
  else          → 'month'

Período anterior:
  prevEnd   = start - 1 dia
  prevStart = prevEnd - (daysSpan - 1) dias
```

**No backend**, `startDate` e `endDate` são inclusivos — `end` é expandido para `endDate.Date.AddDays(1).AddTicks(-1)` para pegar o último instante do dia.
