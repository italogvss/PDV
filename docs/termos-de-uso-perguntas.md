# Termos de Uso do PDV-Ultra — Questionário para Redação

> **Objetivo deste documento:** reunir as perguntas que você (prestador) precisa responder para
> redigir os Termos de Uso do PDV-Ultra. As perguntas foram derivadas dos termos da MarketUP,
> mas **filtradas para a realidade do PDV-Ultra** (SaaS pago, multi-tenant, sem loja virtual, sem
> antecipação de recebíveis) e **focadas em dois eixos**:
>
> 1. **Cumprimento da lei** — LGPD (Lei 13.709/2018), Código de Defesa do Consumidor (Lei 8.078/1990),
>    Marco Civil da Internet (Lei 12.965/2014), Lei de Transparência Fiscal (Lei 12.741/2012) e
>    Lei de Direitos Autorais (Lei 9.610/1998).
> 2. **Sua proteção como prestador** — limitação de responsabilidade, ausência de garantia de
>    disponibilidade, política de reembolso, suspensão de contas e transferência de risco ao usuário.
>
> Responda cada pergunta. Com as respostas, os Termos de Uso podem ser redigidos cláusula a cláusula.
>
> **Aviso:** este documento é um guia técnico, não é aconselhamento jurídico. Antes de publicar,
> revise com um advogado — especialmente as cláusulas de limitação de responsabilidade e reembolso,
> que sofrem limites do CDC quando o cliente for consumidor pessoa física.

---

## 1. Identificação do prestador

Toda a estrutura de responsabilidade dos termos gira em torno de **quem é a parte contratante**.
A MarketUP identifica a "NUVEMSIS" com CNPJ, endereço e razão social logo no início.

- [ ] Qual a **razão social / nome empresarial** que oferece o PDV-Ultra? (Você opera como PJ, MEI ou pessoa física?)
R. PJ
- [ ] Qual o **CNPJ** (ou CPF, se ainda pessoa física)?
R: deixar mock
- [ ] Qual o **endereço** oficial (sede) a constar no documento?
R: deixar mock
- [ ] Qual o **nome comercial / marca** do produto? ("PDV-Ultra" é o nome definitivo?)
R: Kashing
- [ ] Qual o **domínio oficial** (ex.: `pdvultra.com.br`) e subdomínios cobertos pelos termos?
R: kashing.com.br
- [ ] Qual **e-mail e canal de contato** oficial para suporte e notificações jurídicas?
R: italo.gavassi@gmail.com

---

## 2. Objeto do serviço — o que o PDV-Ultra faz (e o que NÃO faz)

Definir com precisão o objeto **limita sua responsabilidade** ao que foi efetivamente contratado.
A MarketUP lista módulos (loja virtual, estoque, financeiro, PDV, RH). **O PDV-Ultra não tem loja
virtual nem antecipação de recebíveis** — isso deve ser explicitamente excluído.

- [ ] Como descrever o objeto em uma frase? (Sugestão: "plataforma SaaS de gestão para pequenos
      comércios, baseada em nuvem, com módulos de PDV, estoque, financeiro, clientes e funcionários".)
      R: plataforma SaaS de gestão para pequenos
      comércios, baseada em nuvem, com módulos de PDV, estoque, financeiro, clientes e funcionários
- [ ] Quais **módulos/funcionalidades** entram na descrição oficial? (PDV/frente de caixa, estoque,
      financeiro/despesas, clientes, funcionários, assinaturas… confirmar a lista atual.)
      R: PDV, Historico de vendas, gerenciamento de estoque, despesas, funcionarios vendas e agendamentos.
- [ ] O PDV-Ultra **emite documentos fiscais** (NFC-e, NF-e, cupom fiscal)? — decisivo para a Seção 9.
R; Não
- [ ] Você quer deixar **expresso o que o serviço NÃO faz**? (Ex.: não é loja virtual/e-commerce, não faz
      antecipação de recebíveis, não é instituição financeira, não presta consultoria contábil/fiscal.)
      R: não é loja virtual/e-commerce, não faz
      antecipação de recebíveis, não é instituição financeira, não presta consultoria contábil/fiscal.
      *Recomendado: sim — reduz expectativa e responsabilidade.*
- [ ] O serviço depende de **conexão à internet** por conta do usuário? (Reforçar que a conectividade
      é ônus do cliente, como na cláusula 8.5 da MarketUP.)
      R: Sim, não funciona sem internet

---

## 3. Cadastro, conta de acesso e requisitos

Base para responsabilizar o usuário por seus próprios atos e proteger contra uso indevido de credenciais.

- [ ] Quem pode contratar? Exige-se **capacidade civil** e, se PJ, **poderes de representação**?
R: Qualquer pessoa fisica ou juridica
- [ ] Quais **dados são obrigatórios** no cadastro? (E-mail, CNPJ/CPF do comércio, etc.)
R: Nome do contratante, Email e Nome da loja.
- [ ] O usuário é o **único responsável pela veracidade** dos dados fornecidos? *(padrão de proteção)*
R: Sim, ele que registra tudo, o sistema só mostra
- [ ] O usuário é o **único responsável pelo sigilo da senha** e por todos os atos praticados na conta?
      (Considerando que o PDV-Ultra tem papéis `Owner` e `Employee` — a responsabilidade pelas contas
      de funcionários é do Owner do tenant?)
      R: As responsabilidades são do owner do tenant
- [ ] Em caso de **suspeita de comprometimento** da senha, qual o procedimento que o usuário deve seguir?
R: funcionarios podem solicitar troca de senha pro owner. o owner é logado com o google, é responsabilidade do google
- [ ] Você reconhece como **válidos os atos praticados via conta** (não-repúdio), como na cláusula 6.6?
R:sim

---

## 4. Planos, pagamentos, cobrança e trial

**Este é o ponto onde o PDV-Ultra mais diverge da MarketUP.** A MarketUP é gratuita com módulos pagos
pontuais; o **PDV-Ultra é 100% pago (sem plano Free), com trial no lado do PDV, cobrança recorrente via
AbacatePay e gating por módulo/limite**. As cláusulas de pagamento precisam ser escritas do zero.

- [ ] Como descrever o **modelo de cobrança**? (Assinatura recorrente mensal/anual por plano.)
R: Assinatura recorrente mensal/anual por plano, permitindo 30 dias de testes sem cobranças ou informações de cartão. garantindo 7 dias de reembolso quando tiver assinatura ativa
- [ ] Como funciona o **período de trial**? (Quantos dias, quais módulos, o que acontece ao expirar —
      bloqueio/gating 402?)
      R: Ao expirar perde acesso as funcionalidades mas ainda é possivel baixar os dados
- [ ] A cobrança é **recorrente e automática** via AbacatePay? O usuário **autoriza expressamente** a
      recorrência no aceite dos termos? *(essencial para validade da cobrança automática — cf. CDC)*
      R: Sim
- [ ] Qual a **política de reembolso**? A MarketUP diz que valores pagos **não são reembolsáveis** (8.4).
      Você quer o mesmo? **Atenção CDC:** direito de arrependimento de 7 dias (art. 49) se aplica a
      contratação à distância por consumidor — como tratar?
      R: 7 dias de reembolso após assinatura ativa
- [ ] O que acontece em caso de **inadimplência / falha no pagamento**? (Suspensão do acesso após X dias?
      Bloqueio de módulos? Exclusão de dados?)
      R: Bloqueio imediato das funcionalidades, o download de dados continua ativo
- [ ] Há **reajuste de preços**? Com que **aviso prévio** ao cliente? *(transparência exigida pelo CDC)*
R: Eles podem acontecer com 1 mês de aviso previo
- [ ] Mudança de plano (upgrade/downgrade) — como afeta cobrança e limites já contratados?
R: o usuario muda de plano automaticamente e a cobrança vem na proxima fatura. Os limites e features disponiveis são ativas ou desativadas na hora.
- [ ] Os **limites por plano** (ex.: nº de produtos, usuários) constam no contrato ou em página à parte
      referenciada? *(ver `docs/entitlements-e-limits.md`)*
      R: Em ambos

---

## 5. Cancelamento, inativação e exclusão de conta

Protege você quanto à retenção/expurgo de dados e define o fim da relação. LGPD exige regra clara de
retenção e eliminação.

- [ ] O usuário pode **cancelar a assinatura a qualquer momento**? Como? (Autoatendimento na plataforma?)
R: Sim, caso tenha assinatura ativa, ele tera acesso até o fim do periodo
- [ ] Ao cancelar, o acesso continua até o **fim do período já pago** ou é imediato?
R: Se estiver em trial é imediato, se tiver com assinatura ativa é ate o fim do periodo, se tiver em periodo de reembolso é imediato
- [ ] Você quer **inativar contas ociosas** após X dias sem acesso (a MarketUP usa 30 dias)? Qual prazo?
R: Não
- [ ] Qual o **prazo de retenção dos dados** após cancelamento/inativação antes do expurgo definitivo?
      (MarketUP: guarda 90 dias e depois elimina.) — **precisa estar alinhado com a Política de Privacidade/LGPD.**
      R: 90 dias
- [ ] Antes de excluir, você **disponibiliza os dados** do usuário para download/exportação?
      *(boa prática + portabilidade LGPD, art. 18)*
      R: Sim
- [ ] Você pode **suspender ou excluir contas** por violação dos termos, uso ilícito ou fraude, **sem aviso
      prévio e sem indenização**? (cláusula 2.8 da MarketUP) — confirmar redação.
      R: Sim
- [ ] O **soft delete** interno (`IsActive = false`) tem reflexo na relação com o cliente ou é só técnico?
R: é tecnico

---

## 6. Disponibilidade, SLA e limitação de responsabilidade

**Núcleo da sua proteção como prestador.** A MarketUP se blinda fortemente aqui (cláusulas 2.2 a 2.7,
2.4, 8.7). Adaptar para o PDV-Ultra, tendo em mente que **CDC limita cláusulas que excluam totalmente
a responsabilidade perante consumidor** — não dá para "zerar" tudo, mas dá para limitar.

- [ ] Você oferece **garantia de disponibilidade (SLA)** com % de uptime? Ou o serviço é "as is / conforme
      disponível" sem SLA garantido? *(MarketUP não garante — 2.5)*
      R: Depende da disponibilidade da hostinger
- [ ] Você quer **excluir responsabilidade por**: indisponibilidade, bugs, falhas de terceiros (hospedagem,
      internet), caso fortuito/força maior, perda de lucros/lucros cessantes? (cláusula 2.4)
      R: Sim, a aplicação vai ao ar como early-acess
- [ ] Você quer **limitar o valor** de eventual indenização (ex.: ao total pago nos últimos 12 meses)?
      *(cláusula de teto — muito usada em SaaS para conter risco)*
      R: Sim
- [ ] Você se responsabiliza por **danos ao equipamento do usuário** (vírus, falhas de conexão)? *(MarketUP
      exclui — 2.3)*
      R: Não
- [ ] Há **janelas de manutenção programada** que não contam como indisponibilidade?
R: Podem haver
- [ ] Você se compromete a **manter o ambiente seguro** conforme o estado da técnica (cláusula 5.1.1),
      **exceto** contra ataques de terceiros que superem esforços razoáveis?
      R: Sim

---

## 7. Dados, backup, privacidade e LGPD

Cumprimento legal obrigatório. O PDV-Ultra armazena dados de comércio, clientes e funcionários (inclusive
**fotos** no MinIO) — há tratamento de dados pessoais, então LGPD se aplica integralmente.

- [ ] Existe **Política de Privacidade separada**? *(Recomendado — a MarketUP tem documento próprio, parte
      integrante dos termos. Vale gerar um questionário à parte para ela.)*
      R: Sim
- [ ] Quem é o **Controlador** e quem é o **Operador** dos dados? (Em geral: o comerciante/tenant é
      Controlador dos dados de seus clientes; você é Operador. Você é Controlador dos dados de cadastro do
      próprio comerciante.) — **precisa ficar claro para delimitar responsabilidade.**
      R: seguir recomendação
- [ ] Você faz **backups periódicos**? Ainda assim quer transferir ao usuário o ônus de **manter cópias
      próprias** (cláusula 8.2 da MarketUP)? *(recomendado para se proteger)*
      R: Backup Semanais
- [ ] Você se **exime de responsabilidade por exclusão/alteração acidental feita pelo próprio usuário**
      (cláusula 8.2.1)?
      R: Não
- [ ] Como funciona a **isolação multi-tenant** do ponto de vista contratual — você garante que dados de um
      comércio não são acessíveis por outro? *(reflete a regra de `TenantId` do sistema)*
      R: SIm, garanto
- [ ] Qual o **tratamento das fotos** (produtos, despesas, funcionários) armazenadas? Retenção e exclusão
      seguem a mesma regra da conta?
      R; sim
- [ ] Você compartilha dados com **terceiros** (ex.: AbacatePay para pagamento)? Isso precisa estar
      declarado. *(a MarketUP tinha o compartilhamento de recebíveis — no PDV-Ultra, o único terceiro
      relevante é o gateway de pagamento; confirmar se há outros: e-mail, analytics, etc.)*
      R: Não compartilho, mas podem haver google analytics na landingpage
- [ ] Como o usuário exerce os **direitos do titular** (acesso, correção, exclusão, portabilidade — art. 18 LGPD)?
R: nas configurações do sistema
- [ ] Há **encarregado (DPO)** ou canal para requisições de privacidade?
R: Sim, nas informações de contato od site
---

## 8. Obrigações e condutas proibidas do usuário

Transfere responsabilidade por mau uso e dá base para suspender contas.

- [ ] O usuário se obriga a **usar o serviço apenas para os fins a que se destina** e conforme a lei?
R; Sim
- [ ] Você quer proibir explicitamente: **engenharia reversa, cópia, revenda, sublicenciamento** do software
      (cláusula 1.3)?
      R; Sim
- [ ] Você quer proibir: **automação/scraping/bots, mineração de dados, acesso à área de programação/banco**
      (cláusulas 1.2, 1.4, 1.5)?
      R: Sim
- [ ] Você quer proibir **envio de conteúdo malicioso** (scripts, malware) sob pena de suspensão (cláusula 1.4.1)?
R: Sim
- [ ] Cláusula de **indenização (indemnity)**: o usuário defende e isenta você de reivindicações de terceiros
      decorrentes do mau uso dele (cláusula 6.7)? *(proteção importante)*
      R: Sim
- [ ] Há **conteúdos proibidos** relevantes ao contexto do PDV? (A lista longa da MarketUP em 8.9 é mais
      voltada a conteúdo público/loja; para o PDV, cabe uma versão enxuta: nada ilícito, fraudulento ou que
      viole direitos de terceiros.)
      R: mantrer versão enxuta

---

## 9. Fiscal e tributário (Lei de Transparência Fiscal 12.741/2012)

**Não emite**

---

## 10. Propriedade intelectual

Protege sua marca e o software. A MarketUP dedica a Seção 7 inteira a isso.

- [ ] A **marca, software, layout, banco de dados e código** são de sua propriedade e protegidos por lei?
R: SIm
- [ ] O usuário tem apenas **licença de uso** durante a vigência, **sem adquirir qualquer direito** sobre o
      software (cláusula 7.10)?
      R: Sim
- [ ] Você quer a cláusula de **feedback/sugestões**: ideias enviadas pelo usuário passam a ser suas, sem
      compensação (cláusula 7.12)? *(comum e útil, mas avaliar tom)*
      R; Sim
- [ ] E os **dados inseridos pelo usuário** (produtos, clientes, vendas) — fica claro que **continuam sendo
      do usuário**, e você só os processa? *(importante distinguir: software é seu, dados são dele)*
      R: são dos usuarios

---

## 11. Comunicação com o usuário

- [ ] Por quais **canais** você notifica o usuário? (E-mail, central de alertas no sistema, SMS, WhatsApp?)
R: Central de alertas do sistema
- [ ] O usuário é responsável por **manter dados de contato atualizados** e por **não bloquear** seus e-mails
      (anti-spam configurado) — cláusulas 3.1.1 e 3.1.2?
      R: Sim
- [ ] Notificações **importantes** (cobrança, alteração de termos, suspensão) por qual canal com valor legal?
R; Central ded alertas do sistema

---

## 12. Alteração dos termos, foro e disposições gerais

- [ ] Você pode **alterar os termos unilateralmente**? Como o usuário é **avisado** e a partir de quando
      passa a valer? *(CDC exige comunicação prévia de alterações relevantes; silêncio absoluto é arriscado)*
      R; Avisado pela central de informações do sistema
- [ ] Você pode **ceder o contrato** a empresa controlada/coligada sem aviso (cláusula 11.2)?
R: Não sei
- [ ] **Lei aplicável:** legislação brasileira, idioma português, horário de Brasília?
R: Sim
- [ ] Cláusula de **independência das disposições** (se uma cláusula cair, as demais seguem válidas)?
R; Sim
- [ ] Cláusula de **não-novação** (tolerar um descumprimento não renuncia ao direito) — cláusula 11.3?
R; Sim

---

## 13. Suporte e atendimento

- [ ] Qual o **canal oficial de suporte** e horários?
R: Meu email e whatsapp cadastrado na plataforma, horairo comercial 8h-12h as 13h-18h
- [ ] Você deixa claro que **não é obrigado a prestar treinamento** sobre as funcionalidades (cláusula 8.2.2)?
R: Sim
- [ ] Há algum **nível de atendimento diferenciado por plano**? (Se sim, referenciar sem prometer SLA que não
      cumpre.)
R: Não
---
### Próximo passo sugerido

Depois de responder este questionário, o recomendável é gerar **dois documentos**:

1. **Termos de Uso** — a partir das respostas acima.
2. **Política de Privacidade (LGPD)** — documento próprio e obrigatório, dado o volume de dados pessoais
   tratados (clientes e funcionários dos comércios). Vale um questionário à parte.
