using FluentValidation;
using PDV.Application.DTOs.Common;
using PDV.Application.DTOs.ServiceCategories;
using PDV.Application.DTOs.Services;
using PDV.Application.Helpers;
using PDV.Application.Interfaces;
using PDV.Domain.Constants;
using PDV.Domain.Entities;
using PDV.Domain.Enums;
using PDV.Domain.Exceptions;
using PDV.Domain.Interfaces;

namespace PDV.Infrastructure.Services;

public class ServiceService(
    IServiceRepository repository,
    ITenantContext tenantContext,
    IStorageService storage,
    IAuditLogger auditLogger,
    IEntitlementService entitlementService,
    IValidator<CreateServiceRequest> createValidator,
    IValidator<UpdateServiceRequest> updateValidator) : IServiceService
{
    public async Task<PaginatedResponse<ServiceResponse>> GetAllAsync(
        int page, int pageSize,
        string? name = null,
        Guid? categoryId = null,
        string? sortBy = null, string? sortOrder = null)
    {
        var (data, totalCount) = await repository.GetAllAsync(page, pageSize, name, categoryId, sortBy, sortOrder);
        var totalPages = (int)Math.Ceiling((double)totalCount / pageSize);
        var mapped = await Task.WhenAll(data.Select(Map));
        return new PaginatedResponse<ServiceResponse>(mapped, page, pageSize, totalCount, totalPages);
    }

    public async Task<ServiceResponse> GetByIdAsync(Guid id)
    {
        var service = await repository.GetByIdAsync(id)
            ?? throw new NotFoundException("Serviço não encontrado.");
        return await Map(service);
    }

    public async Task<ServiceResponse> CreateAsync(CreateServiceRequest request)
    {
        await createValidator.ValidateAndThrowAsync(request);

        var service = new Service
        {
            TenantId = tenantContext.TenantId,
            Name = request.Name,
            Description = request.Description,
            DurationMinutes = request.DurationMinutes,
            Price = request.Price,
            CategoryId = request.CategoryId,
            IsActive = request.IsActive,
            CostPrice = request.CostPrice,
        };

        await repository.AddAsync(service);

        if (request.Products is not null)
        {
            var serviceProducts = request.Products
                .Where(p => p.Quantity > 0)
                .Select(p => new ServiceProduct
                {
                    Id = Guid.NewGuid(),
                    ServiceId = service.Id,
                    ProductId = p.ProductId,
                    Quantity = p.Quantity,
                })
                .ToList();

            if (serviceProducts.Count > 0)
            {
                // Feature Pro: vincular produtos a um serviço.
                await entitlementService.RequireEntitlementAsync(EntitlementCatalog.ProductLinkedToService);
                await repository.ReplaceServiceProductsAsync(service.Id, serviceProducts);
            }
        }

        var created = await repository.GetByIdAsync(service.Id)
            ?? throw new NotFoundException("Serviço não encontrado após criação.");
        return await Map(created);
    }

    public async Task<ServiceResponse> UpdateAsync(Guid id, UpdateServiceRequest request)
    {
        await updateValidator.ValidateAndThrowAsync(request);

        var service = await repository.GetByIdAsync(id)
            ?? throw new NotFoundException("Serviço não encontrado.");

        if (request.Price != service.Price)
            await auditLogger.LogServicePriceChangedAsync(id, service.Name, service.Price, request.Price);

        service.Name = request.Name;
        service.Description = request.Description;
        service.DurationMinutes = request.DurationMinutes;
        service.Price = request.Price;
        service.CategoryId = request.CategoryId;
        service.IsActive = request.IsActive;
        service.CostPrice = request.CostPrice;

        await repository.UpdateAsync(service);

        var serviceProducts = (request.Products ?? [])
            .Where(p => p.Quantity > 0)
            .Select(p => new ServiceProduct
            {
                Id = Guid.NewGuid(),
                ServiceId = id,
                ProductId = p.ProductId,
                Quantity = p.Quantity,
            })
            .ToList();

        // Feature Pro: vincular produtos a um serviço (lista vazia = desvincula, sempre permitido).
        if (serviceProducts.Count > 0)
            await entitlementService.RequireEntitlementAsync(EntitlementCatalog.ProductLinkedToService);

        await repository.ReplaceServiceProductsAsync(id, serviceProducts);

        var updated = await repository.GetByIdAsync(service.Id)
            ?? throw new NotFoundException("Serviço não encontrado após atualização.");
        return await Map(updated);
    }

    public async Task DeleteAsync(Guid id)
    {
        var service = await repository.GetByIdAsync(id)
            ?? throw new NotFoundException("Serviço não encontrado.");

        await auditLogger.LogServiceDeactivatedAsync(service.Id, service.Name);

        service.IsActive = false;
        service.UpdatedAt = DateTime.UtcNow;
        await repository.UpdateAsync(service);
    }

    public Task<int> PurgeAllAsync() => repository.PurgeAllAsync();

    public async Task<IEnumerable<ServiceResponse>> GetAllInactiveAsync()
    {
        var data = await repository.GetAllInactiveAsync();
        return await Task.WhenAll(data.Select(Map));
    }

    public async Task RestoreAsync(Guid id)
    {
        var entity = await repository.GetInactiveByIdAsync(id)
            ?? throw new NotFoundException("Serviço não encontrado.");
        await repository.RestoreAsync(entity);
    }

    public async Task HardDeleteAsync(Guid id)
    {
        var entity = await repository.GetInactiveByIdAsync(id)
            ?? throw new NotFoundException("Serviço não encontrado.");
        await repository.HardDeleteAsync(entity);
    }

    private static ServiceCategoryResponse? MapCategory(ServiceCategory? c) =>
        c is null ? null : new(c.Id, c.Name, c.Color);

    // Product pode ser null quando o EF Core aplica o query filter de IsActive no ThenInclude.
    private static IEnumerable<ServiceProductResponse> MapProducts(IEnumerable<ServiceProduct> products) =>
        products
            .Where(sp => sp.Product != null)
            .Select(sp => new ServiceProductResponse(
                sp.ProductId,
                sp.Product!.Name,
                sp.Product.PurchasePrice,
                sp.Product.Price,
                sp.Quantity));

    private async Task<ServiceResponse> Map(Service s) =>
        new(s.Id, s.Name, s.Description, s.DurationMinutes, s.Price, s.IsActive, s.CreatedAt, s.UpdatedAt,
            MapCategory(s.Category),
            await storage.ResolveReadUrlAsync(s.ImageUrl, MediaCategory.Service, s.UpdatedAt),
            s.CostPrice,
            MapProducts(s.ServiceProducts));
}
