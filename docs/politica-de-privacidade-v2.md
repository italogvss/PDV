# Política de Privacidade — Kashing

**Última atualização:** 20 de julho de 2026


Esta Política de Privacidade descreve como a **Kashing** coleta, utiliza, armazena e protege dados
pessoais. Ela é parte integrante dos [Termos de Uso](/termos-de-uso). Ao utilizar a plataforma, você
concorda com as práticas aqui descritas.

Esta Política está disponível **dentro do aplicativo** e na **landing page** da Kashing.

---

## 1. Quem é o responsável (Controlador)

O Controlador dos dados tratados pela Kashing é:

> **Ítalo Gavassi dos Santos**, pessoa física, inscrito no CPF sob o nº **109.605.269-51**, com domicílio
> em **Avenida Brasil, 3200, Maringá — Paraná**.

**Encarregado pelo Tratamento de Dados (DPO):** as funções de Encarregado são exercidas diretamente pelo
responsável da Kashing. Contato para assuntos de privacidade: **italo.gavassi@gmail.com** (canais oficiais
também disponíveis no site e dentro do sistema).

---

## 2. Papéis: Controlador e Operador

A Kashing atua em **dois papéis distintos**, conforme o tipo de dado:

| Tipo de dado | Papel da Kashing | Controlador |
|---|---|---|
| Dados de cadastro do titular da conta (Dono do estabelecimento): nome, e-mail, telefone, dados de assinatura | **Controladora** | Kashing |
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
  armazena a senha do Owner** — a autenticação é feita pelo Google.
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

3.4. **Menores de idade.** A Kashing não coleta intencionalmente dados de menores de idade.

---

## 4. Para que usamos os dados (finalidades e bases legais)

| Finalidade | Base legal (LGPD) |
|---|---|
| Prestar o serviço, criar e gerenciar a conta, processar a assinatura | Execução de contrato (art. 7º, V) |
| Cumprir obrigações legais e responder a autoridades | Obrigação legal / regulatória (art. 7º, II) |
| Análise de uso da plataforma via Google Analytics | Consentimento (art. 7º, I) |
| Comunicação de marketing (se e quando houver) | Consentimento, com opção de descadastro (opt-out) |

---

## 5. Compartilhamento com terceiros

A Kashing compartilha dados apenas com os terceiros necessários à prestação do serviço:

- **Stripe** (gateway de pagamento): recebe o **e-mail do Usuário** e o **plano contratado** para
  processar a assinatura.
- **Google** (login e Google Analytics): autenticação do Owner e análise de uso da plataforma.
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

6.2. O único cookie de terceiros é o do **Google Analytics**, carregado apenas mediante
consentimento do Usuário através do banner de cookies exibido no primeiro acesso ao site. O
Usuário pode aceitar ou recusar o cookie de análise a qualquer momento; a recusa não impede o uso
da plataforma, apenas desativa a coleta de dados de navegação para fins estatísticos.

---

## 7. Armazenamento, segurança e localização

7.1. **Localização.** Os dados são hospedados **no Brasil** (backend, banco de dados e aplicação em VPS).

7.2. **Transferência internacional.** Há tratamento de dados fora do Brasil apenas em razão dos serviços do
**Google** (login e Analytics), que operam em infraestrutura global. Tais transferências observam as
salvaguardas e os termos do próprio Google.

> **Revisar:** se as **fotos no Amazon S3** estiverem em região fora do Brasil, incluir o Amazon como
> transferência internacional aqui.

7.3. **Medidas de segurança.** A Kashing adota, entre outras: criptografia em trânsito (HTTPS), senhas
armazenadas com hash, isolamento por estabelecimento, controle de acesso por papéis
(`Dono do estabelecimento`/`Funcionario`) e backup.

7.4. A segurança é uma obrigação de **meio, conforme o estado da técnica** — **nenhum sistema é 100%
seguro**. A Kashing não garante resultado absoluto contra ataques que superem esforços razoáveis.

---

## 8. Retenção e eliminação de dados

8.1. Os dados são retidos **enquanto a conta estiver ativa**.

8.2. Após o cancelamento ou a inativação da conta, os dados são mantidos por **90 (noventa) dias** e, em
seguida, **eliminados definitivamente**.

8.3. **Exceção — retenção legal:** os dados cadastrais do **Owner** podem ser retidos por prazo superior
quando necessário ao cumprimento de obrigações legais ou ao exercício regular de direitos.

8.4. **Portabilidade/exportação.** Antes da eliminação, o Usuário pode **exportar os dados de sua loja**.

8.5. **Encerramento de conta (exclusão a pedido do titular).** O proprietário(a) pode solicitar o
encerramento da conta em **Configurações > Perfil**. A partir da solicitação inicia-se uma **carência de 30
(trinta) dias**, durante a qual a conta fica bloqueada, sendo possível **exportar os dados** ou **reativar a
conta** — a solicitação é **reversível** até o fim do prazo. Vencida a carência, executam-se a eliminação e a
anonimização conforme a cláusula 8.6.

8.6. **Prazos de retenção por categoria** (contados a partir da exclusão efetiva):

- **Sem base de retenção** (credenciais, preferências, produtos, serviços, agendamentos, fornecedores,
  imagens): **eliminação imediata**.
- **Cadastro mínimo vinculado a transações** (nome e documento do titular e de clientes referenciados por
  registros fiscais): retido por **5 anos**, com os demais campos **anonimizados** de imediato.
- **Fiscais/transacionais** (vendas, pagamentos, despesas): retidos sob guarda legal por **5 anos** e então
  eliminados.
- **Registros de acesso** (data/hora, IP e referência de login): retidos, sem uso ativo, por **6 meses** e
  então eliminados.

8.7. **Bases legais da retenção.** LGPD, arts. 15 e 16 (fim do tratamento com eliminação, salvo obrigação
legal de guarda); Marco Civil da Internet, art. 15 (guarda de registros de acesso por, no mínimo, 6 meses);
CTN, arts. 173 e 195, CDC, art. 27, e Código Civil, art. 206, §5º (obrigações fiscais e prazos prescricionais
— 5 anos). Dados **anonimizados de forma irreversível** deixam de ser dados pessoais e podem ser mantidos para
fins estatísticos.

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

9.4. **Eliminação autosserviço.** O titular proprietário(a) da conta pode exercer o direito de eliminação
diretamente em **Configurações > Perfil > Encerrar minha conta**, sujeitando-se à carência e aos prazos de
retenção legal descritos na cláusula 8.

---

## 10. Incidentes de segurança

10.1. Enquanto **Operadora** dos dados dos clientes e funcionários do comerciante, em caso de incidente de
segurança a Kashing **comunicará o comerciante (Controlador)** para que este adote as medidas cabíveis,
inclusive eventuais comunicações à ANPD e aos titulares.

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
