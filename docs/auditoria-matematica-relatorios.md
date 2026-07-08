# Auditoria de Matemática — Relatórios & Estatísticas

> **Quarta revisão — 2026-07-08.** Substitui a terceira revisão (2026-07-07) como fonte de verdade.
> A pedido, esta revisão é **enxuta**: contém apenas quatro tópicos — Sumário, Arquitetura do
> módulo, Catálogo completo de gráficos e Falhas/bugs. Foram propositalmente removidas as seções
> de rastreabilidade de falhas fechadas, propostas de arquitetura, checklist e histórico das
> revisões anteriores.
>
> Cobre as quatro superfícies analíticas do produto: **página de Relatórios** ("Lucros &
> relatórios"), **Dashboard**, **Detalhe do Cliente** (`CustomerDetail`) e **Detalhe do
> Funcionário** (`EmployeeDetail`). Reverificado linha a linha contra o código atual.
>
> **Mudança estrutural desde a 3ª revisão:** as seções **Agendamentos** e **Clientes** da página
> de Relatórios — que eram *placeholders* vazios — foram **totalmente implementadas** (7 gráficos
> de agendamento + ranking de clientes + rankings/listas de funcionário/cliente). Toda a matemática
> nova foi auditada aqui pela primeira vez.

---

## 1. Sumário

A matemática de lucro continua **centralizada** em `PDV.Application/Helpers/SaleFinancials.cs`
(uma fórmula, seis consumidores, zero cópias divergentes). Nenhuma falha de severidade **Alta**
está aberta. As pendências da 3ª revisão que dependiam apenas de rótulo/tooltip **continuam
abertas** (não foram aplicadas), e a implementação da nova seção de **Agendamentos** introduziu
**duas falhas novas** de base de receita/consistência.

| Severidade | Qtd | Temas |
|---|---|---|
| 🔴 Alta | 0 | — |
| 🟡 Média | 5 | (1) base mista margem/composição — residual by design; (2) fuso UTC sistêmico; (3) agrupamento por nome em 2 lugares; (4) "Lucro" do Dashboard analítico ≠ KPI "Lucro estimado"; **(5, novo)** receita de agendamentos usa duas bases diferentes (`Appointment.Price` × `Σ AppointmentServiceItem.Price`) |
| ⚪ Baixa | 6 | `cancelledCount` nunca exibido; despesas por competência; `GET /reports/stock` órfão; **(novo)** tratamento de cancelados inconsistente entre gráficos de agendamento; **(novo)** ranking por operador/funcionário agrupa por nome-snapshot; **(novo)** listas de funcionário/cliente dentro de Relatórios dependem de outros módulos |
| 📌 Fora do escopo matemático | 1 | `EmployeesController.GetStats` não aplica o gate de entitlement Pro que Clientes/Relatórios aplicam |

Catálogo completo: §3. Detalhe das falhas: §4.

---

## 2. Arquitetura do módulo de relatórios

### 2.1 Cadeia de dados (frontend → banco)

```
┌─ Páginas ────────────────┐   ┌─ Hooks (React Query) ─────┐   ┌─ Services (HTTP+map) ──────┐
│ Reports/index.tsx         │   │ hooks/useReports.ts        │   │ services/report.service.ts  │
│ Dashboard/index.tsx       │──▶│ (useSalesMetrics,          │──▶│ customer.service.ts         │
│ Customers/CustomerDetail  │   │  useFinancialSummary,      │   │ employee.service.ts         │
│ Employees/EmployeeDetail  │   │  useAppointmentSummary…)   │   │ (map backend→frontend)      │
└───────────────────────────┘   └────────────────────────────┘   └──────────────┬──────────────┘
                                                                                 │ api (axios)
                                                                                 ▼
┌─ Controllers (PDV.Api) ────────────────────────────────────────────────────────────────────┐
│ ReportsController         [RequireModule(Reports)] [RequireEntitlement(AdvancedReports)]      │
│                           [RequirePermission(ViewReports)]  ← gate único p/ TODOS os endpoints│
│ CustomersController.GetCrmStats  [RequireEntitlement(InformativeCustomerData)]                │
│ EmployeesController.GetStats     [RequireModule(Employees)] [RequirePermission(ViewEmployees)]│
│                                  ⚠ SEM [RequireEntitlement] — ver §4 (📌)                     │
└──────────────────────────────────────────┬───────────────────────────────────────────────────┘
                                            ▼
┌─ Services (PDV.Infrastructure) ────────────────────────────────────────────────────────────┐
│ ReportService              → toda a página de Relatórios + widgets do Dashboard              │
│ CustomerService.GetCrmStatsAsync    → CustomerDetail                                          │
│ EmployeeService.GetPerformanceStatsAsync → EmployeeDetail                                     │
│        └──── todos usam ────▶  PDV.Application/Helpers/SaleFinancials.cs  (fonte única)        │
└──────────────────────────────────────────┬───────────────────────────────────────────────────┘
                                            ▼
┌─ Entidades EF Core (AppDbContext) ──────────────────────────────────────────────────────────┐
│ Sale · SaleItem · Expense · Appointment · AppointmentServiceItem · Product · Service ·        │
│ Customer · Employee                                                                            │
│  Filtro global: Sale e Expense → só TenantId (sem IsActive); as demais → TenantId && IsActive │
└───────────────────────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Fonte única da matemática de lucro — `SaleFinancials`

```csharp
// Itens "contáveis" = serviços (custo zero legítimo) OU produtos com PurchasePriceSnapshot.
// countedSubtotal/countedCost somam só esses itens; itemsTotal soma TODOS os itens da venda.
countedRevenue = itemsTotal > 0
    ? countedSubtotal − discount × (countedSubtotal / itemsTotal)   // desconto rateado pelo peso
    : countedSubtotal
grossProfit    = countedRevenue − countedCost
Compute(...)  → (Revenue: Sale.Total inteiro, Cost: countedCost, Fees: FeeAmount, GrossProfit)

NetItemRevenue(itemSubtotal, saleDiscount, saleItemsTotal)          // receita de UM item,
    = itemSubtotal − saleDiscount × (itemSubtotal / saleItemsTotal) // desconto rateado por item
```

Duas decisões de design válidas em toda a aplicação:
- `Revenue` devolvido é `Sale.Total` **inteiro** (todos os itens, pós-desconto) — mesma base do KPI
  "Receita total". Já `GrossProfit` usa só a fatia dos itens **contáveis**. É intencional (receita
  nunca esconde uma venda; lucro só onde há custo conhecido) e é a origem da Falha de base mista (§4).
- `NetItemRevenue` rateia o desconto proporcionalmente ao peso do item sobre **todos** os itens da
  venda — somar os itens sempre fecha com `Sale.Total`. É a fórmula dos rankings.

**Consumidores de `SaleFinancials`:** `GetFinancialSummaryAsync`, `GetTopProductsAsync`,
`GetRevenueByTypeAsync`, `ExportBillingCsvAsync`, `ExportBillingForTenantAsync` e
`CustomerService.GetCrmStatsAsync`.

### 2.3 Igualdades fundamentais da venda (`SaleService.CreateAsync`)

```
SaleItem.Subtotal = UnitPrice × Quantity           ← POR ITEM, PRÉ-DESCONTO
itemsTotal        = Σ SaleItem.Subtotal
Sale.Discount     = clamp(request.Discount, 0, itemsTotal)   ← desconto no NÍVEL DA VENDA
Sale.Total        = itemsTotal − Discount            ← PÓS-DESCONTO
Sale.FeeAmount    = round(Total × FeeRate/100)       ← taxa sobre o Total pós-desconto
Sale.NetAmount    = Total − FeeAmount
```

O desconto vive **só** em `Sale.Discount` (nunca por item). `ProductName`/`ServiceName`/
`OperatorName`/`CustomerName`/`EmployeeName` gravados nas vendas/agendamentos são **snapshots** do
momento — agrupar por eles (em vez do Id) fragmenta o histórico se o nome mudar (§4).

### 2.4 Receita de agendamento — duas fontes distintas ⚠

`AppointmentService` grava **dois** valores independentes:
- **`Appointment.Price`** = `request.Price` (valor total enviado pela UI). O `NewAppointmentModal`
  pré-preenche esse campo com a soma dos preços dos serviços escolhidos, **mas o usuário pode
  editá-lo manualmente** (flag `priceTouched`) — então pode divergir da soma dos itens.
- **`AppointmentServiceItem.Price`** = `service.Price` do catálogo, por serviço (snapshot).

O módulo de relatórios usa **as duas bases em gráficos diferentes da mesma seção** → origem da
**Falha nova #5** (§4).

---

## 3. Catálogo completo de gráficos

Legenda de veredito: ✅ correto · ⚠️ correto com ressalva · 🔴 incorreto/enganoso.
Todos os endpoints abaixo estão sob `GET /api/reports/...` salvo indicação.

### 3.1 Relatórios › seção **Vendas**

| # | Gráfico / KPI | Endpoint | Entidade · propriedades | Cálculo | Veredito |
|---|---|---|---|---|---|
| 1 | KPI **Receita total** | `sales` | `Sale.Total, Status, CreatedAt` | `Σ Total WHERE Active` | ✅ pós-desconto |
| 2 | KPI **Total de vendas** | `sales` | `Sale.Status, CreatedAt` | `COUNT WHERE Active` | ✅ |
| 3 | KPI **Ticket médio** | `sales` | idem | `totalRevenue / totalSales` (0 se 0) | ✅ |
| 4 | KPI **Margem de lucro média** | `financial-summary` (agregado no frontend) | `revenue, netResult` por bucket | `(Σ netResult / Σ revenue) × 100` | ⚠️ base mista (Falha #1); **único KPI sem tooltip** |
| 5 | **SalesCompositionChart** ("Composição do resultado") | `financial-summary` | `FinancialSummaryPoint.{cost,fees,expenses,netResult}` ← `SaleItem.PurchasePriceSnapshot·Qty`, `Sale.FeeAmount`, `Expense.Amount`, desconto rateado | barras empilhadas `cost+fees+expenses+netResult` | ⚠️ altura da barra = `GrossProfit+Cost` = receita **só** dos itens contáveis; ≤ receita real quando há produto sem custo. Documentado no tooltip |
| 6 | **SalesCompositionDonut** ("Composição do período") | `financial-summary` | idem, somado no período | mesma composição, em % | ⚠️ idem, documentado no tooltip |
| 7 | **FinancialBarChart** ("Receita × Lucro líquido") | `financial-summary` | `revenue`, `netResult` | 2 barras por bucket | ⚠️ barras em bases diferentes (uma toda a receita, outra só a margem dos itens com custo) — subtítulo avisa |
| 8 | **AccumulatedProfitChart** ("Lucro acumulado") | `financial-summary` | `netResult` | soma cumulativa no frontend | ✅ herda a base de `netResult` |
| 9 | **RevenueLineChart** ("Receita ao longo do tempo") | `financial-summary` (atual + período anterior) | `revenue` | série atual × anterior, alinhada por posição de bucket, `null` no padding | ✅ |
| 10 | **PaymentMethodPieChart** ("Vendas por forma de pagamento") | `sales/by-payment-method` | `Sale.PaymentMethod, Total` | `Σ Total` por método (Active) | ✅ pós-desconto |
| 11 | **RevenueByTypeDonut** ("Serviços vs Produtos") | `revenue-by-type` | `SaleItem.ServiceId, Subtotal`, `Sale.Discount` | `Σ NetItemRevenue` por `ServiceId null/≠null` | ✅ soma fecha com "Receita total" |
| 12 | **TopProductsChart** ("Top produtos vendidos") | `products/top` | `SaleItem.{ProductName,Quantity,Subtotal}` (`ProductId≠null`), `Sale.Discount` | `Σ NetItemRevenue`, `Σ Qty`; **agrupado por `ProductName`** | ⚠️ desconto rateado ok, mas agrupa por nome (Falha #3) |

### 3.2 Relatórios › seção **Funcionário**

| # | Gráfico | Origem | Entidade · propriedades | Cálculo | Veredito |
|---|---|---|---|---|---|
| 13 | **EmployeeListGrid** ("Funcionários") | `useEmployees` (módulo **Employees**) | `Employee.{Name, RoleName, Salary, IsActive}` | lista ativos, ordena por nome | ✅ (é lista, não cálculo); ⚠️ depende de outro módulo — Falha #6 |
| 14 | **OperatorRankingChart** ("Ranking por operador") | `sales/by-operator` | `Sale.{OperatorId, OperatorName, Total, Status}` | `Σ Total` + `COUNT`, agrupado por `{OperatorId, OperatorName}` | ⚠️ pós-desconto ok; agrupa por par c/ nome-snapshot (Falha #6) |

### 3.3 Relatórios › seção **Agendamentos** (nova)

**Endpoints:** `appointments/summary` (série), `appointments/by-category`, `appointments/top-services`,
`appointments/by-employee`, `appointments/peak-hours`. **Entidades:** `Appointment`,
`AppointmentServiceItem`, `Service.Category`.

| # | Gráfico | Endpoint | Entidade · propriedades | Cálculo | Veredito |
|---|---|---|---|---|---|
| 15 | **AppointmentsOverTimeChart** ("Agendamentos ao longo do tempo") | `summary` | `Appointment.{Start, Status}` | por bucket: `total=COUNT`, `completed`, `cancelled` | ✅ |
| 16 | **AppointmentStatusDonut** ("Agendamentos por status") | `summary` | idem | soma `completed+cancelled+inProgress+pending`; `pending = Pendente∪Confirmado` | ✅ cobre os 5 status → soma = Total |
| 17 | **AppointmentRevenueChart** ("Receita de agendamentos") | `summary` | **`Appointment.Price`**, `Status` | barra `revenueRealized = Σ Price WHERE Concluído`; linha `revenueTotal = Σ Price (todos)` | 🔴 base `Appointment.Price` diverge de #18/#19 (Falha #5); linha inclui cancelados (Falha #4-baixa) |
| 18 | **ServiceCategoryDonut** ("Categorias de serviço") | `by-category` | **`AppointmentServiceItem.Price`** (só `Concluído`), `Service.Category.{Name,Color}` | `Σ Price` por categoria | ✅ internamente; ⚠️ base ≠ #17 (Falha #5) |
| 19 | **TopServicesRanking** ("Top serviços") | `top-services` | `AppointmentServiceItem.{ServiceId,ServiceName,Price}`, `Appointment.Status` | agrupa por **`ServiceId`**; `count = não-cancelados`; `revenue = Σ Price WHERE Concluído` | ✅ por Id; ⚠️ count e revenue em filtros diferentes; base ≠ #17 |
| 20 | **EmployeeAppointmentsRanking** ("Agendamentos por funcionário") | `by-employee` | **`Appointment.{EmployeeId,EmployeeName,Price,Status}`** | agrupa por `{EmployeeId, EmployeeName}`; `count = não-cancelados`; `revenue = Σ Price WHERE Concluído` | ⚠️ agrupa por par c/ nome-snapshot (Falha #6); base `Appointment.Price` (Falha #5) |
| 21 | **PeakHoursChart** ("Horário de pico") | `peak-hours` | `Appointment.Start.Hour, Status` | `COUNT` por hora (0–23), só não-cancelados | ✅ (fuso UTC — Falha #2) |

### 3.4 Relatórios › seção **Clientes** (nova)

| # | Gráfico | Origem | Entidade · propriedades | Cálculo | Veredito |
|---|---|---|---|---|---|
| 22 | **CustomersListPanel** ("Clientes cadastrados") | `useCustomers` (módulo **Customers**) | `Customer.Name` | lista simples | ✅ (lista); ⚠️ depende de outro módulo — Falha #6 |
| 23 | **TopCustomersRanking** ("Top clientes por receita") | `customers/top` | `Sale.{CustomerId, Total}`, `Customer.Name` | `Σ Total` + `COUNT`, agrupado por **`CustomerId`** (só `CustomerId≠null`, Active) | ✅ por Id; balcão anônimo fica fora (documentado) |

### 3.5 **Dashboard**

**KPIs do topo** (`Dashboard/index.tsx`):

| # | KPI | Fonte | Cálculo | Veredito |
|---|---|---|---|---|
| 24 | **Faturamento** | `useSalesMetrics` | `totalRevenue` | ✅ |
| 25 | **Estoque baixo / crítico** | `useProducts` | `count(stock ≤ minStock)` / `≤ criticalStock` (atrás de `advancedExpenses`) | ✅ |
| 26 | **Despesas** | `useExpensesByCategory` | `Σ total` no frontend | ⚠️ competência (Falha #14) |
| 27 | **Lucro estimado** | `useFinancialSummary` | `Σ netResult` por bucket | ✅ mesma definição de Relatórios (comentário explícito no código) |

**AnalyticsDashboard** (feature Pro `advancedDashboard`):

| # | Componente | Fonte | Cálculo | Veredito |
|---|---|---|---|---|
| 28 | **RevenueAreaChart** ("Faturamento") | `useFinancialSummary` (N dias, `day`) | série `revenue` + série **"Lucro" = `grossProfit`** | ⚠️ "Lucro" aqui é lucro **bruto** (sem taxas/despesas), ≠ KPI "Lucro estimado" (`netResult`) na mesma tela (Falha #4) |
| 29 | **PaymentMethodsDonut** | `useSalesByPaymentMethod` | `Σ Total` por método **habilitado no tenant** | ✅ |
| 30 | **TopProductsRanking** | `useTopProducts` (mês corrente, top 5) | idem `GetTopProductsAsync` | ⚠️ herda Falha #3 (por nome); ignora o seletor de dias e sempre mostra o mês corrente |
| 31 | **RecentSalesTable** ("Últimas vendas") | `useSales` (client-side) | filtra `createdAt` = "hoje" com `dayjs` local | ⚠️ "hoje" local × `createdAt` UTC (Falha #2) |

| # | Superfície | Fonte | Cálculo | Veredito |
|---|---|---|---|---|
| 32 | **EssentialDashboard** — "Faturamento em <mês>" | `useSales` (client-side) | `Σ Total` de vendas ativas do mês corrente | ✅ matemática independente, não toca `ReportService` |

*(Widgets não-analíticos do Dashboard — `StockAlertsCard`, `PendingBillsCard`, `ActiveTeamCard`,
`EmployeeDashboard` — são listas/atalhos sem cálculo estatístico e ficam fora deste catálogo.)*

### 3.6 **CustomerDetail** — `GET /customers/{id}/stats` (`GetCrmStatsAsync`)

Entitlement `InformativeCustomerData`. Entidades: `Sale`+`SaleItem` (+`Product.Category`),
`Appointment`+`AppointmentServiceItem`, `Service.Category`.

| # | Stat | Entidade · propriedades | Cálculo | Veredito |
|---|---|---|---|---|
| 33 | Total gasto | `Sale.Total` (Active) | `Σ Total` | ✅ (serviço é cobrado via `Sale` no caixa → já incluso) |
| 34 | Compras realizadas | `Sale` (Active) | `COUNT` | ✅ |
| 35 | Ticket médio | — | `totalSpent / totalSales` | ✅ |
| 36 | Última compra | `Sale.CreatedAt` | `MAX` (1ª da lista desc) | ✅ |
| 37 | Forma preferida | `Sale.PaymentMethod` | moda por contagem | ⚠️ empate → arbitrário |
| 38 | Top produtos comprados | `SaleItem.{ProductId,ProductName,Quantity,Subtotal}` (`ProductId≠null`), `Sale.Discount` | `Σ Qty`, `Σ NetItemRevenue`; agrupado por **`ProductId`**; top 10 por Qty | ✅ por Id, desconto rateado |
| 39 | Categorias de produto | mesmas linhas, `Product.Category.{Name,Color}` | `Σ NetSpent` por categoria | ✅ pós-desconto |
| 40 | Linha do tempo de gastos | `Sale.Total, CreatedAt` | `Σ Total` por mês (12m, nunca antes da 1ª compra) | ✅ |
| 41 | Categorias de serviço | `AppointmentServiceItem.Price` (só `Concluído`), `Service.Category` | `Σ Price` por categoria | ✅ só consumo real |
| 42 | Atendimentos (Total/Concluído/Cancelado/EmAtend.) | `Appointment.Status` | contagens | ⚠️ `InProgress` calculado mas a UI só mostra Total/Concluídos/Cancelados |
| 43 | Próximo agendamento | `Appointment.{Start,Status}` | menor `Start > now & ≠ Cancelado` | ✅ |
| 44 | Top serviços | `AppointmentServiceItem.ServiceName`, `Appointment.Status` | `COUNT` agrupado por **`ServiceName`**; top 5; **inclui todos os status** | ⚠️ agrupa por nome (Falha #3) e conta cancelados/futuros — filtro ≠ "Categorias de serviço" |
| 45 | Vendas recentes | `Sale.{Id,Items,PaymentMethod,Total,CreatedAt}` | 10 últimas | ✅ (lista) |

### 3.7 **EmployeeDetail** — `GET /employees/{id}/stats` (`GetPerformanceStatsAsync`)

Atribuição: `Sale.OperatorId == Employee.UserId`; `Appointment.EmployeeId == id`.

| # | Stat | Entidade · propriedades | Cálculo | Veredito |
|---|---|---|---|---|
| 46 | Vendas no mês | `Sale.{Total,CreatedAt,OperatorId,Status}` (Active, mês corrente UTC) | `Σ Total` | ✅ pós-desconto |
| 47 | Ticket médio no mês | frontend | `salesThisMonth / salesCountThisMonth` | ✅ |
| 48 | Agendamentos no mês | `Appointment.{Start,EmployeeId}` no mês | `COUNT` (todos os status) | ⚠️ inclui futuros/cancelados |
| 49 | Taxa de cancelamento | `EmployeeCancellationDto(monthCancelled, monthTotal, totalCancelled, total)` | `cancelled/total × 100`, toggle Mês↔Total | ✅ "Total" é `COUNT` histórico (sem janela) |
| 50 | Salário × Receita | `Employee.Salary`, `salesThisMonth` | `net = receita − salário` | ✅ rótulo avisa "não considera comissões/outros custos" |
| 51 | Vendas no caixa (série) | `dailySales[]` (365d esparso) | bucketizado no frontend (`analytics.ts`, 7d/30d diário · 3m semanal · 6m/12m mensal) | ⚠️ eixo ancorado em "hoje" **local**; datas UTC (Falha #2) |
| 52 | Agendamentos por status (série) | `dailyAppointments[]` | idem | ⚠️ idem |

---

## 4. Falhas e bugs encontrados

### 🟡 Média

**#1 — Margem/composição em base mista (residual, by design).**
`GrossProfit`/`NetResult` contam receita e custo **só** dos itens contáveis (serviços + produtos com
custo cadastrado); produtos sem custo entram em `Revenue` (KPI "Receita total") mas não no
`GrossProfit`. Intencional (não fingir margem 100% em produto sem custo), mas faz a "Margem de lucro
média" e a composição **subestimarem** a margem quanto mais produtos sem custo o tenant tiver. Está
documentado nos tooltips de #5/#6/#7, **mas não no KPI "Margem de lucro média"** (§3.1 #4) — que é o
número mais visível e é o **único KPI da página sem `tooltip`**, apesar de `PageKpiCard` suportar a
prop (`components/PageKpiCard/types.ts:16`).
**Correção:** passar `tooltip` para o KPI de margem com o mesmo texto dos gráficos; opcionalmente
expor quantos produtos vendidos no período estão sem custo cadastrado (a causa raiz).

**#2 — Fuso horário UTC sistêmico.**
`Sale.CreatedAt`, `Expense.DueDate`, `Appointment.Start` e os buckets diários usam UTC no backend
sem conversão (comentários explícitos em `ReportService.GetFinancialSummaryAsync` e
`GetAppointmentSummaryAsync`). O frontend usa `dayjs()` **local** em ao menos três pontos:
`EmployeeDetail/analytics.ts` (eixo), o filtro "vendas de hoje" do `AnalyticsDashboard` e
`RecentSalesTable`. Para tenant BR (UTC−3), vendas/agendamentos perto da meia-noite podem cair no
dia/bucket vizinho, e duas partes da mesma tela podem discordar sobre "hoje". **Sistêmico** (toca
todo o app) — pede solução única (timezone do tenant, convertido na borda). Adiado de propósito.

**#3 — Agrupamento por nome, não por Id (parcial).**
Ainda por **nome** em dois lugares: `ReportService.GetTopProductsAsync` (agrupa por `ProductName`;
alimenta o #12 de Relatórios e o #30 do Dashboard) e o "Top serviços" do cliente
(`CustomerService.GetCrmStatsAsync`, agrupa por `ServiceName`, §3.6 #44). Produtos/serviços
homônimos se fundem; um item renomeado divide o histórico entre snapshots.
> Já corrigidos (agrupam por Id) nesta revisão: `GetTopServicesAsync` (#19), `GetTopCustomersAsync`
> (#23) e "Top produtos comprados" do cliente (#38).
**Correção:** agrupar por `ProductId`/`ServiceId` e rotular com o nome mais recente — padrão já
aplicado nos três acima.

**#4 — "Lucro" do Dashboard analítico usa base diferente do KPI "Lucro estimado".**
Na mesma tela (`advancedDashboard`), o KPI "Lucro estimado" é `Σ netResult` (receita − custo − taxas
− despesas), mas a série "Lucro" do `RevenueAreaChart` (#28) é `Σ grossProfit` (receita dos itens
contáveis − custo, **sem** taxas nem despesas) — estruturalmente maior. Dois valores chamados
"lucro" a poucos pixels um do outro. A recomendação da 3ª revisão (renomear para "Lucro bruto")
**não foi aplicada**.
**Correção:** renomear a série de `RevenueAreaChart` para "Lucro bruto" (ecoando a distinção que
`FinancialBarChart` já faz entre bruto implícito e "Lucro líquido").

**#5 (novo) — Receita de agendamentos em duas bases diferentes na mesma seção.**
Na seção **Agendamentos**, a "Receita de agendamentos" (#17) e "Agendamentos por funcionário" (#20)
somam **`Appointment.Price`** (valor total do agendamento, que o usuário **pode editar
manualmente** no `NewAppointmentModal` — ver §2.4), enquanto "Categorias de serviço" (#18) e "Top
serviços" (#19) somam **`Σ AppointmentServiceItem.Price`** (preços do catálogo, snapshot). Para o
mesmo conjunto de atendimentos concluídos, a "receita realizada" do gráfico #17 **pode não bater**
com a soma das fatias do donut #18 sempre que algum `Appointment.Price` tiver sido ajustado à mão
(pacote, desconto, arredondamento). É a mesma família da Falha de base mista (#1), reintroduzida no
módulo de agendamentos.
**Correção:** escolher **uma** base para a receita de agendamentos concluídos e usá-la nos quatro
gráficos — preferencialmente `Σ AppointmentServiceItem.Price` (rastreável por serviço/categoria) ou,
se `Appointment.Price` for a fonte de verdade comercial, ratear proporcionalmente entre os itens
(como já se faz com o desconto de venda em `NetItemRevenue`). Documentar a decisão no tooltip.

### ⚪ Baixa

**#6 (parcial novo) — Snapshot de nome / dependência de módulo em Relatórios.**
(a) `GetSalesByOperatorAsync` (#14) e `GetAppointmentsByEmployeeAsync` (#20) agrupam por par
`{Id, Nome-snapshot}` — como não há hoje fluxo de renomear operador/funcionário aplicado às vendas
antigas, não fragmenta na prática, mas viraria bug se um dia existir. (b) `EmployeeListGrid` (#13) e
`CustomersListPanel` (#22) vivem dentro da página de Relatórios mas buscam via `useEmployees`/
`useCustomers`, gateados pelos módulos **Employees**/**Customers** — um tenant com Relatórios mas
sem esses módulos vê os painéis **vazios**.
**Correção:** (a) agrupar só por Id, rótulo pelo nome vivo; (b) decidir se essas listas deveriam vir
de um endpoint de Relatórios (coerente com o gate da página) ou aceitar a dependência e documentá-la.

**#7 (novo) — Tratamento de cancelados inconsistente nos gráficos de agendamento.**
Na seção Agendamentos, "cancelado" é tratado de formas diferentes: a série "Total" (#15) e a linha
"Receita total agendada" (#17) **incluem** cancelados; já `PeakHours` (#21), o `count` de "Top
serviços" (#19) e o de "Agendamentos por funcionário" (#20) **excluem**. Cada gráfico documenta o
próprio critério no tooltip, mas o conjunto pode confundir (a "receita total agendada" sobe com
agendamentos que foram cancelados).
**Correção:** padronizar — ou excluir cancelados de toda métrica de "demanda/receita agendada", ou
deixar explícito no rótulo quando os cancelados entram.

**#8 — `cancelledCount` nunca exibido.** Calculado em `GetSalesMetricsAsync`, trafegado em
`SalesMetricsResponse`/`SalesMetrics` e mapeado no frontend, **sem card em nenhuma UI** (confirmado
por busca). **Correção:** exibir (sinal de saúde operacional) ou remover do payload.

**#9 — Competência inclui despesas não pagas.** `Expense` entra nos relatórios por `DueDate`, não
`PaidAt` (regime de competência, consistente com `ExpenseService`), mas surpreende quem espera
caixa. **Correção:** documentar via tooltip ou oferecer alternância competência × caixa.

**#10 — `GET /reports/stock` (JSON) sem consumidor.** `ReportService.GetStockSnapshotAsync` e o
endpoint existem, mas nenhum hook/serviço do frontend o chama (só a irmã `/reports/stock/export`,
CSV, é usada). Código morto de baixo risco. **Correção:** remover ou dar uma UI a ele.

### 📌 Fora do escopo matemático

**Gate de plano ausente em `EmployeesController.GetStats`.**
As estatísticas de cliente e o módulo de relatórios são Pro e **reforçados no backend**
(`ReportsController` tem `[RequireEntitlement(AdvancedReports)]`; `CustomersController.GetCrmStats`
tem `[RequireEntitlement(InformativeCustomerData)]`). Já `EmployeesController.GetStats`
(`GET /employees/{id}/stats`) tem só `[RequireModule(Employees)]` + `[RequirePermission(ViewEmployees)]`
— **não** tem `[RequireEntitlement(AdvancedEmployee)]`, apesar de o frontend usar
`FEATURES.advancedEmployee` para decidir se mostra os cards. Um tenant no plano Essencial pode
chamar a rota direto e receber o payload completo de performance que a UI esconde atrás do paywall.
**Correção:** adicionar `[RequireEntitlement(EntitlementCatalog.AdvancedEmployee)]` em `GetStats`,
no mesmo padrão dos outros dois controllers.

---

## Apêndice — arquivos-chave

| Camada | Arquivo |
|---|---|
| Backend — matemática de lucro | `backend/PDV.Application/Helpers/SaleFinancials.cs` |
| Backend — relatórios (inclui agendamentos) | `backend/PDV.Infrastructure/Services/ReportService.cs` |
| Backend — controller de relatórios | `backend/PDV.Api/Controllers/ReportsController.cs` |
| Backend — CRM cliente | `backend/PDV.Infrastructure/Services/CustomerService.cs` (`GetCrmStatsAsync`) |
| Backend — desempenho funcionário | `backend/PDV.Infrastructure/Services/EmployeeService.cs` (`GetPerformanceStatsAsync`) |
| Backend — controller de funcionários | `backend/PDV.Api/Controllers/EmployeesController.cs` |
| Backend — preço do agendamento | `backend/PDV.Infrastructure/Services/AppointmentService.cs` (`Appointment.Price` × `AppointmentServiceItem.Price`) |
| Frontend — Relatórios | `frontend/src/pages/Reports/index.tsx` + `components/` |
| Frontend — Dashboard | `frontend/src/pages/Dashboard/index.tsx` + `components/{AnalyticsDashboard,EssentialDashboard}/` |
| Frontend — Cliente | `frontend/src/pages/Customers/CustomerDetail/` |
| Frontend — Funcionário | `frontend/src/pages/Employees/EmployeeDetail/` (`components/analytics.ts`) |
| Frontend — hooks/tipos | `frontend/src/hooks/useReports.ts`, `frontend/src/types/report.types.ts` |
</content>
</invoke>
