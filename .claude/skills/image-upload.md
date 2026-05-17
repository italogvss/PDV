# Skill — Upload de imagem via MinIO

Use esta skill sempre que precisar implementar upload de imagem em qualquer entidade.

## Fluxo obrigatório (presigned URL)

O arquivo nunca passa pelo backend. O frontend faz upload direto no MinIO.

```
1. Frontend  → GET /api/uploads/presigned-url?context=product&entityId={id}
2. Backend   → valida tenant + contexto, gera URL temporária (5 min)
3. Backend   → retorna { uploadUrl, filePath }
4. Frontend  → PUT {uploadUrl} com o arquivo binário
5. Frontend  → PATCH /api/products/{id} { "imageUrl": "{filePath}" }
6. Backend   → salva o path relativo no banco
```

## Contextos disponíveis

| context | bucket | path gerado |
|---|---|---|
| `product` | `products` | `{tenantId}/products/{entityId}.webp` |

Para adicionar novo contexto: incluir na tabela acima e no `UploadContextResolver`.

## Convenções de arquivo

- Formato: sempre `.webp`
- Tamanho máximo: 5MB (validar no backend antes de gerar a URL)
- O banco armazena **apenas o path relativo** — nunca a URL completa
- A URL pública é montada em runtime: `{MINIO_ENDPOINT}/{bucket}/{path}`

## Template — endpoint de presigned URL

```csharp
// PDVUltra.Api/Controllers/UploadsController.cs
[ApiController]
[Route("api/uploads")]
[Authorize]
public class UploadsController : ControllerBase
{
    private readonly IStorageService _storage;
    private readonly ITenantContext _tenant;

    [HttpGet("presigned-url")]
    public async Task<IActionResult> GetPresignedUrl([FromQuery] string context, [FromQuery] Guid entityId)
    {
        var path = $"{_tenant.TenantId}/{context}s/{entityId}.webp";
        var bucket = context switch
        {
            "product" => "products",
            _ => throw new ArgumentException("Contexto inválido.")
        };

        var url = await _storage.GeneratePresignedUploadUrlAsync(bucket, path, expiryMinutes: 5);

        return Ok(new { data = new { uploadUrl = url, filePath = path }, error = (object?)null });
    }
}
```

## Template — IStorageService

```csharp
// PDVUltra.Application/Interfaces/IStorageService.cs
public interface IStorageService
{
    Task<string> GeneratePresignedUploadUrlAsync(string bucket, string path, int expiryMinutes);
    Task<string> GetPublicUrlAsync(string bucket, string path);
    Task DeleteAsync(string bucket, string path);
}
```

## Regras importantes

- Nunca salvar a URL completa do MinIO no banco — só o path relativo
- Todo path começa com `{tenantId}/` sem exceção
- Ao atualizar imagem de uma entidade, deletar o arquivo antigo do MinIO antes de salvar o novo path
- Ao fazer soft delete de uma entidade, **não** deletar a imagem imediatamente — agendar para limpeza posterior
