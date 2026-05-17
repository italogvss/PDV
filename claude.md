# PDV-Ultra — Visão Geral do Projeto

Sistema de gestão para pequenos comércios e prestadores de serviço, comercializado como SaaS com cobrança por assinatura. O diferencial é a simplicidade: interface direta, sem excesso de funcionalidades, feita para donos de negócio que não têm experiência técnica.

---

## Stack

| Camada | Tecnologia |
|---|---|
| Front-end | React + TypeScript + MUI (Material UI) |
| Back-end | ASP.NET Core + Entity Framework Core |
| Banco de dados | MySQL |
| Armazenamento de arquivos | MinIO (self-hosted, compatível com S3) |
| Mobile (futuro) | Capacitor (wrapper do front-end web) |

---

## Estrutura do repositório

```
/
├── CLAUDE.md          ← este arquivo
├── /frontend          ← aplicação React + TypeScript + MUI
└── /backend           ← API ASP.NET Core + EF Core
```

Cada pasta possui seu próprio `CLAUDE.md` com instruções específicas da camada.

---

## Arquitetura multi-tenant

O sistema atende múltiplos clientes (tenants) em uma única instância, usando **banco de dados compartilhado com coluna `TenantId`** em todas as entidades.

### Regra crítica
Toda entidade que pertence a um tenant **obrigatoriamente** possui `TenantId`. O `DbContext` aplica um `HasQueryFilter` global que injeta o tenant correto em todas as queries automaticamente. Nunca remover ou contornar esse filtro.

### Como o tenant é resolvido
O middleware do ASP.NET lê o tenant a partir do subdomínio da requisição (ex: `loja123.pdvultra.com.br`) e injeta o `TenantId` no contexto da requisição. Todos os serviços recebem o tenant via injeção de dependência — nunca via parâmetro manual nas queries.

### Risco principal
Se o `HasQueryFilter` for ignorado ou desativado em alguma query, dados de um tenant podem vazar para outro. Qualquer `IgnoreQueryFilters()` deve ser revisado e justificado explicitamente.

---

## Armazenamento de arquivos (MinIO)

O sistema usa **MinIO self-hosted** como storage de arquivos, rodando via Docker junto com a aplicação. A API do MinIO é compatível com o protocolo S3, então o SDK usado no .NET é o `AWSSDK.S3` ou `Minio` (NuGet) — ambos funcionam apontando para o endpoint do MinIO.

### Usos de imagem no sistema

| Contexto | Bucket | Exemplo de path |
|---|---|---|
| Foto de produto | `products` | `{tenantId}/products/{productId}.webp` |

> Outros contextos (logo da loja, comprovantes de despesa, foto de funcionário) podem ser adicionados futuramente seguindo o mesmo padrão de path.

### Regra de isolamento por tenant
Todo path de arquivo **deve começar com `{tenantId}/`**. Isso garante isolamento lógico dentro do mesmo bucket. Nunca salvar um arquivo sem o prefixo do tenant.

### Como o upload funciona
O fluxo padrão é via **presigned URL**: o front-end solicita ao back-end uma URL temporária de upload, faz o PUT direto no MinIO sem passar pelo back-end, e depois notifica o back-end com o path final. Isso evita que arquivos grandes trafeguem pela API.

```
Front-end → GET /api/uploads/presigned-url?context=product&id=123
Back-end  → retorna { url: "http://minio:9000/products/...", expiresIn: 300 }
Front-end → PUT {url} com o arquivo
Front-end → PATCH /api/products/123 { imageUrl: "{tenantId}/products/123.webp" }
```


### Convenções de imagem
- Converter imagens para `.webp` antes de salvar (melhor compressão)
- Tamanho máximo por upload: 5MB
- O banco de dados armazena apenas o **path relativo** (`{tenantId}/products/123.webp`), nunca a URL completa — a URL é montada em runtime pelo back-end

---

## Funcionalidades existentes

Estas funcionalidades já estão implementadas no sistema original (single-tenant) e serão migradas/refatoradas:

- **Gestão de estoque** — cadastro de produtos, controle de quantidade
- **PDV / Vendas** — registro de vendas simples
- **Gráficos de lucro** — visualização de receita por período
- **Cadastro de funcionários** — usuários vinculados ao negócio
- **Controle de despesas** — lançamento e categorização de despesas

## Convenções gerais

- Idioma do código: inglês (nomes de classes, variáveis, métodos)
- Idioma da interface e comentários: português brasileiro
- Simplicidade acima de tudo — evitar abstrações desnecessárias
- Antes de criar uma nova abstração, verificar se uma solução mais direta resolve
- PRs que tocam em filtros de tenant exigem revisão explícita
---

## O que não fazer

- Nunca usar `IgnoreQueryFilters()` sem justificativa documentada no código
- Nunca hardcodar `TenantId` em queries manuais
- Nunca salvar um arquivo no MinIO sem o prefixo `{tenantId}/` no path
- Nunca salvar a URL completa do MinIO no banco — apenas o path relativo
- Nunca fazer upload de arquivo passando pelo back-end como intermediário — usar presigned URL
- Nunca adicionar funcionalidades complexas antes da base multi-tenant estar funcionando
- Não otimizar prematuramente — o foco inicial é estabilidade e simplicidade