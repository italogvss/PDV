# Política de Privacidade — Kashing

**Última atualização:** 3 de julho de 2026

> **Nota de revisão:** documento redigido a partir das suas respostas ao questionário, em conformidade com
> a Lei nº 13.709/2018 (LGPD). É um bom ponto de partida, mas **recomenda-se revisão jurídica** antes da
> publicação. Trechos marcados com "**>**" ainda dependem de decisão ou providência sua.

Esta Política de Privacidade descreve como a **Kashing** coleta, utiliza, armazena e protege dados
pessoais. Ela é parte integrante dos [Termos de Uso](/termos-de-uso). Ao utilizar a plataforma, você
concorda com as práticas aqui descritas.

Esta Política está disponível **dentro do aplicativo** e na **landing page** da Kashing.

---

## 1. Quem é o responsável (Controlador)

O Controlador dos dados tratados pela Kashing é:

> **[RAZÃO SOCIAL]**, inscrita no CNPJ sob o nº **[00.000.000/0001-00]**, com sede em **[ENDEREÇO COMPLETO]**.
>
> **Nota:** preencher com os dados reais antes de publicar.

**Encarregado pelo Tratamento de Dados (DPO):** as funções de Encarregado são exercidas diretamente pelo
responsável da Kashing. Contato para assuntos de privacidade: **italo.gavassi@gmail.com** (canais oficiais
também disponíveis no site e dentro do sistema).

---

## 2. Papéis: Controlador e Operador

A Kashing atua em **dois papéis distintos**, conforme o tipo de dado:

| Tipo de dado | Papel da Kashing | Controlador |
|---|---|---|
| Dados de cadastro do titular da conta (proprietário(a)): nome, e-mail, telefone, dados de assinatura | **Controladora** | Kashing |
| Dados que o comerciante insere sobre **seus clientes e funcionários** | **Operadora** | O próprio comerciante (Usuário) |

2.1. Em relação aos dados de **clientes e funcionários** cadastrados pelo comerciante, **o comerciante é o
Controlador** e a Kashing atua apenas como **Operadora**, tratando tais dados segundo as instruções do
comerciante.

2.2. **Cabe ao comerciante** obter a base legal (consentimento ou outra hipótese do art. 7º/11 da LGPD) e
informar os titulares sobre o tratamento dos dados que ele coleta. O comerciante **declara ser o
Controlador** desses dados e **isenta a Kashing** de responsabilidade caso os colete ou trate de forma
irregular.

---

## 3. Dados que coletamos

### 3.1. Dados do titular da conta (Kashing como Controladora)

- **Login via Google:** nome, e-mail e link da foto de perfil fornecidos pela conta Google. **A Kashing não
  armazena a senha do proprietário(a)** — a autenticação é feita pelo Google.
- **Telefone:** opcional, informado pelo Usuário.
- **CNPJ/CPF e dados do estabelecimento:** opcionais, informados pelo Usuário.
- **Dados de assinatura/pagamento:** informações mínimas de faturas, como os **4 últimos dígitos do cartão**.
  Os dados completos de pagamento são processados pelo provedor Stripe, **não sendo armazenados pela
  Kashing**.

> **A Kashing ainda não coleta logs de acesso (IP, data/hora).** Caso passe a coletá-los — inclusive para
> cumprir o Marco Civil da Internet (Lei 12.965/2014, guarda de registros por 6 meses) — esta seção deverá
> ser atualizada.

### 3.2. Dados inseridos pelo comerciante (Kashing como Operadora)

- Dados de **clientes** do comércio (nome, contato, histórico de compras);
- Dados de **funcionários** do comércio, incluindo **foto do funcionário**.

3.3. **Dados sensíveis.** A Kashing não coleta dados sensíveis, à exceção da **foto do funcionário**
cadastrada pelo comerciante.

> **Atenção:** foto isolada é dado pessoal comum. Ela só se torna **dado biométrico sensível** (art. 11 da
> LGPD) se for usada para **identificação/reconhecimento**. Como a foto na Kashing é meramente cadastral,
> não a tratamos como biométrica — **confirme que não há uso de reconhecimento facial** para manter essa
> classificação.

3.4. **Menores de idade.** A Kashing não coleta intencionalmente dados de menores de idade.

---

## 4. Para que usamos os dados (finalidades e bases legais)

| Finalidade | Base legal (LGPD) |
|---|---|
| Prestar o serviço, criar e gerenciar a conta, processar a assinatura | Execução de contrato (art. 7º, V) |
| Cumprir obrigações legais e responder a autoridades | Obrigação legal / regulatória (art. 7º, II) |
| Análise de uso da plataforma via Google Analytics | Consentimento (art. 7º, I) |
| Comunicação de marketing (se e quando houver) | Consentimento, com opção de descadastro (opt-out) |

> **Você indicou que "talvez" fará marketing.** Enquanto não fizer, o envio de comunicações promocionais
> **não deve ocorrer**. Quando for iniciar, será necessário coletar **consentimento específico** e oferecer
> **opt-out**. A Kashing **não** invoca legítimo interesse como base legal.

---

## 5. Compartilhamento com terceiros

A Kashing compartilha dados apenas com os terceiros necessários à prestação do serviço:

- **Stripe** (gateway de pagamento): recebe o **e-mail do Usuário** e o **plano contratado** para
  processar a assinatura.
- **Google** (login e Google Analytics): autenticação do proprietário(a) e análise de uso da plataforma.
- **Amazon S3** (armazenamento de arquivos): armazenamento das fotos (funcionários e produtos).
- **Provedor de hospedagem (VPS)**: onde rodam o backend, o frontend e a landing page.

5.1. A Kashing poderá compartilhar dados quando exigido por **obrigação legal ou ordem judicial**.

5.2. A Kashing **não vende nem cede dados pessoais para fins comerciais**.

> **Revisar:** confirme a **região do bucket Amazon S3**. Se estiver no Brasil (ex.: `sa-east-1`), não há
> transferência internacional das fotos; se estiver no exterior, isso deve ser declarado na Seção 7.

---

## 6. Cookies e tecnologias de rastreamento

6.1. A Kashing utiliza cookies e armazenamento local para:

- **autenticação** (token JWT de sessão);
- **preferências** do Usuário;
- **análise de uso** via Google Analytics.

6.2. O único cookie de terceiros é o do **Google Analytics**.

> **Pendente:** você ainda não avaliou a necessidade de **banner de consentimento de cookies**. Como há
> cookie de analytics (não essencial), o recomendável é **implementar um banner de consentimento** com
> opção de recusa antes do carregamento do Google Analytics. Providência a definir.

---

## 7. Armazenamento, segurança e localização

7.1. **Localização.** Os dados são hospedados **no Brasil** (backend, banco de dados e aplicação em VPS).

7.2. **Transferência internacional.** Há tratamento de dados fora do Brasil apenas em razão dos serviços do
**Google** (login e Analytics), que operam em infraestrutura global. Tais transferências observam as
salvaguardas e os termos do próprio Google.

> **Revisar:** se as **fotos no Amazon S3** estiverem em região fora do Brasil, incluir o Amazon como
> transferência internacional aqui.

7.3. **Medidas de segurança.** A Kashing adota, entre outras: criptografia em trânsito (HTTPS), senhas
armazenadas com hash, **isolamento multi-tenant por `TenantId`**, controle de acesso por papéis
(`Owner`/`Employee`), backups e isolamento das fotos por prefixo `{tenantId}/` no armazenamento.

7.4. A segurança é uma obrigação de **meio, conforme o estado da técnica** — **nenhum sistema é 100%
seguro**. A Kashing não garante resultado absoluto contra ataques que superem esforços razoáveis.

---

## 8. Retenção e eliminação de dados

8.1. Os dados são retidos **enquanto a conta estiver ativa**.

8.2. Após o cancelamento ou a inativação da conta, os dados são mantidos por **90 (noventa) dias** e, em
seguida, **eliminados definitivamente**.

8.3. **Exceção — retenção legal:** os dados cadastrais do **proprietário(a)** podem ser retidos por prazo superior
quando necessário ao cumprimento de obrigações legais ou ao exercício regular de direitos.

8.4. **Portabilidade/exportação.** Antes da eliminação, o Usuário pode **exportar os dados de sua loja**.

---

## 9. Direitos do titular (art. 18 da LGPD)

9.1. O titular pode solicitar: confirmação e acesso aos dados, correção, anonimização, portabilidade,
eliminação e informações sobre compartilhamento, além de revogar consentimento (quando esta for a base
legal).

9.2. **Na prática, na Kashing:**

- **Acesso e exportação:** disponíveis para os dados **da loja** do Usuário;
- **Correção:** o Usuário edita os dados diretamente no sistema;
- **Demais direitos e dúvidas:** por meio do e-mail de contato (italo.gavassi@gmail.com).

9.3. **Requisições de clientes do comerciante.** Se um **cliente ou funcionário cadastrado por um
comerciante** exercer direitos sobre seus dados, a solicitação será **encaminhada ao comerciante
(Controlador)**, a quem cabe atendê-la, uma vez que a Kashing atua apenas como Operadora desses dados.

> **Revisar:** definir um **prazo-alvo de resposta** às requisições (recomendado: até 15 dias, conforme a
> prática de mercado sob a LGPD).

---

## 10. Incidentes de segurança

10.1. Enquanto **Operadora** dos dados dos clientes e funcionários do comerciante, em caso de incidente de
segurança a Kashing **comunicará o comerciante (Controlador)** para que este adote as medidas cabíveis,
inclusive eventuais comunicações à ANPD e aos titulares.

> **Pendente:** você ainda não possui um **procedimento formal de resposta a incidentes** para os dados dos
> quais é Controladora (cadastro do proprietário(a)). Recomenda-se definir um processo de comunicação à **ANPD** e aos
> titulares afetados em prazo razoável, conforme o art. 48 da LGPD.

---

## 11. Alterações desta Política

11.1. A Kashing pode atualizar esta Política a qualquer tempo. Alterações relevantes serão comunicadas, e a
data de "última atualização" no topo do documento será revista. A versão vigente estará sempre disponível no
aplicativo e na landing page.

---

## 12. Contato e reclamações

- **Assuntos de privacidade / exercício de direitos:** italo.gavassi@gmail.com
- **Canal de denúncia/reclamação:** disponível dentro do sistema.
- O titular também pode apresentar reclamação diretamente à **Autoridade Nacional de Proteção de Dados
  (ANPD)**.

---

*Esta Política de Privacidade integra os [Termos de Uso](/termos-de-uso) da Kashing.*
