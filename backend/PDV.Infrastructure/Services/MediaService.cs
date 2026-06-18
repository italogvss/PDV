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
    // Sem coluna de tamanho por arquivo: cada imagem ocupa até o teto de upload (5MB). O limite
    // de armazenamento do plano (maxStorageMb) é aplicado contra (nº de mídias ativas × 5MB).
    private const int MaxFileMb = 5;

    public async Task<PresignedUrlResponse> GetUploadUrlAsync(MediaCategory category, Guid entityId)
    {
        ValidateCategory(category);
        if (entityId == Guid.Empty)
            throw new BusinessException("O identificador da entidade é obrigatório.");

        // Só conta no upload de uma NOVA imagem (substituir a imagem de uma entidade não soma).
        var current = await repository.GetActiveAsync(category, entityId);
        if (current is null)
        {
            var usedMb = await repository.CountActiveAsync() * MaxFileMb;
            await entitlementService.EnsureWithinLimitAsync(PlanLimits.MaxStorageMb, usedMb);
        }

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
        if (string.IsNullOrWhiteSpace(request.RelativePath))
            throw new BusinessException("O caminho do arquivo é obrigatório.");

        // Salva o novo path na entidade (valida ownership pelos query filters por tenant).
        var updated = await repository.SetEntityImageAsync(request.Category, request.EntityId, request.RelativePath);
        if (!updated)
            throw new NotFoundException("Entidade não encontrada para associar a imagem.");

        // Substitui o registro anterior, se houver. O path é determinístico por entityId,
        // então o PUT sobrescreve a mesma chave — só deletamos do storage se o path mudar.
        var existing = await repository.GetActiveAsync(request.Category, request.EntityId);
        if (existing is not null)
        {
            if (existing.RelativePath != request.RelativePath)
                await storage.DeleteAsync(MediaPathHelper.GetBucket(request.Category), existing.RelativePath);
            await repository.SoftDeleteAsync(existing);
        }

        await repository.AddAsync(new MediaFile
        {
            TenantId = tenantContext.TenantId,
            Category = request.Category,
            EntityId = request.EntityId,
            RelativePath = request.RelativePath,
        });
    }

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
