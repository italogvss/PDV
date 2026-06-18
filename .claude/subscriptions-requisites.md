## To do
Crie um plano para a implementação do gateway de pagamentos abacatepay com validação por webhook. o Gateway deve ter uma interface generica para futuros gateways.

O fluxo da aplicação:
1. (frontend)"Assinar" em pages/Settings/components/SubscriptionSection
2. envia informações de checkout pro backend
3. (backend)processa
4. (backend)reatorna checkouturl
5.(frontend) abre checkout
6. ao fim do checkout no abacatepay, usuario é retornado para SubscriptionReturn que faz pooling no backend

## Requisitos
- deve permitir 2 tipos de pagamento: cartão de credito para assinaturas renovarem mensalmente(subscription checkout), pix (checkout transparente, somente para pix ou debito) para pagamento unico mensal ou anual. manter se é uma inscrição renovavel ou não
- deve conseguir lidar com periodo gratis,
- deve lidar com as falhas do abacatepay nas requisições
- manter planos: planos devem ter um conjunto de permissão por modulo,e um conjunto de limites numeros para features(são logicas de negocio). Eles tambem carregam uma externalId 
- manter informações de pagamentos para historico de cobranças e futuras
- manter cupons: permite utilizar, salvar, atualizar cupons de desconto gerados pelo abacatepay
- criar:

AbacatePayApiClient (interno, injetado via DI)

Só cuida do "como falar com a API": monta request, auth header, JsonContent, desserializa o envelope, lança exceção com a mensagem de erro da AbacatePay. Os dois SendAsync privados migram pra cá quase como estão.

AbacatePayWebhookProcessor (ou Verifier + Parser se quiser testar separado)

Junta VerifyWebhookSignature + ParseNotification + o mapeamento de status. É uma responsabilidade conceitualmente única: "entender o que a AbacatePay tá me dizendo no webhook" — validar autenticidade e depois traduzir pro seu modelo de domínio.

AbacatePayGateway (o que sobra, implementando IPaymentGateway)

Fica só com a orquestração de negócio

- manter inscrições: fonte para pagamentos e informações do plano
- permitir checkout avulso(pagamento por Pix ou no debito)
- manter customers: criar customer no gateway abacatepay para utilizar-lo em futuras transações
- o endpoints de webhooks do abacateplay tem que conseguir separar os eventos para checkout, checkout transparente e assinaturas. no payload das requisições webhooks o campo "event" diz o tipo:
(checkout)
checkout.completed
checkout.disputed
checkout.refunded  
(checkout transparente)
transparent.completed
transparent.disputed
transparent.refunded
(assinaturas)
subscription.trial_started
subscription.completed
subscription.renewed
subscription.cancelled

- lidar com idenpodencia do webhook

## Regras
- backend não deve conhecer returnUrl
- utilizar informações de customers para atualizar informações do usuario na aplicação.
- Nunca armazena informações de cartões
- Deve conseguir lidar com a troca de assinaturas.
- Não há planos e tier hardcoded, vai haver um PlanSeeder que insere os planos previamentes cadastrados no gateway, frontend faz requisição dos planos possiveis
- Nenhuma variavel de ambiente hardcoded, novas devem ser inseridas no .env.exemple da raiz
- O plano Free não existe, quando o usuario não tem subscription, ou seja subscriptianId ==  null, ele deve ter um conjunto de modulos e limites de plano gratis que é montado no backend em pdv.domain/constants para ser de facil configuração


## Segurança
Como validar a autenticidade dos webhooks e lidar com retentativas.
Todo webhook enviado pela AbacatePay inclui dois mecanismos de segurança: um secret na URL e uma assinatura HMAC no header. Use os dois juntos.
​
1. Secret na URL
Ao criar o webhook, você define um secret. A AbacatePay inclui esse valor como query parameter em cada requisição:

https://meusite.com/webhook/abacatepay?webhookSecret=SEU_SECRET

o backend deve validar antes de qualquer processamento

2. Assinatura HMAC
Mesmo que alguém descubra sua URL e seu secret, a assinatura HMAC garante que o corpo da requisição não foi alterado e que o evento realmente veio da AbacatePay. O header enviado é:

X-Webhook-Signature: <assinatura em base64>

A assinatura é calculada com HMAC-SHA256 sobre o corpo raw da requisição usando a chave pública da AbacatePay.
​
exemplo de Validação em Node.js

```typescript
import crypto from "node:crypto";

const ABACATEPAY_PUBLIC_KEY =
  "t9dXRhHHo3yDEj5pVDYz0frf7q6bMKyMRmxxCPIPp3RCplBfXRxqlC6ZpiWmOqj4L63qEaeUOtrCI8P0VMUgo6iIga2ri9ogaHFs0WIIywSMg0q7RmBfybe1E5XJcfC4IW3alNqym0tXoAKkzvfEjZxV6bE0oG2zJrNNYmUCKZyV0KZ3JS8Votf9EAWWYdiDkMkpbMdPggfh1EqHlVkMiTady6jOR3hyzGEHrIz2Ret0xHKMbiqkr9HS1JhNHDX9"; //fixa no .env


export function verifyAbacateSignature(rawBody: string, signatureFromHeader: string): boolean {
  const expectedSig = crypto
    .createHmac("sha256", ABACATEPAY_PUBLIC_KEY)
    .update(Buffer.from(rawBody, "utf8"))
    .digest("base64");

  const A = Buffer.from(expectedSig);
  const B = Buffer.from(signatureFromHeader);

  return A.length === B.length && crypto.timingSafeEqual(A, B);
}
```


## Documentação abacatepay

Notas importantes:

- Autenticação: todas as requisições precisam do header `Authorization: Bearer <sua-api-key>`.
- Valores monetários são sempre em **centavos** (ex.: `10000` = R$ 100,00).
- Respostas seguem o envelope `{ "data": {...}, "success": true, "error": null }`.
- Produtos precisam existir antes de criar Checkouts; use `externalId` como referência ao seu catálogo.
- Clientes são únicos por CPF/CNPJ — criar um cliente com taxId já existente retorna o existente.
- Assinaturas exigem produto com `cycle` definido (`WEEKLY`, `MONTHLY`, `SEMIANNUALLY`, `ANNUALLY`).
- Checkout Transparente gera PIX imediatamente sem redirecionar o usuário; retorna `brCode` (copia-e-cola) e `brCodeBase64` (imagem PNG).
- Webhooks precisam de URL HTTPS pública; payloads são assinados via HMAC com o `secret` informado.

## Checkout (cobrar com página hospedada)

- [Referência do Checkout](https://docs.abacatepay.com/pages/payment/reference): Visão geral do fluxo, campos obrigatórios, frequências (ONE_TIME, MULTIPLE_PAYMENTS, SUBSCRIPTION) e exemplo de request/response completo.

O Checkout é a página segura onde o cliente finaliza o pagamento. Você envia os itens; a API devolve uma URL para redirecionar. Fluxo de cobrança - Checkout AbacatePay
​
Criar checkout
Use /checkouts/create. O total é calculado a partir dos itens.
Campos obrigatórios
Só items é obrigatório (lista com id do produto e quantity).
O parâmetro frequency define o tipo de cobrança:
Valor	Descrição
ONE_TIME	Pagamento único (padrão). Não é necessário enviar ao criar um checkout.
MULTIPLE_PAYMENTS	Link de pagamento onde é possível pagar mais de uma vez. Veja Links de pagamento.
SUBSCRIPTION	Assinatura recorrente. Veja Assinaturas.
Exemplo (pagamento único — frequency não precisa ser enviado):

POST /checkouts/create
{
  "items": [                                    // obrigatório
    {
      "id": "prod_pro",                         // ID do produto na sua loja
      "quantity": 1                             // quantidade
    }
  ],
  "customerId": "cust_abc123xyz",              // opcional - ID do cliente já cadastrado
  "externalId": "pedido-123",                  // opcional - ID no seu sistema
  "returnUrl": "https://seusite.com/voltar",   // opcional - URL de retorno
  "completionUrl": "https://seusite.com/sucesso", // opcional - URL após pagamento
  "methods": ["PIX", "CARD"],                  // opcional - métodos de pagamento (padrão: PIX e CARD)
  "metadata": {                                 // opcional - dados adicionais
    "customField": "value"
  }
}

Resposta:

{
  "data": {
    "id": "bill_abc123xyz",
    "externalId": "pedido-123",
    "url": "https://app.abacatepay.com/pay/bill_abc123xyz",
    "amount": 10000,
    "paidAmount": null,
    "items": [
      {
        "id": "prod_456",
        "quantity": 2
      }
    ],
    "status": "PENDING",
    "frequency": "ONE_TIME",
    "coupons": [],
    "devMode": false,
    "customerId": null,
    "returnUrl": null,
    "completionUrl": null,
    "receiptUrl": null,
    "metadata": {},
    "createdAt": "2024-11-04T18:38:28.573Z",
    "updatedAt": "2024-11-04T18:38:28.573Z"
  },
  "success": true,
  "error": null
}



- [POST /checkouts/create](https://docs.abacatepay.com/pages/payment/create): Cria um Checkout e retorna a `url` para redirecionar o cliente. Campo obrigatório: `items` (array com `id` do produto e `quantity`). Opcionais: `methods` (PIX/CARD), `customerId`, `returnUrl`, `completionUrl`, `coupons`, `externalId`, `metadata`.
- [GET /checkouts/list](https://docs.abacatepay.com/pages/payment/list): Lista todos os Checkouts da loja.
- [GET /checkouts/get](https://docs.abacatepay.com/pages/payment/one): Busca um Checkout pelo ID.

Buscar um Checkout

Retorna os dados de um Checkout específico usando o ID.

Você pode usar essa rota para buscar um Checkout por ID e visualizar seus detalhes, status e informações relacionadas.
GET
/
checkouts
/
get
Retorna os dados completos de um checkout pelo seu id.
Requer a permissão CHECKOUT:READ.
Use este endpoint para verificar o status de uma cobrança após o cliente retornar ao seu site, ou ao receber um webhook de pagamento. Valores de status:
Valor	Significado
PENDING	Aguardando pagamento
PAID	Pago com sucesso
EXPIRED	Expirado sem pagamento
CANCELLED	Cancelado
REFUNDED	Reembolsado

Resposta:

{
  "data": {
    "id": "bill_abc123xyz",
    "externalId": "pedido-123",
    "url": "https://app.abacatepay.com/pay/bill_abc123xyz",
    "amount": 10000,
    "paidAmount": null,
    "items": [
      {
        "id": "prod_456",
        "quantity": 2
      }
    ],
    "status": "PENDING",
    "coupons": [],
    "devMode": false,
    "customerId": null,
    "returnUrl": null,
    "completionUrl": null,
    "receiptUrl": null,
    "upSellProductId": "prod_bump456xyz",
    "installmentsCount": 3,
    "interest": {
      "value": 100
    },
    "fine": {
      "value": 200,
      "type": "PERCENTAGE"
    },
    "metadata": {},
    "createdAt": "2024-11-04T18:38:28.573Z",
    "updatedAt": "2024-11-04T18:38:28.573Z"
  },
  "error": null,
  "success": true
}


## Clientes

- [Referência de Clientes](https://docs.abacatepay.com/pages/client/reference): Clientes pré-cadastrados para pré-preencher o checkout e reutilizar em várias cobranças. Único por CPF/CNPJ; campo obrigatório: `email`.
- [POST /customers/create](https://docs.abacatepay.com/pages/client/create): Cria (ou retorna existente) um cliente. Campos: `email` (obrigatório), `taxId`, `name`, `cellphone`, `zipCode`, `metadata`.

Permite que você crie um cliente para a sua loja.

Campo obrigatório: Apenas o email é obrigatório para criar um cliente.

Recomendado: Embora os demais campos sejam opcionais, é altamente recomendado fornecer name, cellphone, taxId e zipCode quando disponíveis, pois essas informações melhoram a experiência do cliente no checkout e facilitam a identificação.
POST
/
customers
/
create
Cadastra um cliente para pré-preencher o checkout e reutilizar em várias cobranças.
Obrigatório
Só data.email é obrigatório. Inclua name, taxId e cellphone sempre que tiver — melhora a experiência no checkout.
Exemplo:

{
  "data": {
    "email": "joao@exemplo.com",
    "name": "João Silva",
    "taxId": "12345678900",
    "cellphone": "+5511999999999",
    "zipCode": "01310-100"
  },
  "metadata": { "plano": "premium" }
}

Guarde o data.id retornado e passe como customerId ao criar checkouts — o cliente não precisa preencher os dados novamente.
Cliente é único por CPF/CNPJ. Se já existir um cadastro com o mesmo taxId, a API devolve o registro existente em vez de criar um duplicado.

Resposta:

{
  "data": {
    "id": "cust_aebxkhDZNaMmJeKsy0AHS0FQ",
    "devMode": true,
    "name": "Daniel Lima",
    "cellphone": "(11) 4002-8922",
    "email": "daniel_lima@abacatepay.com",
    "taxId": "123.456.789-01",
    "country": "BR",
    "zipCode": "01310-100",
    "metadata": {
      "source": "landing-page",
      "campaign": "black-friday-2025"
    }
  },
  "error": null,
  "success": true
}
- [GET /customers/list](https://docs.abacatepay.com/pages/client/list): Lista os clientes cadastrados.
- [GET /customers/get](https://docs.abacatepay.com/pages/client/get): Busca um cliente pelo ID.

Retorna os dados de um cliente específico baseado em filtros.

Você pode usar essa rota para buscar um cliente por ID ou outros critérios.
GET
/
customers
/
get
Retorna os dados de um cliente pelo seu id.
Requer a permissão CUSTOMER:READ.
Use para recuperar o id de um cliente antes de criar uma cobrança ou para verificar os dados cadastrados.

Resposta:

{
  "data": {
    "id": "cust_aebxkhDZNaMmJeKsy0AHS0FQ",
    "devMode": true,
    "name": "Daniel Lima",
    "cellphone": "(11) 4002-8922",
    "email": "daniel_lima@abacatepay.com",
    "taxId": "123.456.789-01",
    "country": "BR",
    "zipCode": "01310-100",
    "metadata": {
      "source": "landing-page",
      "campaign": "black-friday-2025"
    }
  },
  "error": null,
  "success": true
}

- [POST /customers/delete](https://docs.abacatepay.com/pages/client/delete): Remove um cliente pelo ID.

Deletar um Cliente

Remove um cliente da sua loja.

Esta operação é irreversível. Use com cuidado.
POST
/
customers
/
delete
Remove um cliente da sua loja pelo id.
Requer a permissão CUSTOMER:DELETE.
Deletar um cliente não cancela cobranças ou assinaturas vinculadas a ele.

Resposta:

{
  "data": {
    "id": "cust_aebxkhDZNaMmJeKsy0AHS0FQ",
    "devMode": true,
    "name": "Daniel Lima",
    "cellphone": "(11) 4002-8922",
    "email": "daniel_lima@abacatepay.com",
    "taxId": "123.456.789-01",
    "country": "BR",
    "zipCode": "01310-100",
    "metadata": {
      "source": "landing-page",
      "campaign": "black-friday-2025"
    }
  },
  "error": null,
  "success": true
}

## Checkout Transparente (PIX embutido)

- [Referência do Checkout Transparente](https://docs.abacatepay.com/pages/pix-qrcode/reference): Gera PIX QR Code diretamente no seu site/app sem redirecionar o usuário. Retorna `brCode` (copia-e-cola) e `brCodeBase64` (imagem PNG base64). Apenas PIX suportado atualmente.
- [POST /transparents/create](https://docs.abacatepay.com/pages/pix-qrcode/create): Cria um PIX. Campo obrigatório: `data.amount` (em centavos). Opcionais: `data.description`, `data.expiresIn` (segundos), `data.customer` (name, email, taxId, cellphone), `data.metadata`.

Criar cobrança PIX

Cria um checkout transparente. Use "method": "PIX" para gerar um QR Code ou "method": "BOLETO" para emitir um boleto com PIX alternativo incluído.
POST
/
transparents
/
create
Requer a permissão CHECKOUT:READ.
Cria um checkout transparente via PIX. A API devolve o QR Code em imagem (brCodeBase64) e o código copia e cola (brCode) — o cliente nunca sai do seu site.
Para cobrar via Boleto, veja Criar cobrança Boleto.
​
Campos obrigatórios
Campo	Tipo	Descrição
method	string	Deve ser "PIX"
data.amount	number	Valor em centavos (ex: 10000 = R$ 100,00)
Todos os outros campos são opcionais mas recomendados para melhor rastreabilidade.
​
data.utm — campanha / UTM (opcional)
No corpo data com method: "PIX", o objeto utm usa o mesmo esquema do PIX QR Code v1 (PixQrCodeV1): objeto opcional; cada campo interno também é opcional (string).
Campo	Tipo	Descrição
utm.source	string	Opcional
utm.medium	string	Opcional
utm.campaign	string	Opcional
utm.term	string	Opcional
utm.content	string	Opcional
Quando enviados, podem ser consultados no dashboard. Não alteram valores, vencimento nem status da cobrança.
​
Exemplos mínimos (PIX)
Sem utm:

{
  "method": "PIX",
  "data": {
    "amount": 10000
  }
}

Com utm:

{
  "method": "PIX",
  "data": {
    "amount": 10000,
    "utm": {
      "source": "newsletter",
      "medium": "email",
      "campaign": "lancamento_q1",
      "term": "pix",
      "content": "cta_hero"
    }
  }
}

​
Requisição

{
  "method": "PIX",
  "data": {
    "amount": 10000,
    "description": "Cobrança PIX no checkout transparente",
    "expiresIn": 3600,
    "customer": {
      "name": "Daniel Lima",
      "email": "daniel_lima@abacatepay.com",
      "taxId": "123.456.789-01",
      "cellphone": "(11) 4002-8922"
    },
    "metadata": {
      "pedidoId": "pedido-123"
    }
  }
}

​
Resposta

{
  "data": {
    "id": "pix_char_abc123xyz",
    "amount": 10000,
    "status": "PENDING",
    "devMode": false,
    "brCode": "00020160014BR.GOV.BCB.PIX070503***6304ABCD",
    "brCodeBase64": "data:image/png;base64,iVBORw0KG...",
    "platformFee": 100,
    "receiptUrl": null,
    "createdAt": "2024-11-04T18:38:28.573Z",
    "updatedAt": "2024-11-04T18:38:28.573Z",
    "expiresAt": "2024-11-04T19:38:28.573Z",
    "metadata": {
      "pedidoId": "pedido-123"
    }
  },
  "success": true,
  "error": null
}

Use brCodeBase64 para renderizar a imagem do QR Code diretamente na sua página. Use brCode (copia e cola) para enviar por WhatsApp, Telegram ou e-mail.
- [GET /transparents/list](https://docs.abacatepay.com/pages/pix-qrcode/list): Lista os Checkouts Transparentes.
- [POST /transparents/simulate-payment](https://docs.abacatepay.com/pages/pix-qrcode/simulate-payment): Simula um pagamento (ambiente sandbox/devMode).

Simula o pagamento de um QRCode Pix criado no modo de desenvolvimento.
POST
/
transparents
/
simulate-payment
Simula o pagamento de um QR Code PIX no ambiente de desenvolvimento. Só funciona com chaves de API de sandbox.
Requer a permissão CHECKOUT:READ. Disponível apenas em devMode.
Use para testar o fluxo completo sem precisar realizar um PIX real: crie um QR Code, simule o pagamento e confirme que seu webhook ou polling recebe o status PAID.
Em produção este endpoint retorna erro. Ative o modo de desenvolvimento para usá-lo.

Resposta:

{
  "data": {
    "id": "pix_char_123456",
    "amount": 100,
    "status": "PENDING",
    "devMode": true,
    "brCode": "00020101021226950014br.gov.bcb.pix",
    "brCodeBase64": "data:image/png;base64,iVBORw0KGgoAAA",
    "platformFee": 80,
    "receiptUrl": null,
    "createdAt": "2025-03-24T21:50:20.772Z",
    "updatedAt": "2025-03-24T21:50:20.772Z",
    "expiresAt": "2025-03-25T21:50:20.772Z",
    "metadata": {}
  },
  "error": null,
  "success": true
}


- [GET /transparents/check](https://docs.abacatepay.com/pages/pix-qrcode/check): Verifica o status de pagamento de um QR Code PIX pelo ID.

Checar Status

Checar status do pagamento do QRCode Pix.
GET
/
transparents
/
check
Verifica o status atual de um checkout transparente pelo seu id.
Requer a permissão CHECKOUT:READ.
Use este endpoint para confirmar se o cliente já realizou o pagamento do QR Code. O campo status indica o estado atual:
Valor	Significado
PENDING	Aguardando pagamento
PAID	PIX recebido com sucesso
EXPIRED	QR Code expirado sem pagamento
CANCELLED	Cancelado
Prefira webhooks a fazer polling — você recebe a confirmação em tempo real sem precisar consultar repetidamente.

Resposta:

{
  "data": {
    "id": "pix_char_z2rSk6042t1mCKgGgeBpJe1u",
    "status": "PENDING",
    "expiresAt": "2026-03-04T15:48:59.876Z"
  },
  "error": null,
  "success": true
}
## Produtos

- [Referência de Produtos](https://docs.abacatepay.com/pages/products/reference): Produtos do catálogo usados nos Checkouts. Avulso (`cycle` omitido) ou assinatura (`cycle`: WEEKLY, MONTHLY, SEMIANNUALLY, ANNUALLY). Moeda sempre BRL.
- [GET /products/list](https://docs.abacatepay.com/pages/products/list): Lista os produtos.
Listar produtos

Retorna todos os produtos que você criou com suporte a paginação.

Você pode usar essa rota para visualizar todos os seus produtos, incluindo status, preços, ciclo de assinatura (quando aplicável) e demais informações.

Alternativa: Você também pode visualizar e gerenciar seus produtos pelo Dashboard da AbacatePay.
GET
/
products
/
list
Retorna todos os produtos do seu catálogo.
Requer a permissão PRODUCT:READ.
Use limit, after e before para paginar. Cada item segue o mesmo formato da resposta do Criar Produto, incluindo id, name, price, cycle, trialDays e status.

resposta:

{
  "data": [
    {
      "externalId": "prod-123",
      "name": "Produto Exemplo",
      "description": "Descrição do produto",
      "price": 10000,
      "devMode": false,
      "currency": "BRL",
      "createdAt": "2024-11-04T18:38:28.573Z",
      "updatedAt": "2024-11-04T18:38:28.573Z",
      "status": "ACTIVE",
      "id": "prod_abc123xyz",
      "imageUrl": null,
      "cycle": null,
      "hasFile": false
    }
  ],
  "success": true,
  "error": null,
  "pagination": {
    "hasMore": true,
    "next": "<string>",
    "before": "<string>"
  }
}

- [GET /products/get](https://docs.abacatepay.com/pages/products/get): Busca um produto pelo ID.

Retorna os dados de um produto específico baseado em filtros, incluindo o campo cycle (assinatura ou avulso).

Você pode usar essa rota para buscar um produto por ID ou externalId.
GET
/
products
/
get
Retorna os dados de um produto pelo seu id.
Requer a permissão PRODUCT:READ.
Use para verificar status, price, cycle, trialDays e demais atributos antes de criar um checkout com o produto.

resposta:

{
  "data": {
    "externalId": "prod-123",
    "name": "Produto Exemplo",
    "description": "Descrição do produto",
    "price": 10000,
    "devMode": false,
    "currency": "BRL",
    "createdAt": "2024-11-04T18:38:28.573Z",
    "updatedAt": "2024-11-04T18:38:28.573Z",
    "status": "ACTIVE",
    "id": "prod_abc123xyz",
    "imageUrl": null,
    "cycle": null,
    "hasFile": false
  },
  "error": null,
  "success": true
}
## Cupons

- [Referência de Cupons](https://docs.abacatepay.com/pages/coupons/reference): Descontos aplicáveis nos Checkouts.
- [POST /coupons/create](https://docs.abacatepay.com/pages/coupons/create): Cria um cupom de desconto.
- [GET /coupons/list](https://docs.abacatepay.com/pages/coupons/list): Lista os cupons.

Listar cupons

Retorna todos os cupons que você criou com suporte a paginação.

Você pode usar essa rota para visualizar todos os seus cupons, incluindo seus status (ativos, inativos ou expirados), descontos aplicados e quantas vezes foram utilizados.

Alternativa: Você também pode visualizar e gerenciar seus cupons pelo Dashboard da AbacatePay.
GET
/
coupons
/
list
Retorna todos os cupons da sua loja, incluindo ativos e inativos.
Requer a permissão COUPON:READ.
Use limit, after e before para paginar. Cada item segue o mesmo formato da resposta do Criar Cupom, incluindo status, redeemsCount e maxRedeems.

reposta:

{
  "data": [
    {
      "id": "DEYVIN_20",
      "discountKind": "PERCENTAGE",
      "discount": 123,
      "status": "ACTIVE",
      "createdAt": "2025-05-25T23:43:25.250Z",
      "updatedAt": "2025-05-25T23:43:25.250Z",
      "notes": "Cupom de desconto pro meu público",
      "maxRedeems": -1,
      "redeemsCount": 0,
      "devMode": true,
      "metadata": {}
    }
  ],
  "success": true,
  "error": null,
  "pagination": {
    "hasMore": true,
    "next": "<string>",
    "before": "<string>"
  }
}
- [GET /coupons/get](https://docs.abacatepay.com/pages/coupons/get): Busca um cupom pelo ID.

Buscar um Cupom

Retorna os dados de um cupom específico baseado em filtros.

Você pode usar essa rota para buscar um cupom por ID ou outros critérios.
GET
/
coupons
/
get
Retorna os dados de um cupom pelo seu code.
Requer a permissão COUPON:READ.
Use redeemsCount para acompanhar quantas vezes o cupom já foi utilizado e status para verificar se ainda está ativo.

Resposta

{
  "data": {
    "id": "DEYVIN_20",
    "discountKind": "PERCENTAGE",
    "discount": 123,
    "status": "ACTIVE",
    "createdAt": "2025-05-25T23:43:25.250Z",
    "updatedAt": "2025-05-25T23:43:25.250Z",
    "notes": "Cupom de desconto pro meu público",
    "maxRedeems": -1,
    "redeemsCount": 0,
    "devMode": true,
    "metadata": {}
  },
  "error": null,
  "success": true
}
- [POST /coupons/delete](https://docs.abacatepay.com/pages/coupons/delete): Remove um cupom.
- [POST /coupons/toggle](https://docs.abacatepay.com/pages/coupons/toggle): Ativa ou desativa um cupom.

Alternar Status de um Cupom

Alterna o status de um cupom entre ativo e inativo.

Use essa rota para ativar ou desativar um cupom sem precisar deletá-lo.
POST
/
coupons
/
toggle
Ativa ou desativa um cupom. Cupons inativos não podem ser aplicados em checkouts.
Requer a permissão COUPON:UPDATE.
Chame este endpoint sempre que quiser pausar uma promoção temporariamente ou reativá-la sem precisar recriar o cupom.

resposta:

{
  "data": {
    "id": "DEYVIN_20",
    "discountKind": "PERCENTAGE",
    "discount": 123,
    "status": "ACTIVE",
    "createdAt": "2025-05-25T23:43:25.250Z",
    "updatedAt": "2025-05-25T23:43:25.250Z",
    "notes": "Cupom de desconto pro meu público",
    "maxRedeems": -1,
    "redeemsCount": 0,
    "devMode": true,
    "metadata": {}
  },
  "error": null,
  "success": true
}


## Assinaturas

- [Referência de Assinaturas](https://docs.abacatepay.com/pages/subscriptions/reference): Cobranças recorrentes. Exige produto com `cycle` definido. Checkout aceita apenas 1 item. Métodos padrão: ["CARD"]. Ciclos: WEEKLY, MONTHLY, SEMIANNUALLY, ANNUALLY. Status: PENDING, EXPIRED, CANCELLED, PAID, REFUNDED.

- [POST /subscriptions/create](https://docs.abacatepay.com/pages/subscriptions/create): Cria um Checkout de assinatura. Mesmos parâmetros do Checkout; `items` com exatamente 1 produto com cycle definido.

Criar Checkout de assinatura

Cria um Checkout de assinatura — uma página de pagamento igual ao Checkout comum, mas para cobrança recorrente.

Aceita os mesmos parâmetros do Checkout (returnUrl, completionUrl, customerId, externalId, metadata, coupons, methods). O Checkout de assinatura aceita apenas um produto; o ciclo (frequência) já deve estar definido no produto ao criá-lo na loja — não é enviado no checkout.
POST
/
subscriptions
/
create
Cria um checkout de assinatura. O cliente paga uma vez e entra no ciclo de cobranças recorrentes do produto.
Pré-requisito
O produto referenciado em items deve ter um cycle definido (WEEKLY, MONTHLY, SEMIANNUALLY ou ANNUALLY). Produtos avulsos retornam erro.
Exemplo:

{
  "items": [
    { "id": "prod_abc123xyz", "quantity": 1 }
  ],
  "customerId": "cust_abc123xyz",
  "externalId": "subs-123",
  "completionUrl": "https://seusite.com/sucesso",
  "methods": ["CARD"]
}

Redirecione o cliente para data.url para concluir o primeiro pagamento e ativar a assinatura.
Assinaturas aceitam apenas um produto por checkout. O método padrão é CARD.
Se o produto referenciado tiver trialDays configurado, o checkout cobra R$ 0,00 — apenas tokeniza o cartão. A primeira cobrança pelo valor integral ocorre automaticamente ao final do trial. Consulte a referência de assinaturas para mais detalhes.

resposta:

{
  "data": {
    "id": "bill_abc123xyz",
    "externalId": "pedido-123",
    "url": "https://app.abacatepay.com/pay/bill_abc123xyz",
    "amount": 10000,
    "paidAmount": null,
    "items": [
      {
        "id": "prod_456",
        "quantity": 2
      }
    ],
    "status": "PENDING",
    "coupons": [],
    "devMode": false,
    "customerId": null,
    "returnUrl": null,
    "completionUrl": null,
    "receiptUrl": null,
    "upSellProductId": "prod_bump456xyz",
    "installmentsCount": 3,
    "interest": {
      "value": 100
    },
    "fine": {
      "value": 200,
      "type": "PERCENTAGE"
    },
    "metadata": {},
    "createdAt": "2024-11-04T18:38:28.573Z",
    "updatedAt": "2024-11-04T18:38:28.573Z"
  },
  "error": null,
  "success": true
}

- [GET /subscriptions/list](https://docs.abacatepay.com/pages/subscriptions/list): Lista os Checkouts de assinatura.

- [GET /subscriptions/change-plan](https://dhttps://docs.abacatepay.com/pages/subscriptions/change-plan): Altera o produto principal de uma assinatura ativa.


A mudança é agendada como PENDING e aplicada automaticamente no início do próximo ciclo de cobrança. Só pode existir uma alteração pendente por assinatura — uma nova chamada substitui a anterior ainda não aplicada.

O produto informado em productId deve ter um ciclo de cobrança definido. Produtos avulsos (sem ciclo) retornam erro.
POST
/
subscriptions
/
change-plan
Altera o produto principal de uma assinatura ativa. O novo valor começa a ser cobrado no próximo ciclo de cobrança — o ciclo atual não é afetado.
Requer a permissão SUBSCRIPTION:CREATE.
​
Corpo da requisição
Campo	Tipo	Obrigatório	Descrição
id	string	Sim	ID da assinatura (subs_...)
productId	string	Sim	ID do novo produto (prod_...) — deve ter ciclo definido
quantity	integer	Sim	Quantidade do produto (mínimo 1)
O produto informado em productId precisa ter um cycle configurado (WEEKLY, MONTHLY, SEMIANNUALLY ou ANNUALLY). Produtos avulsos (sem ciclo) retornam erro.
Exemplo — upgrade de plano:

{
  "id": "subs_abc123xyz",
  "productId": "prod_plano_pro",
  "quantity": 1
}

​
Resposta
Retorna um objeto de atualização pendente (status: "PENDING"). A mudança é aplicada automaticamente no início do próximo ciclo.

{
  "data": {
    "id": "subu_abc123xyz",
    "subscriptionId": "subs_abc123xyz",
    "status": "PENDING",
    "productId": "prod_plano_pro",
    "quantity": 1,
    "newAmount": 4990,
    "requestedAt": "2024-12-06T20:05:00.000Z"
  },
  "success": true,
  "error": null
}

Campo	Tipo	Descrição
id	string	ID da atualização pendente (subu_...)
subscriptionId	string	ID da assinatura
status	string	PENDING até o próximo ciclo; APPLIED após aplicado
productId	string	ID do novo produto
quantity	integer	Quantidade do produto
newAmount	integer	Novo valor em centavos (preço × quantidade)
requestedAt	string	Data/hora da solicitação
Um evento subscription.plan_changed é disparado imediatamente após a solicitação, com os detalhes do novo plano e o ID da atualização pendente.
Só pode existir uma atualização PENDING por assinatura. Chamar o endpoint novamente sobrescreve a alteração anterior ainda não aplicada.


- [POST /subscriptions/cancel](https://docs.abacatepay.com/pages/subscriptions/cancel): Cancela uma assinatura ativa.

A assinatura passa para o status CANCELLED e nenhuma cobrança futura será gerada. Esta operação é irreversível.
POST
/
subscriptions
/
cancel
Cancela uma assinatura ativa imediatamente. Parcelas futuras pendentes são canceladas junto.
Requer a permissão SUBSCRIPTION:DELETE.
​
Corpo da requisição
Campo	Tipo	Obrigatório	Descrição
id	string	Sim	ID da assinatura (subs_...)
Exemplo:

{
  "id": "subs_abc123xyz"
}

​
Resposta
Retorna o objeto da assinatura com status atualizado para CANCELLED.

{
  "data": {
    "id": "subs_abc123xyz",
    "customerId": "cust_abc123xyz",
    "amount": 2990,
    "status": "CANCELLED",
    "method": "CARD",
    "coupons": [],
    "devMode": false,
    "trialDays": null,
    "trialEndsAt": null,
    "createdAt": "2024-12-06T20:00:00.000Z",
    "updatedAt": "2024-12-06T20:00:05.000Z"
  },
  "success": true,
  "error": null
}

O cancelamento é aplicado na hora (cancelPolicy: NOW). Não há período de carência — o cliente perde o acesso imediatamente.