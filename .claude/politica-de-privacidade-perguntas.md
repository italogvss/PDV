# Política de Privacidade do PDV-Ultra — Questionário para Redação

> **Objetivo deste documento:** reunir as perguntas que você (prestador) precisa responder para redigir
> a **Política de Privacidade** do PDV-Ultra, exigida pela **LGPD (Lei 13.709/2018)**. É documento
> separado dos Termos de Uso, mas complementar — os Termos remetem a ele.
>
> **Foco:**
> 1. **Cumprimento da LGPD** — bases legais, finalidades, direitos do titular, segurança, retenção,
>    compartilhamento e incidentes.
> 2. **Sua proteção como prestador** — delimitar claramente o que é responsabilidade do comerciante
>    (seu cliente) e o que é sua, evitando assumir obrigações de Controlador que na verdade são do cliente.
>
> **Ponto mais importante deste documento (leia antes de tudo):** no PDV-Ultra existem **dois níveis de
> tratamento de dados** com responsabilidades distintas — ver Seção 2. Errar isso é o maior risco jurídico.
>
> **Aviso:** guia técnico, não é aconselhamento jurídico. Revise com advogado antes de publicar.

---

## 1. Identificação e papéis formais (LGPD, arts. 5º, 41)

- [ ] Qual a **razão social, CNPJ e endereço** do Controlador? *(reaproveitar da Seção 1 do questionário de Termos)*
R; Deixar mock
- [ ] Quem é o **Encarregado (DPO)** — a pessoa/canal responsável por atender titulares e a ANPD (art. 41)?
      Pode ser você mesmo no início, mas precisa de um **e-mail de contato** dedicado (ex.: `privacidade@...`).
      Eu mesmo, atravez do email ou celular
- [ ] Qual o **canal oficial** para requisições de privacidade e para comunicação com a ANPD?
R; Site oficial

---

## 2. Papéis: Controlador vs. Operador (o ponto crítico do multi-tenant)

O PDV-Ultra tem **duas camadas de dados** com responsabilidades diferentes. **A política precisa separar as duas
com clareza — é o que te protege de responder por dados que, na verdade, são geridos pelo comerciante.**

| Situação | Quem decide o uso (Controlador) | Seu papel |
|---|---|---|
| Dados de **cadastro do comerciante** (Owner do tenant, e-mail, CNPJ, pagamento) | **Você** | Controlador |
| Dados que o **comerciante insere** sobre seus próprios clientes e funcionários | **O comerciante (tenant)** | **Operador** |

- [ ] Você concorda em se posicionar como **Operador** em relação aos dados de clientes/funcionários que o
      comerciante cadastra? *(Recomendado — transfere ao comerciante a responsabilidade de ter base legal para
      coletar os dados dos clientes dele.)*
      R: Sim
- [ ] A política deixará claro que **cabe ao comerciante** obter consentimento/base legal dos titulares que
      ele cadastra (os clientes e funcionários do comércio dele)?
      R: Sim
- [ ] Você quer uma cláusula em que o **comerciante declara ser o Controlador** desses dados e te isenta caso
      ele os colete de forma irregular? *(proteção importante — pode ir também nos Termos de Uso, Seção 7)*
      R: Sim

---

## 3. Dados pessoais coletados (categorias)

Liste tudo que o sistema efetivamente coleta. Levantei o que a arquitetura do PDV-Ultra sugere — **confirme e
complete**:

- [ ] **Do comerciante/usuário da conta (você é Controlador):**
  - [ ] Nome, e-mail, senha (hash), telefone?
  R: EU armazeno essas informações que recebo do google, menos a senha. o telefone é pocional ele inserir
  - [ ] CNPJ/CPF e dados do estabelecimento?
  R: Não é obrigatorio mas ele pode informar se quiser
  - [ ] Dados de **pagamento/assinatura** (processados via AbacatePay — você armazena algo ou só o gateway?)
  R: Armazeno informações minimas das faturas como os ultimos 4 digitos do cartão
  - [ ] **Foto de funcionário** (armazenada no MinIO) — é dado pessoal, possivelmente biométrico se usada
        para identificação; confirmar finalidade.
        R: Armazeno sim
  - [ ] **Logs de acesso** (IP, data/hora, ações) — obrigatório guardar por Marco Civil (art. 15: 6 meses)?
  R: Ainda não faço
- [ ] **Dados que o comerciante insere (você é Operador):**
  - [ ] Dados de **clientes** do comércio (nome, contato, histórico de compras)?
  R; Sim
  - [ ] Dados de **funcionários** do comércio?
  R: Sim
  - [ ] Fotos (produtos não são dados pessoais; despesas/funcionários podem ser)?
  R: Só funcionarios, mas armazeno o link da foto do login com google
- [ ] Há coleta de **dados sensíveis** (art. 11 — biometria, saúde, etc.)? *(Se a foto de funcionário for usada
      para reconhecimento, cuidado: pode virar dado biométrico sensível.)*
      R: Só foto do funcionario
- [ ] Há coleta de dados de **menores de idade**? *(Provavelmente não, mas confirmar — exige tratamento especial.)*
R: Não

---

## 4. Finalidades e bases legais (LGPD, arts. 7º e 11)

**Cada dado precisa de uma finalidade e uma base legal.** Não pode coletar "por precaução". Mapear:

- [ ] **Execução do contrato** (art. 7º, V) — prestar o serviço, gerenciar a conta, processar pagamentos.
      *(base principal para a maioria dos dados do comerciante)*
- [ ] **Obrigação legal** (art. 7º, II) — guarda de logs (Marco Civil), obrigações fiscais.
- [ ] **Legítimo interesse** (art. 7º, IX) — melhoria do produto, segurança, prevenção a fraude. *(exige registro
      de avaliação — LIA; e não pode se sobrepor a direitos do titular)*
      R: Não possuo
- [ ] **Consentimento** (art. 7º, I) — apenas para o que não se encaixa acima (ex.: e-mail marketing). Você faz
      comunicação de marketing? Se sim, precisa de consentimento separado e opt-out.
      R; Talvez eu faça
- [ ] Você usa dados para **treinar modelos, analytics ou perfis**? Se sim, qual base legal e como informar?
R: Só uso google analytics
---

## 5. Compartilhamento com terceiros (operadores e suboperadores)

Todo terceiro que "toca" nos dados precisa estar declarado. Levantei os prováveis — **confirme**:

- [ ] **AbacatePay** — gateway de pagamento (dados de cobrança). Confirmar exatamente o que é enviado.
R: É enviado email do usuario e o plano que ele quer contratar.
- [ ] **Provedor de hospedagem/nuvem** — onde rodam backend, MySQL e MinIO? (AWS, servidor próprio, VPS?)
VPS para backend, frontend e landingpage. as fots ficam na amazon s3
- [ ] **Provedor de e-mail transacional** — se você envia e-mails de confirmação/cobrança (qual serviço?).
R; Não envio
- [ ] **Analytics / monitoramento** — usa Google Analytics, Sentry, ou similar? *(se sim, declarar e ver cookies)*
R: Sim
- [ ] Você compartilha dados por **obrigação legal / ordem judicial**? (Cláusula padrão.)
R: Sim
- [ ] Você **vende ou cede dados** para fins comerciais? *(Recomendado declarar explicitamente que NÃO —
      diferencial de confiança e evita a polêmica que a MarketUP teve com recebíveis.)*
      R: Não

---

## 6. Cookies e tecnologias de rastreamento

- [ ] O frontend usa **cookies/localStorage**? Quais e para quê? (Autenticação/JWT, preferências, analytics?)
R: Autenticação/JWT, preferências, analytics?
- [ ] Há **cookies de terceiros** (analytics, marketing)?
R: Somente do google analytics
- [ ] Você precisa de **banner de consentimento de cookies**? *(obrigatório se houver cookies não essenciais)*
R: Não avaliei isso ainda
- [ ] Quer uma **tabela de cookies** na política (nome, finalidade, duração)? *(boa prática)*
R: Não
---

## 7. Armazenamento, segurança e localização dos dados

Demonstra que você adota medidas de segurança (art. 46) — e limita sua responsabilidade ao "estado da técnica".

- [ ] Onde os dados ficam **hospedados** (país)? *(Se fora do Brasil → ver Seção 8, transferência internacional.)*
R: Brasil
- [ ] Quais **medidas de segurança** você declara? (Criptografia em trânsito/HTTPS, senhas com hash, isolamento
      multi-tenant por `TenantId`, controle de acesso por papel `Owner`/`Employee`, backups.)
      R: Todas essas citadas
- [ ] Você quer a ressalva de que **nenhum sistema é 100% seguro** e que sua obrigação é de **meio, conforme o
      estado da técnica** — não de resultado? *(proteção padrão, alinhada à cláusula 5.1.1 dos Termos)*
      R: Sim
- [ ] As **fotos no MinIO** têm o mesmo padrão de segurança e o prefixo `{tenantId}/` garante isolamento — isso
      entra como medida técnica declarada?
R: Sim
---

## 8. Transferência internacional de dados (LGPD, arts. 33–36)

- [ ] Algum dado sai do Brasil? (Ex.: hospedagem, e-mail ou analytics em servidores no exterior.)
  - [ ] **Se sim:** informar o país e a **garantia adotada** (cláusulas contratuais, país com nível adequado, etc.).
R: Google no login e no analytics 
  - [ ] **Se não:** declarar que os dados são tratados **no Brasil** — mais simples e seguro.

---

## 9. Retenção e eliminação de dados (LGPD, art. 15–16)

Precisa estar **alinhado com a Seção 5 dos Termos de Uso** (cancelamento/inativação).

- [ ] Por quanto tempo você **retém os dados** enquanto a conta está ativa?
R: 90 dias
- [ ] Após **cancelamento/inativação**, qual o prazo até o **expurgo definitivo**? *(defina um número — ex.: 90 dias.)*
R; 90 dias
- [ ] Quais dados você **retém por obrigação legal** mesmo após exclusão? (Logs — Marco Civil; dados fiscais/
      financeiros — prazos tributários.)
      R: Informações do usuario Owner
- [ ] Você oferece **exportação dos dados** antes da eliminação? *(atende à portabilidade — art. 18, V)*
R: Sim
---

## 10. Direitos do titular (LGPD, art. 18)

A política precisa listar os direitos e **como exercê-los**. Verifique se o produto suporta cada um:

- [ ] **Confirmação e acesso** aos dados — há como o usuário ver/exportar os próprios dados?
R: Somente da loja
- [ ] **Correção** de dados incompletos/desatualizados — o usuário edita no sistema?
R: Sim
- [ ] **Anonimização, bloqueio ou eliminação** de dados desnecessários?
- [ ] **Portabilidade** — exportação em formato estruturado?
- [ ] **Eliminação** dos dados tratados com consentimento?
- [ ] **Informação sobre compartilhamento** com terceiros?
- [ ] **Revogação de consentimento** (para o que for baseado em consentimento, ex.: marketing)?
- [ ] Qual o **prazo e canal** para responder às requisições? *(defina — ex.: até 15 dias pelo e-mail do DPO)*
R: Email disponivel em contato
- [ ] **Importante para o multi-tenant:** requisições de um **cliente do comerciante** devem ser encaminhadas
      **ao comerciante** (Controlador), não tratadas por você (Operador). A política diz isso?

---

## 11. Incidentes de segurança (LGPD, art. 48)

- [ ] Você tem um **procedimento** para, em caso de vazamento, comunicar a **ANPD** e os **titulares afetados**
      em prazo razoável?
      R; Não pensei nisso
- [ ] Sendo **Operador** dos dados dos clientes do comerciante, você se compromete a **avisar o comerciante
      (Controlador)** para que ele faça as comunicações? *(delimita responsabilidade)*
      R: Sim

---

## 12. Alterações da política e vigência

- [ ] Você pode **atualizar a política**? Como os usuários são **avisados** de mudanças relevantes?
R: SIM
- [ ] A política terá **data de última atualização** visível? *(a MarketUP data os documentos — boa prática)*
R; Sim
- [ ] Onde a política fica **hospedada/acessível**? (Rodapé do site, dentro do app?)
R: NO app e na landingpage

---

## 13. Contato

- [ ] **E-mail do Encarregado/DPO** para exercício de direitos e dúvidas de privacidade.
R: italo.gavassi@gmail.com
- [ ] Canal de **denúncia/reclamação** e menção ao direito de reclamar à **ANPD**.
R: Há dentro do sistema 

---

## Checklist de coerência entre os dois documentos

Antes de publicar, confirme que **Termos de Uso** e **Política de Privacidade** não se contradizem:

- [ ] **Prazo de retenção/expurgo** é o mesmo nos dois (Termos §5 ↔ Política §9).
- [ ] **Terceiros citados** batem (Termos §7 ↔ Política §5) — em especial o AbacatePay.
- [ ] **Papel de Operador/Controlador** aparece consistente (Termos §7 ↔ Política §2).
- [ ] Os **Termos remetem à Política** como documento integrante (como a MarketUP faz na cláusula 4.2).

---

### Observação

Não puxei o texto da Política de Privacidade da MarketUP — este questionário foi montado a partir da
**estrutura exigida pela LGPD** e da **arquitetura real do PDV-Ultra** (multi-tenant por `TenantId`, MinIO,
AbacatePay, papéis Owner/Employee). Se quiser que eu incorpore trechos específicos da política da MarketUP
para comparação, cole o texto dela como fez com os Termos.
