# PDV.UnitTests

Testes unitários dos fluxos **críticos** do backend — não há meta de cobertura total. A pergunta que
define se algo entra aqui é: *se isto quebrar em silêncio, alguém perde dinheiro, perde dados ou vê
os dados de outra empresa?*

Stack: **NUnit 4** + **Moq**. Sem banco, sem rede, sem Docker — a suíte inteira roda em segundos.

## Como rodar

⚠️ **No host Windows a suíte não executa** — o Smart App Control bloqueia os DLLs compilados
localmente. Ver [Problema conhecido](#problema-conhecido-smart-app-control). Use o Docker:

```powershell
# da pasta /backend — container efêmero, código montado read-only, host intacto
docker run --rm -v "${PWD}:/src:ro" -w /work mcr.microsoft.com/dotnet/sdk:10.0 `
  bash -c "cp -r /src/. /work/ && cd /work && find . \( -name obj -o -name bin \) -prune -exec rm -rf {} + 2>/dev/null; dotnet test PDV.UnitTests/PDV.UnitTests.csproj"
```

O `cp` + remoção de `bin`/`obj` é necessário porque os artefatos do Windows carregam paths que
quebram no Linux. A suíte roda em ~3s depois do build.

Se um dia o Smart App Control for desligado, o caminho normal volta a valer:

```bash
dotnet test PDV.UnitTests/PDV.UnitTests.csproj
dotnet test --filter "FullyQualifiedName~Flows.Billing"     # um fluxo
dotnet test --filter "FullyQualifiedName~A3_"               # um cenário do doc
```

## Organização — por fluxo, não por classe

As pastas são **fluxos do usuário**, não espelhos da árvore de `Services/`. Um teste responde "o que
acontece quando o funcionário entra com a senha temporária", não "o método X retorna Y".

```
Flows/
├── Authentication/     login local/Google, refresh, troca de senha, resolução de loja+papel
├── AccessControl/      permissão de cargo (403) e entitlement de plano (402)
├── AccountDeletion/    pedido de encerramento (LGPD) e reversão durante a carência
├── Billing/            checkout, troca de plano, cancelamento/estorno e pipeline de webhook
└── Onboarding/         criação da 1ª loja + trial PDV-side; encerramento de uma loja
Support/
├── Builders/           object mothers (User, Subscription, Plan)
├── Harness/            monta cada SUT com os mocks (os services têm 4–12 dependências)
├── TestConfig.cs       IConfiguration real, in-memory (JWT_SECRET)
└── JwtProbe.cs         lê os claims do access_token emitido
```

### Nomes amarrados à documentação

Os docs já trazem matrizes de cenários numeradas. O prefixo do teste é o **ID do cenário** — quando
um teste quebra, você vai direto na linha da tabela que explica a regra:

| Prefixo | Origem |
|---|---|
| `A1`–`A7`, `L1`, `T5` | [docs/account-deletion.md](../../docs/account-deletion.md) §14 |
| `T4`, `X3`, `D7`, `RF10` | [docs/subscriptions.md](../../docs/subscriptions.md) §12 |
| `Scenario1`–`Scenario14` | [docs/auth.md](../../docs/auth.md) §14 |

Cenários sem ID no doc ficam sem prefixo. Nome do método em inglês (convenção do projeto: código em
inglês), comentário em português explicando **por que a regra existe** — o "o quê" o nome já diz.

## Decisões

- **Harness por service.** Os primary constructors têm 4 a 12 dependências; construir o SUT inline
  faria o arrange engolir a intenção do teste.
- **`IConfiguration` e os validators são REAIS, não mocks.** O `AuthService` lê `JWT_SECRET` pelo
  indexer, e mockar `ChangePasswordRequestValidator` faria os testes de política de senha passarem
  sem exercitar regra nenhuma.
- **Asserção no token emitido, não no estado interno.** `JwtProbe` lê os claims do access_token: é o
  contrato real entre backend e sessão, e prova que tenant/papel foram resolvidos certo.
- **BCrypt roda de verdade.** O `AuthService` chama `BCryptNet.Verify` estático. O hash é gerado uma
  vez por execução (`Lazy` no `UserBuilder`) para não pagar ~100ms por teste.
- **Datas com tolerância.** Os services chamam `DateTime.UtcNow` direto (não há `TimeProvider`
  injetado), então asserções de data usam `.Within(...)`.

## O que está coberto

| Fluxo | Foco |
|---|---|
| **Login local** | mensagem genérica nos 4 caminhos de falha (não vaza se o usuário existe); refresh gravado só como hash SHA256; claim `mustChangePassword` no 1º acesso |
| **Login Google** | conta achada **só** por `ExternalAuth` — e-mail coincidente **não** sequestra conta local (account takeover); Owner novo nasce sem tenant |
| **Refresh** | rotação single-use (o token anterior morre); lookup pelo hash, nunca pelo raw; claim `mustChangePassword` sobrevive à rotação; logout mata o refresh |
| **Resolução de loja** | papel vem do `UserTenant` da loja ativa, **nunca** de `User.Role`; Admin resolve antes do caminho "sem tenant"; `switch-tenant` para loja não vinculada é recusado |
| **Permissão** | Owner/Admin bypassam; semântica OR; papel desconhecido cai no caminho restritivo (falha fechada) |
| **Entitlement** | sem assinatura = **402** (não existe tier free); `Active` com período vencido perde acesso sem esperar o job; `Canceled` dentro do período **mantém**; comparação case-insensitive; limites |
| **Exclusão de conta** | carência de 30d; Path B só com período vigente; dentro de 7d emite estorno; `RefundRequested` bloqueia; flags do User gravadas **antes** do agendamento das lojas; reversão limpa os 3 sinais |
| **Troca de plano** (`PlanChange`) | P1–P4; `-1` (ilimitado) é o **maior** valor, não o menor; a ordem do enum `BillingPeriod` é contrato; encurtar ciclo agenda mas **não** lista perdas |
| **Webhook** (`BillingWebhookService`) | R8 (evento atrasado descartado); R1/X5 (renovar não reabre a janela de 7d); P9 (promoção do plano agendado); R4 (retentativa não duplica linha); X7×X8 (estorno derruba ou não o acesso); período vem das **linhas da fatura** |
| **Checkout** (`SubscriptionService`) | C5/T7 (ativo e vigente não contrata de novo); C6 (estorno em trânsito bloqueia); C3 (reativação cancela a recorrência antiga e reusa a MESMA linha); metadata de correlação; RF-18 (backfill de CPF/telefone) |
| **Troca pelo app** | P1 (upgrade cobra proporcional agora); P2 (agendado não cobra e **não** promove o plano); P5 (upgrade libera o schedule **antes**); P6/P7/P8; P12 (trial troca sem gateway); preview não executa nada |
| **Cancelamento** | X1 (≤7d emite estorno de **todas** as cobranças desde `StartedAt`); X3/X4 (>7d preserva o período); X5×X6 (a janela conta de `StartedAt`); RF-38 (gateway antes do estado local); estorno que falha **não** desfaz o cancelamento |
| **Trial** (`TenantService`) | T1 (30d, gateway intocado, `Provider` vazio); T2 (uma vez por usuário; assinatura viva não ganha trial por cima); T3 (sem slug/slug inválido **não** quebra o onboarding); 1ª loja nunca barrada por limite |
| **Encerrar loja** | cenário 13/E1: 90 dias (não 30), troca o tenant ativo e reemite o token, User e outras lojas intactos, única loja ativa é recusada, só o Owner encerra |

## O que NÃO está coberto (e por quê)

- **`DataDeletionService` (strip/purge)** — o motor destrutivo de verdade. Injeta `AppDbContext`
  concreto, e todo o valor dele está em **ordem de FK, cascade e legal-hold**. Mock não verifica nada
  disso; testar com mock daria uma falsa sensação de segurança. Exige teste de integração com MySQL
  real (Testcontainers), rodando as migrations.
- **`DataRetentionRepository.SyncScheduledDeletionAsync`** — mesma razão (cenários A8, D1–D5).
- **Middlewares** (`AccountDeletionBlockMiddleware` 423, `MustChangePasswordMiddleware` 403) — exigem
  `WebApplicationFactory`.
- **`RunOnceAsync` dos background services** — são `private` e o `try/catch` engole exceções; a
  lógica de elegibilidade precisaria ser extraída para um service antes de virar testável.

## Problema conhecido: Smart App Control

Neste Windows a suíte **não executa**, com a mensagem enganosa:

```
No test is available in PDV.UnitTests.dll.
NUnit failed to load ...\PDV.UnitTests.dll
```

A causa **não é o projeto de testes**. O **Smart App Control** está em modo enforce
(`HKLM:\SYSTEM\CurrentControlSet\Control\CI\Policy` → `VerifiedAndReputablePolicyState = 1`) e
bloqueia DLLs compilados localmente, que não são assinados nem têm reputação. O Event Log confirma:

```powershell
Get-WinEvent -FilterHashtable @{LogName='Microsoft-Windows-CodeIntegrity/Operational'} -MaxEvents 5
# Event 3077: dotnet.exe attempted to load PDV.Infrastructure.dll
#             that did not meet the Enterprise signing level requirements
# Event 3118: Smart App Control Block Details
```

O `dotnet build` passa (não carrega o DLL); só o **load em runtime** é barrado. Isso atinge qualquer
`dotnet test`/`dotnet run` no host — passa despercebido porque a stack roda em Docker.

Saídas possíveis:

1. **Desativar o Smart App Control** — Segurança do Windows → Controle de aplicativo e navegador →
   Smart App Control → Desativado. **Irreversível**: religar exige reinstalar o Windows. Resolve todo
   o desenvolvimento .NET local (testes, debug, `dotnet run`).
2. **Rodar em container** — `dotnet test` numa imagem `mcr.microsoft.com/dotnet/sdk:10.0`, alinhado
   com a stack atual. Não mexe na segurança da máquina; em compensação não dá para depurar teste no
   VSCode.

> Histórico: os testes deste projeto rodam normalmente **no container** (`Failed: 0, Passed: 174`).
> No host, passaram nas primeiras execuções e pararam quando o Windows reavaliou os binários
> recém-compilados. Não é regressão do projeto — é política do sistema operacional.

## Estes testes pegam bugs de verdade?

Sim — verificado por **mutação**, não por fé. Doze defeitos foram plantados de propósito no código
de produção e os testes mataram todos:

| Defeito plantado | Quem pegou |
|---|---|
| `Shrinks` sem tratar `-1` como "maior que tudo" | `Limit_FromUnlimitedToFinite`, `Limit_FromFiniteToUnlimited`, `P1` |
| `ShortensBillingCycle` com a comparação invertida | `P3_MonthlyToAnnual`, `P4_AnnualToMonthly` (×2) |
| `StartedAt = evt.EventCreatedAt` (sem `??=`) — reabriria a janela de reembolso a cada renovação | `R1_Renewal_PreservesStartedAt` |
| `IsStale` sempre `false` — webhook atrasado reescreveria o estado | `R8_EventOlderThanLastApplied` |
| `Payment.PeriodEnd` lido da assinatura em vez das linhas da fatura | `InvoicePaid_TakesPeriodFromTheInvoiceLines` |
| `RevokesAccess` ignorando `ReversedInFull` — estorno parcial derrubaria o acesso | `PartialRefund_DoesNotRevokeAccess` |
| `EnsureCanCheckout` desligado — cobrança dupla | `C5` (×2), `T7_TrialingAndEntitled` |
| Reativação sem `DiscardGatewaySubscriptionAsync` — duas recorrências vivas | `C3_Reactivation_CancelsThePrevious`, `Reactivation_DiscardsAnyScheduledPlanChange` |
| Upgrade sem `ReleaseScheduleAsync` — o Stripe recusaria a troca | `P5_UpgradeWithScheduledDowngrade` |
| `IsWithinRefundWindow` sempre `false` — ninguém recebe estorno | `X1` (×3), `X6`, `RefundWindow_JustInsideTheBoundary` |
| Trial ignorando `HasUsedTrial` — trial infinito, um por loja | `T2_UserAlreadyUsedTrial` |
| Encerrar a única loja ativa permitido | `DeactivateStore_WhenItIsTheOnlyActiveOne` (+2) |

Ao mexer nesses pontos, repita o exercício: um teste que nunca falha não protege nada.

## Limitação conhecida: sem `TimeProvider`

Os services chamam `DateTime.UtcNow` direto. Consequências:

- asserções de data usam `.Within(...)`, nunca igualdade exata;
- a **borda exata** de uma janela (ex.: `StartedAt + 7d == now`) é indeterminável — o service lê o
  relógio milissegundos depois do arrange. `RefundWindow_JustInsideTheBoundary` usa 1 minuto de
  margem de propósito; um teste no instante exato seria flaky, não rigoroso.

O `BillingWebhookService` é a exceção feliz: como toda data vem do evento, seus testes são
determinísticos por construção — dá para simular um webhook atrasado 6h sem tocar no relógio.
