using PDV.Application.DTOs.Media;
using PDV.Application.Helpers;
using PDV.Application.Interfaces;
using PDV.Domain.Constants;
using PDV.Domain.Entities;
using PDV.Domain.Enums;
using PDV.Domain.Exceptions;
using PDV.Domain.Interfaces;

namespace PDV.Infrastructure.Services;

public class MediaService(
    IMediaRepository repository,
    IStorageService storage,
    IEntitlementService entitlementService,
    ITenantContext tenantContext) : IMediaService
{
    private const long MaxFileSizeBytes = 5 * 1024 * 1024;

    public async Task<PresignedUrlResponse> GetUploadUrlAsync(MediaCategory category, Guid entityId)
    {
        ValidateCategory(category);
        if (entityId == Guid.Empty)
            throw new BusinessException("O identificador da entidade é obrigatório.");

        // Feature Pro: foto de produto só com o entitlement (demais categorias são livres).
        if (category == MediaCategory.Product)
            await entitlementService.RequireEntitlementAsync(EntitlementCatalog.ProductWithPhoto);

        var bucket = MediaPathHelper.GetBucket(category);
        var relativePath = MediaPathHelper.GetRelativePath(category, tenantContext.TenantId, entityId);

        var uploadUrl = await storage.GenerateUploadUrlAsync(bucket, relativePath);
        return new PresignedUrlResponse(uploadUrl, relativePath);
    }

    public async Task ConfirmAsync(ConfirmUploadRequest request)
    {
        ValidateCategory(request.Category);
        if (request.EntityId == Guid.Empty)
            throw new BusinessException("O identificador da entidade é obrigatório.");

        // Feature Pro: foto de produto só com o entitlement.
        if (request.Category == MediaCategory.Product)
            await entitlementService.RequireEntitlementAsync(EntitlementCatalog.ProductWithPhoto);

        // O path nunca vem do cliente — é sempre recalculado a partir de category+tenantId+entityId,
        // senão um usuário do próprio tenant poderia apontar a entidade para o arquivo de outro tenant.
        var bucket = MediaPathHelper.GetBucket(request.Category);
        var relativePath = MediaPathHelper.GetRelativePath(request.Category, tenantContext.TenantId, request.EntityId);

        var size = await storage.GetObjectSizeAsync(bucket, relativePath)
            ?? throw new BusinessException("Upload não encontrado. Envie o arquivo antes de confirmar.");

        if (size > MaxFileSizeBytes)
        {
            await storage.DeleteAsync(bucket, relativePath);
            throw new BusinessException("Imagem excede o tamanho máximo de 5MB.");
        }

        var header = await storage.GetObjectHeadBytesAsync(bucket, relativePath, 12);
        if (!IsValidWebpSignature(header))
        {
            await storage.DeleteAsync(bucket, relativePath);
            throw new BusinessException("Arquivo enviado não é uma imagem WebP válida.");
        }

        // Salva o novo path na entidade (valida ownership pelos query filters por tenant).
        var updated = await repository.SetEntityImageAsync(request.Category, request.EntityId, relativePath);
        if (!updated)
            throw new NotFoundException("Entidade não encontrada para associar a imagem.");

        // Substitui o registro anterior, se houver. O path é determinístico por entityId,
        // então o PUT sobrescreve a mesma chave — só deletamos do storage se o path mudar.
        var existing = await repository.GetActiveAsync(request.Category, request.EntityId);
        if (existing is not null)
        {
            if (existing.RelativePath != relativePath)
                await storage.DeleteAsync(bucket, existing.RelativePath);
            await repository.SoftDeleteAsync(existing);
        }

        await repository.AddAsync(new MediaFile
        {
            TenantId = tenantContext.TenantId,
            Category = request.Category,
            EntityId = request.EntityId,
            RelativePath = relativePath,
        });
    }

    // Assinatura do container RIFF/WebP: bytes 0-3 "RIFF", bytes 8-11 "WEBP".
    // É o único formato aceito — a conversão pra .webp é obrigatória no frontend antes do upload.
    private static bool IsValidWebpSignature(byte[] header) =>
        header.Length >= 12 &&
        header[0] == (byte)'R' && header[1] == (byte)'I' && header[2] == (byte)'F' && header[3] == (byte)'F' &&
        header[8] == (byte)'W' && header[9] == (byte)'E' && header[10] == (byte)'B' && header[11] == (byte)'P';

    public async Task RemoveAsync(MediaCategory category, Guid entityId)
    {
        ValidateCategory(category);

        var existing = await repository.GetActiveAsync(category, entityId)
            ?? throw new NotFoundException("Imagem não encontrada.");

        await storage.DeleteAsync(MediaPathHelper.GetBucket(category), existing.RelativePath);
        await repository.SoftDeleteAsync(existing);

        var updated = await repository.SetEntityImageAsync(category, entityId, null);
        if (!updated)
            throw new NotFoundException("Entidade não encontrada.");
    }

    private static void ValidateCategory(MediaCategory category)
    {
        if (!Enum.IsDefined(category))
            throw new BusinessException("Categoria de mídia inválida.");
    }
}
