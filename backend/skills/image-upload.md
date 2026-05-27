# Skill — Upload de imagem (Storage agnóstico)

Use esta skill sempre que precisar implementar upload de imagem em qualquer entidade.
O backend usa `IStorageService` — funciona com MinIO (dev) e S3 (produção) sem mudança de código.

## Fluxo obrigatório (presigned URL)

O arquivo nunca passa pelo backend.

```
1. Frontend  → GET /api/uploads/presigned-url?context=product&entityId={id}
2. Backend   → valida tenant + contexto, gera URL temporária (5 min)
3. Backend   → retorna { uploadUrl, filePath }
4. Frontend  → PUT {uploadUrl} com o arquivo binário (Content-Type: image/webp)
5. Frontend  → PATCH /api/{entidade}/{id} { "imageUrl": "{filePath}" }
6. Backend   → salva o path relativo no banco
```

## Contextos disponíveis

| context | bucket | path gerado |
|---|---|---|
| `product` | `products` | `{tenantId}/products/{entityId}.webp` |
| `expense` | `expenses` | `{tenantId}/expenses/{entityId}.webp` |
| `employee` | `employees` | `{tenantId}/employees/{entityId}.webp` |

Para adicionar novo contexto: incluir na tabela acima e no switch do `UploadsController`.

## Convenções de arquivo

- Formato: sempre `.webp`
- Tamanho máximo: 5MB
- O banco armazena **apenas o path relativo** — nunca a URL completa
- A URL pública é montada em runtime pelo service: `IStorageService.GetPublicUrlAsync`

---

## IStorageService

```csharp
// PDV.Application/Interfaces/IStorageService.cs
public interface IStorageService
{
    Task<string> GeneratePresignedUploadUrlAsync(string bucket, string path, int expiryMinutes);
    Task<string> GetPublicUrlAsync(string bucket, string path);
    Task DeleteAsync(string bucket, string path);
}
```

Implementações: `MinioStorageService` (dev) e `S3StorageService` (produção) — mesma interface, trocar no DI do `Program.cs`.

---

## Template — UploadsController

```csharp
// PDV.Api/Controllers/UploadsController.cs
[ApiController]
[Route("api/uploads")]
[Authorize]
public class UploadsController(IStorageService storage, ITenantContext tenant) : ControllerBase
{
    [HttpGet("presigned-url")]
    public async Task<IActionResult> GetPresignedUrl(
        [FromQuery] string context, [FromQuery] Guid entityId)
    {
        var (bucket, path) = context switch
        {
            "product"  => ("products",  $"{tenant.TenantId}/products/{entityId}.webp"),
            "expense"  => ("expenses",  $"{tenant.TenantId}/expenses/{entityId}.webp"),
            "employee" => ("employees", $"{tenant.TenantId}/employees/{entityId}.webp"),
            _ => throw new BusinessException($"Contexto de upload inválido: {context}.")
        };

        var url = await storage.GeneratePresignedUploadUrlAsync(bucket, path, expiryMinutes: 5);
        return Ok(new { uploadUrl = url, filePath = path });
    }
}
```

---

## Regras importantes

- Todo path começa com `{tenantId}/` — sem exceção
- Nunca salvar a URL completa no banco — só o path relativo
- **Ao atualizar imagem:** primeiro salvar o novo path no banco, depois deletar o arquivo antigo — nunca o inverso
- **Ao fazer soft delete:** não deletar a imagem — apenas ignorar em runtime (path fica órfão, limpeza é tarefa de manutenção)
- Nunca expor o endpoint de presigned URL sem `[Authorize]`