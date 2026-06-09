# Prompt — Módulo de Mídia (Backend + Frontend)

**Convenções obrigatórias do projeto:**
- Código em inglês, comentários e mensagens de interface em português brasileiro
- Multi-tenant: `TenantId` vem do claim JWT via `ITenantContext` — nunca hardcoded em query
- Controllers finos: sem lógica de negócio
- Services lançam `NotFoundException` e `BusinessException` — capturados pelo `ExceptionMiddleware`
- Respostas sempre em Problem Details (RFC 7807)
- Nunca retornar entidade do domínio diretamente — sempre mapear para DTO
- `IgnoreQueryFilters()` só com comentário justificando

---

## Visão geral da solução

O upload **nunca passa pelo backend como intermediário**. O backend apenas gera uma presigned URL temporária; o frontend faz o PUT diretamente no MinIO. Isso evita consumo de memória/CPU do servidor para mover arquivos.

A imagem é convertida para `.webp` **no frontend** antes do upload, já que o arquivo vai direto pro MinIO sem passar pelo backend.

Após o upload, o frontend notifica o backend com o path relativo para que a entidade seja atualizada.

---

## Requisitos funcionais

1. Gerar presigned URL de upload com categorias distintas de imagens (enum `MediaCategory`) — cada categoria corresponde a um bucket no MinIO
2. Conversão obrigatória para `.webp` no frontend antes do PUT no MinIO
3. Após upload concluído, frontend notifica o backend com o path relativo
4. Backend registra um `MediaFile` no banco e atualiza `imageUrl` na entidade correspondente (`UpdatedAt` também atualizado)
5. Ao trocar imagem, o arquivo antigo é deletado do MinIO e o `MediaFile` antigo é removido do banco pelo service
6. Gerar presigned URL de leitura para servir imagens (válida por tempo configurável)
7. Ao deletar um tenant, todos os `MediaFile` do tenant são deletados do banco e os arquivos removidos do MinIO

## Requisitos não funcionais

1. **Tamanho máximo:** 5MB por imagem
2. **Tipos aceitos:** `image/jpeg`, `image/png`, `image/webp`
3. **Formato de saída:** sempre `.webp` (conversão no frontend)
4. **Isolamento de tenant:** todo path obrigatoriamente começa com `{tenantId}/{category}/`
5. **Cache busting:** a presigned URL de leitura é gerada com `?v={UpdatedAt.Ticks}` como parâmetro extra para invalidar cache do navegador quando a imagem for trocada
6. **Segurança:** presigned URLs de upload válidas por 5 minutos; presigned URLs de leitura válidas por 1 hora
7. **Migração para AWS S3:** só requer trocar endpoint + credenciais no `appsettings.json` — nenhuma linha de código muda

---

## Enum de categorias

```csharp
// PDV.Domain/Enums/MediaCategory.cs
public enum MediaCategory
{
    Profile,   // bucket: "profile"   — avatares de usuário/funcionário
    Product,   // bucket: "product"   — fotos de produto
    Service,   // bucket: "service"   — fotos de serviço
    Tenant,    // bucket: "tenant"    — logo da loja
}
```

Cada valor do enum mapeia para um bucket de mesmo nome (lowercase) no MinIO.

---

## Estrutura de paths

| Categoria | Bucket    | Path relativo                              |
|-----------|-----------|--------------------------------------------|
| Profile   | profile   | `{tenantId}/profile/{entityId}.webp`       |
| Product   | product   | `{tenantId}/product/{entityId}.webp`       |
| Service   | service   | `{tenantId}/service/{entityId}.webp`       |
| Tenant    | tenant    | `{tenantId}/tenant/{entityId}.webp`        |

O banco armazena **somente o path relativo** — nunca a URL completa nem a presigned URL.

Helper centralizado para resolver bucket e path:

```csharp
// PDV.Application/Helpers/MediaPathHelper.cs
public static class MediaPathHelper
{
    public static string GetBucket(MediaCategory category) =>
        category.ToString().ToLowerInvariant();

    public static string GetRelativePath(MediaCategory category, Guid tenantId, Guid entityId) =>
        $"{tenantId}/{category.ToString().ToLowerInvariant()}/{entityId}.webp";
}
```

---

## Entidade `MediaFile`

```csharp
// PDV.Domain/Entities/MediaFile.cs
public class MediaFile : BaseEntity
{
    public Guid TenantId { get; set; }
    public Tenant Tenant { get; set; } = null!;       // FK com cascade delete
    public MediaCategory Category { get; set; }
    public string RelativePath { get; set; } = string.Empty;
    public Guid EntityId { get; set; }                // Id da entidade dona da imagem
}
```

### Configuração EF Core (cascade delete por tenant)

```csharp
// No AppDbContext ou configuração Fluent API
modelBuilder.Entity<MediaFile>()
    .HasOne(m => m.Tenant)
    .WithMany()
    .HasForeignKey(m => m.TenantId)
    .OnDelete(DeleteBehavior.Cascade);  // deleta MediaFile ao deletar Tenant
```

O `HasQueryFilter` padrão do projeto já filtra por `TenantId` e `IsActive`.

Criar migration EF Core para a nova entidade e para adicionar `ImageUrl` em `Product` (as demais entidades já possuem o campo).

### Campos `imageUrl` nas entidades

| Entidade        | Como deve estar |
|-----------------|-----------------|
| `Product`       | `public string? ImageUrl { get; set; }`|
| `Employee`      | `AvatarUrl`     | 
| `TenantSettings`| `LogoUrl`       | 
| `User`          | `AvatarUrl`     | 

---

## Contrato da interface de storage

```csharp
// PDV.Application/Interfaces/IStorageService.cs
public interface IStorageService
{
    // Gera presigned URL para o frontend fazer PUT direto no MinIO (válida 5 min)
    Task<string> GenerateUploadUrlAsync(string bucket, string relativePath, CancellationToken ct = default);

    // Gera presigned URL de leitura (válida 1h) com ?v={updatedAt.Ticks} para cache busting
    Task<string> GenerateReadUrlAsync(string bucket, string relativePath, DateTime updatedAt, CancellationToken ct = default);

    // Deleta o arquivo do storage
    Task DeleteAsync(string bucket, string relativePath, CancellationToken ct = default);
}
```

## Implementação MinIO

```csharp
// PDV.Infrastructure/Storage/MinioStorageService.cs
// Usar AWSSDK.S3 ou Minio SDK oficial para .NET
// GenerateUploadUrlAsync → presigned PUT, expiry 5 min
// GenerateReadUrlAsync   → presigned GET, expiry 1h, query param v={ticks}
// DeleteAsync            → DeleteObjectAsync
```

Configuração no `appsettings.json`:
```json
{
  "Storage": {
    "Endpoint": "localhost:9000",
    "AccessKey": "...",
    "SecretKey": "...",
    "UseSSL": false,
    "ReadUrlExpireMinutes": 60,
    "UploadUrlExpireMinutes": 5
  }
}
```

Secrets (`AccessKey`, `SecretKey`) **nunca commitados** — usar `dotnet user-secrets` em dev e variáveis de ambiente em produção.

---

## Fluxos

### Fluxo de upload

```
1. Frontend valida o arquivo: tipo (jpeg/png/webp) e tamanho (≤ 5MB)
2. Frontend converte o arquivo para .webp usando canvas API
3. Frontend → GET /api/media/presigned-url?category=Product&entityId=123
4. Backend valida category e entityId, confirma que a entidade pertence ao tenant (via ITenantContext)
5. Backend gera presigned URL de upload via IStorageService (válida 5 min)
6. Backend retorna:
   {
     "uploadUrl": "http://minio:9000/product/{tenantId}/product/123.webp?X-Amz-...",
     "relativePath": "{tenantId}/product/123.webp"
   }
7. Frontend → PUT {uploadUrl} com o blob .webp (direto no MinIO, sem passar pelo backend)
8. Frontend → PATCH /api/media/confirm
   Body: { "category": "Product", "entityId": "123", "relativePath": "{tenantId}/product/123.webp" }
9. Backend busca MediaFile existente para (tenantId, category, entityId) se houver:
   - Chama IStorageService.DeleteAsync(bucket, oldRelativePath) para remover do MinIO
   - Remove o MediaFile antigo do banco
10. Backend cria novo MediaFile no banco
11. Backend atualiza o campo imageUrl/avatarUrl/logoUrl na entidade correspondente e UpdatedAt
12. Backend retorna 204 No Content
13. Frontend invalida a query da entidade (TanStack Query) — rebusca com imageUrl atualizada
```

### Fluxo de leitura

```
- O DTO de cada entidade inclui imageUrl já resolvida como presigned URL
- Backend gera a URL no Map() do service:
    imageUrl = await storageService.GenerateReadUrlAsync(bucket, relativePath, updatedAt)
    → "http://minio:9000/product/{tenantId}/product/123.webp?X-Amz-...&v=638500000000"
- Frontend usa diretamente em <img src={product.imageUrl} />
- Quando UpdatedAt muda, a URL muda → navegador busca imagem nova (cache busting automático)
```

### Fluxo de remoção de imagem

```
1. Frontend → DELETE /api/media?category=Product&entityId=123
2. Backend busca MediaFile por (tenantId, category, entityId) — NotFoundException se não encontrar
3. Backend chama IStorageService.DeleteAsync(bucket, relativePath)
4. Backend remove o MediaFile do banco (soft delete via IsActive = false)
5. Backend limpa imageUrl/avatarUrl/logoUrl na entidade correspondente e atualiza UpdatedAt
6. Backend retorna 204 No Content
```

### Fluxo de deleção de tenant (cascade)

```
- EF Core cascade delete remove todos os MediaFile do tenant automaticamente ao deletar o Tenant
- O TenantService deve, ANTES de deletar o tenant:
  1. Buscar todos os MediaFile do tenant (IgnoreQueryFilters — justificativa: deleção de tenant requer acesso total aos próprios dados)
  2. Para cada MediaFile, chamar IStorageService.DeleteAsync(bucket, relativePath)
  3. Em seguida, prosseguir com o soft delete do Tenant (IsActive = false)
  4. O cascade delete do EF Core remove os MediaFile do banco
```

---

## Controller

```
GET    /api/media/presigned-url     → gera presigned URL de upload
PATCH  /api/media/confirm           → confirma upload, atualiza entidade
DELETE /api/media                   → remove imagem da entidade
```

`MediaController` em `PDV.Api/Controllers/`. Todos os endpoints requerem `[Authorize]`.

### DTOs

```csharp
// GET /api/media/presigned-url?category=Product&entityId=123
public record PresignedUrlResponse(string UploadUrl, string RelativePath);

// PATCH /api/media/confirm
public record ConfirmUploadRequest(MediaCategory Category, Guid EntityId, string RelativePath);

// DELETE /api/media?category=Product&entityId=123
// Response: 204 No Content
```

### Validações do backend

- `category` deve ser um valor válido do enum `MediaCategory` — `BusinessException` se não for
- `entityId` obrigatório em todos os endpoints
- A entidade referenciada deve pertencer ao tenant do JWT (filtro automático via `HasQueryFilter`)
- Se entidade não encontrada: `NotFoundException`
- Não validar o arquivo no backend — validação é responsabilidade do frontend (arquivo não passa pelo backend)

---

## Frontend

### Conversão para .webp via Canvas API

```ts
// utils/image.utils.ts
export async function convertToWebp(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.width
      canvas.height = img.height
      canvas.getContext('2d')!.drawImage(img, 0, 0)
      canvas.toBlob(
        (blob) => {
          URL.revokeObjectURL(url)
          blob ? resolve(blob) : reject(new Error('Falha ao converter imagem.'))
        },
        'image/webp',
        0.85
      )
    }
    img.onerror = () => reject(new Error('Falha ao carregar imagem.'))
    img.src = url
  })
}

export function validateImageFile(file: File): string | null {
  const ALLOWED = ['image/jpeg', 'image/png', 'image/webp']
  if (!ALLOWED.includes(file.type)) return 'Formato não suportado. Use JPEG, PNG ou WebP.'
  if (file.size > 5 * 1024 * 1024) return 'Imagem muito grande. Tamanho máximo: 5MB.'
  return null
}
```

### Tipos

```ts
// types/media.types.ts
export type MediaCategory = 'Profile' | 'Product' | 'Service' | 'Tenant'

export interface PresignedUrlResponse {
  uploadUrl: string
  relativePath: string
}
```

### Service

```ts
// services/media.service.ts
export const mediaService = {
  getPresignedUrl: async (category: MediaCategory, entityId: string): Promise<PresignedUrlResponse> => {
    const { data } = await api.get<PresignedUrlResponse>('/media/presigned-url', {
      params: { category, entityId },
    })
    return data
  },

  // PUT direto no MinIO — não usa o `api` (não tem baseURL do backend)
  uploadToMinio: async (uploadUrl: string, blob: Blob): Promise<void> => {
    await fetch(uploadUrl, {
      method: 'PUT',
      body: blob,
      headers: { 'Content-Type': 'image/webp' },
    })
  },

  confirm: async (category: MediaCategory, entityId: string, relativePath: string): Promise<void> => {
    await api.patch('/media/confirm', { category, entityId, relativePath })
  },

  remove: async (category: MediaCategory, entityId: string): Promise<void> => {
    await api.delete('/media', { params: { category, entityId } })
  },
}
```

### Hook

```ts
// hooks/useMediaUpload.ts
export function useUploadImage(category: MediaCategory, queryKeyToInvalidate: readonly unknown[]) {
  const queryClient = useQueryClient()
  const showToast = useToast()
  const handleError = useApiError()

  return useMutation({
    mutationFn: async ({ file, entityId }: { file: File; entityId: string }) => {
      const validationError = validateImageFile(file)
      if (validationError) throw new Error(validationError)

      const webpBlob = await convertToWebp(file)
      const { uploadUrl, relativePath } = await mediaService.getPresignedUrl(category, entityId)
      await mediaService.uploadToMinio(uploadUrl, webpBlob)
      await mediaService.confirm(category, entityId, relativePath)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeyToInvalidate })
      showToast('Imagem atualizada com sucesso!', 'success')
    },
    onError: (error) => handleError(error, 'Erro ao fazer upload da imagem.'),
  })
}

export function useRemoveImage(category: MediaCategory, queryKeyToInvalidate: readonly unknown[]) {
  const queryClient = useQueryClient()
  const showToast = useToast()
  const handleError = useApiError()

  return useMutation({
    mutationFn: (entityId: string) => mediaService.remove(category, entityId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeyToInvalidate })
      showToast('Imagem removida com sucesso!', 'success')
    },
    onError: (error) => handleError(error, 'Erro ao remover imagem.'),
  })
}
```

### Componente reutilizável `ImageUpload`

Criar em `components/ImageUpload/index.tsx`:

```ts
// components/ImageUpload/types.ts
export interface Props {
  currentUrl?: string | null  // presigned URL de leitura já resolvida pelo backend
  onUpload: (file: File) => void
  onRemove?: () => void
  isLoading?: boolean
  shape?: 'square' | 'circle'  // square para produto/serviço, circle para avatar/logo
  size?: number                 // tamanho em px (padrão: 120)
  label?: string                // ex: "Foto do produto"
}
```

Comportamento:
- Exibe imagem atual se `currentUrl` existir
- Exibe placeholder com ícone de câmera se não houver imagem
- Clique abre file picker (`input type="file"` hidden, `accept="image/jpeg,image/png,image/webp"`)
- Loading spinner enquanto `isLoading` for true
- Botão remover (X) sobre a imagem se `onRemove` for fornecido
- Usar tokens do tema MUI — nunca cores hardcoded

---

## Observação sobre migração para AWS S3

Quando migrar do MinIO local para AWS S3:
1. Trocar `Endpoint`, `AccessKey` e `SecretKey` no `appsettings.json`
2. Setar `UseSSL: true`
3. Criar os buckets (`profile`, `product`, `service`, `tenant`) no S3
4. Rodar script de migração copiando arquivos do MinIO para S3 mantendo os mesmos paths relativos
5. O banco não muda — paths relativos são idênticos
6. Nenhuma linha de código da aplicação muda

---

## O que NÃO fazer

- Não passar `TenantId` manualmente em queries — usar `ITenantContext`
- Não salvar URL completa nem presigned URL no banco — somente path relativo
- Não fazer o arquivo de imagem passar pelo backend — PUT direto no MinIO
- Não commitar secrets (`AccessKey`, `SecretKey`) — usar user-secrets / variáveis de ambiente
- Não usar `any` ou `as` no TypeScript
- Não acessar `AppDbContext` fora de Infrastructure
- Não colocar lógica de negócio no Controller
- Não usar `React.FC` ou arrow function para componentes
- Não deletar o `MediaFile` fisicamente em fluxos normais — usar `IsActive = false`. Exceção: cascade delete de tenant, que é deleção física via EF Core