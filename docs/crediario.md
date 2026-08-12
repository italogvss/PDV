# Crediário (venda fiado)

Módulo que permite vender sem receber no ato: a venda acontece normalmente e o saldo vira uma
**conta de crediário** parcelada, baixada aos poucos. É o primeiro lugar do sistema onde
"venda registrada" deixa de significar "dinheiro no caixa" — e é por isso que ele mexe com os
relatórios (§5).

Módulo `OperationModule.Credit` — **livre nos dois planos**. Só o painel analítico
(`creditDashboard`) e os lembretes de cobrança (`creditReminders`) são Pro.

---

## 1. Entidades

```
Sale ──1:1── CreditAccount ──1:N── CreditInstallment ──1:N── CreditPayment
```

| Entidade | Papel |
|---|---|
| `CreditAccount` | A dívida de uma venda. `TotalAmount` = valor **financiado** (`Sale.Total − DownPayment`); `PaidAmount` é denormalizado (Σ dos `CreditPayment`); `Balance` = `TotalAmount − PaidAmount` (`[NotMapped]` — em query use a expressão). |
| `CreditInstallment` | Uma parcela. Aceita baixa **parcial**: `PaidAmount` cresce e só vira `Paid` quando zera o saldo. |
| `CreditPayment` | Um recebimento. Carrega o método (`Method`) e a **taxa congelada** daquele método (`FeeRate`/`FeeAmount`). Estorno é **delete físico** (como `Expense`). |

Invariantes:
- A conta **nasce sempre de uma venda** (`SaleId` único) — nunca solta.
- Fiado exige **cliente identificado** (`CustomerId` obrigatório, ao contrário da venda).
- `DownPayment < Sale.Total` — entrada cobrindo tudo não deixa nada para financiar.
- Nenhuma das três entidades usa soft delete: o ciclo de vida é o `Status` próprio
  (`CreditAccountStatus` / `CreditInstallmentStatus`). `IsActive` nunca muda — mesmo tratamento de
  `Sale` e `Expense`, e é por isso que o `HasQueryFilter` delas é só por `TenantId`.

---

## 2. Ciclo de vida

```
        POST /api/credit/accounts
Sale ─────────────────────────────▶ CreditAccount (Open) + N CreditInstallment (Open)
                                          │
        POST /credit/installments/{id}/receive
                                          ├──▶ CreditPayment + saldo da parcela e da conta
                                          │      parcela zera → Paid;  conta zera → Paid + SettledAt
                                          │
        DELETE /credit/payments/{id}      ├──▶ estorno: apaga o pagamento e DEVOLVE o saldo,
                                          │      reabrindo parcela/conta que tinham quitado
                                          │
        PATCH /credit/accounts/{id}/cancel└──▶ Cancelled + CancelledAt; parcelas Open viram
                                                 Cancelled. Recebimentos feitos são preservados.
```

**Cancelar ≠ estornar.** Cancelar encerra a cobrança do que resta (calote, acordo); não devolve
nada. O saldo que ficou de pé vira **perda** no relatório, datada por `CancelledAt`.

**Estorno em conta cancelada é recusado** — mexeria no saldo de algo já baixado como perda.

**Cancelar a VENDA** de um crediário (`SaleService.CancelAsync`) exige que nenhum dinheiro tenha
entrado: nem baixa de parcela (`PaidAmount > 0`) nem **entrada** (`DownPayment > 0`). A entrada não
é um `CreditPayment`, então precisa ser checada à parte — sem isso a venda sumiria da receita com o
dinheiro dela no caixa.

A checagem **ignora o status da conta**. Como cancelar o crediário preserva os recebimentos, uma
conta cancelada com dinheiro recebido é justamente o caso a barrar; enquanto a guarda valia só para
conta viva, dava para cancelar a conta e depois a venda, deixando `CreditPayment` sem venda de
origem — e cada superfície de relatório resolvia esse órfão de um jeito. Consequência aceita: venda
fiado que recebeu qualquer valor **não é mais cancelável**, e nem deve ser (a venda aconteceu e o
dinheiro entrou). O que não foi cobrado sai como **perda** pelo cancelamento da conta.

---

## 3. Taxas — quem paga o quê, e quando

A taxa por forma de pagamento (`TenantSettings.Payment*Fee`) sai de `PaymentFees` (fonte única,
`PDV.Application/Helpers`), usada nos **dois** pontos em que a loja captura dinheiro:

| Momento | Base | Onde fica |
|---|---|---|
| Venda | `Sale.Total` | `Sale.FeeRate` / `FeeAmount` |
| Venda que **vira** crediário | **só a entrada** (`DownPayment`) — recalculado ao abrir a conta | `Sale.FeeRate` / `FeeAmount` |
| Baixa de parcela | valor recebido, pelo método da **baixa** | `CreditPayment.FeeRate` / `FeeAmount` |

O motivo: numa venda financiada, só a entrada passou pela maquininha. Quem paga a parcela escolhe o
método na hora — a taxa real do crediário **só é conhecível na baixa**. Cobrar a taxa do método da
venda sobre o total inteiro debitaria taxa de cartão de dinheiro que ninguém passou no cartão.

Consequência aceita: em **competência**, a taxa de uma venda fiado aparece incompleta até as baixas
acontecerem. Não há como ser diferente — a taxa futura depende de uma escolha que ainda não foi
feita. Ao fim do ciclo, os dois regimes somam a mesma taxa.

---

## 4. Recebido — o modelo de caixa

Uma venda entra no caixa em pedaços. O modelo canônico (usado por relatórios, KPIs e exportações):

| Situação | Quando entra | Quanto | Método |
|---|---|---|---|
| Venda sem crediário | `Sale.CreatedAt` | `Sale.Total` | `Sale.PaymentMethod` |
| Venda fiado — entrada | `Sale.CreatedAt` | `CreditAccount.DownPayment` | `Sale.PaymentMethod` |
| Venda fiado — parcela | `CreditPayment.ReceivedAt` | `CreditPayment.Amount` | `CreditPayment.Method` |

A **entrada não é um `CreditPayment`** — é paga no ato, com o método da venda, e por isso é datada
pela venda. Quem esquece disso subestima o recebido em toda venda com entrada.

`ReceivedAt` é escolhido pelo operador, mas fica preso entre a **abertura da conta** e **hoje**:
data futura sumiria do fechamento do dia; data anterior à conta mudaria um período já fechado.

---

## 5. Impacto nos relatórios — competência × caixa

Antes do crediário os dois regimes coincidiam e o módulo de relatórios só conhecia competência
(`Σ Sale.Total` na data da venda). Hoje a página de Relatórios tem um toggle **Regime**
(`basis=accrual|cash`) que governa **vendas e despesas** juntas:

- **Competência** — a venda inteira na data da venda; despesa no vencimento. Responde *"quanto eu
  vendi"*. É o padrão.
- **Caixa** — cada evento da tabela acima na sua data; despesa na data do pagamento. Responde
  *"quanto entrou"*.

A ponte entre os dois é `SaleFinancials.Recognize`: cada evento reconhece a fração
`recebido / Sale.Total` de **receita, custo e lucro bruto** da venda. Taxas nunca são rateadas —
cada uma entra na data do seu fato gerador. Somados todos os eventos de uma venda quitada, o caixa
fecha **exatamente** com a competência.

Outras superfícies afetadas:

| Superfície | Comportamento com fiado |
|---|---|
| KPIs de Vendas | "Receita total" segue competência; **"Recebido"** e **"A receber"** são novos e falam das vendas do período |
| Vendas por forma de pagamento | Competência: parte financiada na fatia **`Crediário`**, entrada no método da venda. Caixa: só o que entrou, cada baixa pelo método dela. `Credit` **não** é um `PaymentMethod` do enum — fiado é a ausência de pagamento, não uma forma |
| Seção **Crediário** dos Relatórios | Faturado / recebido / a receber / vencido / **perdas** / inadimplência + agenda de recebíveis (eixo = vencimento) + aging e maiores devedores |
| Top clientes | Ganhou "em aberto" — sem isso quem só leva fiado lidera o ranking de receita |
| CSVs (`vendas`, `faturamento`, `crediario`) | Colunas de crediário/recebido/a receber. Parcela **cancelada** sai com saldo **zero** — somar a coluna dá o recebível real |

A conta de aging/inadimplência é a mesma nos dois lugares (`CreditAnalytics`), mas servida por
endpoints diferentes: a tela de Crediário usa `/api/credit/*` (gate `creditDashboard`), a seção dos
Relatórios usa `/api/reports/credit/*` (gate `advancedReports`) — a página de Relatórios não pode
depender do módulo Crediário estar liberado para aquele usuário.

Detalhe gráfico a gráfico: [auditoria-matematica-relatorios.md](auditoria-matematica-relatorios.md).

---

## 6. Abrir crediário no PDV

A venda fiado nasce **numa chamada só**: `POST /api/sales` aceita um bloco opcional `credit`
(`InstallmentCount`, `FirstDueDate`, `DownPayment`, `Note`) e o `SaleService` chama
`CreditService.CreateForSaleAsync` **dentro da transação da venda**, depois do `SaveChanges` e antes
do commit. Se a abertura da conta falhar, o rollback leva junto a venda e a baixa de estoque — nunca
sobra uma venda "à vista" com a taxa cobrada sobre o total errado.

Como a rota é a de vendas, os atributos do `CreditController` não valem: o `SaleService` aplica os
gates à mão quando `request.Credit is not null` (`RequireModuleAsync(Credit)` +
`RequireAsync(ManageCredit)`). O validator exige `CustomerId` e proíbe `IsInstallment` (parcelamento
de cartão e carnê de crediário são coisas diferentes — §9 abaixo). Numa venda fiado, `PaymentMethod`
e `AmountPaid` descrevem só a **entrada**.

`POST /api/credit/accounts` continua existindo para abrir o crediário de uma venda já fechada.

**Política da loja** (`TenantSettings`, seção Pagamentos): `CreditMaxInstallments` (12) e
`CreditMinDownPaymentPercent` (0) são **limites**, validados dentro de `CreateForSaleAsync` — e não
no `SaleService` — para valer nos **dois** pontos de entrada. `CreditFirstDueDays` (30) é outra
coisa: um **padrão**, não um limite. Ele só preenche o campo "1º vencimento" da modal de
finalização; a data final é negociada com o cliente e o backend não a amarra ao prazo configurado.

O que o backend garante sobre o vencimento é só o piso: `FirstDueDate` **não pode ser anterior à
data da venda** (com um dia de folga de fuso), senão o carnê nasceria vencido e cairia direto no
aging, na inadimplência e nos lembretes.

Não há flag de "crediário ativo": quem decide isso é o módulo. Não há taxa de crediário: a taxa do
fiado é a do método da **baixa** (§3).

No frontend, a decisão vive na **modal de finalização** (`pages/Sales/components/FinalizationModal`):
tipo de venda À vista × Crediário, entrada + forma de pagamento da entrada, parcelas, primeiro
vencimento, observação e o **preview do carnê** — gerado por `utils/creditPlan.ts`, espelho de
`CreditInstallmentPlanner` (se divergirem, o preview vira mentira). A opção Crediário aparece com
`isModuleEnabled('credit') && hasPermission('ManageCredit')` — eixo de acesso, não de plano.

## 7. Limitações conhecidas

- **`PaymentMethod.Credit` não existe** e continua não existindo: fiado é a ausência de pagamento,
  não uma forma. Os relatórios derivam "é fiado" do join `Sale ↔ CreditAccount`, o que funciona
  retroativamente.
- **Sem juros nem multa por atraso.** `CreditAccount`, `CreditInstallment`, o planner, o aging e os
  relatórios assumem valor nominal. Incluir juros mexe em todos eles.
- **Fuso UTC** (Falha #2 da auditoria, sistêmica): `DueDate` é data pura, `ReceivedAt` vem do
  cliente e `Sale.CreatedAt` é UTC — os três caem no mesmo bucket sem normalização de fuso.
- **Perda não reverte a receita.** Um crediário cancelado mantém a venda `Active` e a receita
  contada em competência; a baixa aparece como "Perdas no período". Em caixa o dinheiro
  simplesmente nunca entra, que é o comportamento correto por construção.

---

## Arquivos-chave

| Camada | Arquivo |
|---|---|
| Entidades | `PDV.Domain/Entities/Credit{Account,Installment,Payment}.cs` |
| Regras | `PDV.Infrastructure/Services/CreditService.cs` |
| Venda fiado (transação única) | `PDV.Infrastructure/Services/SaleService.cs` (`CreateAsync`), `DTOs/Sales/CreateSaleRequest.cs` (`CreateSaleCreditRequest`) |
| Política da loja | `PDV.Domain/Entities/TenantSettings.cs` (`Credit*`), `DTOs/Tenants/TenantSettingsDtos.cs` (`CreditSettingsDto`) |
| Repositório | `PDV.Infrastructure/Repositories/CreditRepository.cs` |
| Reconhecimento competência × caixa | `PDV.Application/Helpers/SaleFinancials.cs` (`Recognize`) |
| Aging / inadimplência | `PDV.Application/Helpers/CreditAnalytics.cs` |
| Taxa por método | `PDV.Application/Helpers/PaymentFees.cs` |
| Mapeamento entidade → DTO | `PDV.Application/Helpers/CreditMapper.cs` |
| Plano de parcelas | `PDV.Application/Helpers/CreditInstallmentPlanner.cs` |
| API | `PDV.Api/Controllers/CreditController.cs`, `ReportsController.cs` (`credit/*`) |
| Frontend — tela | `frontend/src/pages/Credit/` |
| Frontend — venda fiado | `frontend/src/pages/Sales/components/FinalizationModal/`, `utils/creditPlan.ts` |
| Frontend — comprovante | `frontend/src/components/SaleReceipt/`, `utils/print.ts` |
| Frontend — relatórios | `frontend/src/pages/Reports/components/{CreditAgingPanel,ReceivableScheduleChart}.tsx` |
| Testes | `PDV.UnitTests/Flows/Credit/`, `PDV.UnitTests/Flows/Reports/` |
