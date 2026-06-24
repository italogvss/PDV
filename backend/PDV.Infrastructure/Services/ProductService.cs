using FluentValidation;
using PDV.Application.DTOs.Common;
using PDV.Application.DTOs.ProductCategories;
using PDV.Application.DTOs.Products;
using PDV.Application.Helpers;
using PDV.Application.Interfaces;
using PDV.Domain.Constants;
using PDV.Domain.Entities;
using PDV.Domain.Enums;
using PDV.Domain.Exceptions;
using PDV.Domain.Interfaces;
using PDV.Infrastructure.Persistence;

namespace PDV.Infrastructure.Services;

public class ProductService(
    IProductRepository repository,
    ITenantContext tenantContext,
    IStorageService storage,
    IEntitlementService entitlementService,
    IAuditLogger auditLogger,
    AppDbContext context,
    IValidator<CreateProductRequest> createValidator,
    IValidator<UpdateProductRequest> updateValidator) : IProductService
{
    public async Task<PaginatedResponse<ProductResponse>> GetAllAsync(
        int page, int pageSize,
        string? name = null, string? barcode = null,
        Guid? categoryId = null,
        string? sortBy = null, string? sortOrder = null)
    {
        var (data, totalCount) = await repository.GetAllAsync(page, pageSize, name, barcode, categoryId, sortBy, sortOrder);
        var totalPages = (int)Math.Ceiling((double)totalCount / pageSize);
        var mapped = await Task.WhenAll(data.Select(Map));
        return new PaginatedResponse<ProductResponse>(mapped, page, pageSize, totalCount, totalPages);
    }

    public async Task<ProductResponse> GetByIdAsync(Guid id)
    {
        var product = await repository.GetByIdAsync(id)
            ?? throw new NotFoundException("Produto não encontrado.");
        return await Map(product);
    }

    public async Task<ProductResponse> CreateAsync(CreateProductRequest request)
    {
        await createValidator.ValidateAndThrowAsync(request);

        if (request.Barcode is not null && await repository.BarcodeExistsAsync(request.Barcode))
            throw new BusinessException($"Já existe um produto com o código de barras '{request.Barcode}'.");

        // Enforcement de limite do plano (402 se atingido).
        await entitlementService.EnsureWithinLimitAsync(PlanLimits.MaxProducts, await repository.CountAsync());

        var product = new Product
        {
            Id = Guid.NewGuid(),
            TenantId = tenantContext.TenantId,
            Name = request.Name,
            Barcode = request.Barcode,
            NCM = request.Ncm,
            Price = request.Price,
            PurchasePrice = request.PurchasePrice,
            Stock = request.Stock,
            MinStock = request.MinStock,
            MinCriticalStock = request.MinCriticalStock,
            CategoryId = request.CategoryId,
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
        };

        await repository.AddAsync(product);

        // Recarrega para obter a navegação Category populada
        var created = await repository.GetByIdAsync(product.Id)
            ?? throw new NotFoundException("Produto não encontrado após criação.");
        return await Map(created);
    }

    public async Task<ProductResponse> UpdateAsync(Guid id, UpdateProductRequest request)
    {
        await updateValidator.ValidateAndThrowAsync(request);

        var product = await repository.GetByIdAsync(id)
            ?? throw new NotFoundException("Produto não encontrado.");

        if (request.Barcode is not null && await repository.BarcodeExistsAsync(request.Barcode, excludeId: id))
            throw new BusinessException($"Já existe um produto com o código de barras '{request.Barcode}'.");

        if (request.Price != product.Price)
            await auditLogger.LogProductPriceChangedAsync(id, product.Name, product.Price, request.Price);

        product.Name = request.Name;
        product.Barcode = request.Barcode;
        product.NCM = request.Ncm;
        product.Price = request.Price;
        product.Stock = request.Stock;
        product.PurchasePrice = request.PurchasePrice;
        product.MinStock = request.MinStock;
        product.MinCriticalStock = request.MinCriticalStock;
        product.CategoryId = request.CategoryId;

        await repository.UpdateAsync(product);

        var updated = await repository.GetByIdAsync(product.Id)
            ?? throw new NotFoundException("Produto não encontrado após atualização.");
        return await Map(updated);
    }

    public async Task DeleteAsync(Guid id)
    {
        var product = await repository.GetByIdAsync(id)
            ?? throw new NotFoundException("Produto não encontrado.");

        await auditLogger.LogProductDeactivatedAsync(product.Id, product.Name);

        product.IsActive = false;
        await repository.UpdateAsync(product);
    }

    public Task<int> PurgeAllAsync() => repository.PurgeAllAsync();

    public async Task<IEnumerable<ProductResponse>> GetAllInactiveAsync()
    {
        var data = await repository.GetAllInactiveAsync();
        return await Task.WhenAll(data.Select(Map));
    }

    public async Task RestoreAsync(Guid id)
    {
        var entity = await repository.GetInactiveByIdAsync(id)
            ?? throw new NotFoundException("Produto não encontrado.");
        await repository.RestoreAsync(entity);
    }

    public async Task HardDeleteAsync(Guid id)
    {
        var entity = await repository.GetInactiveByIdAsync(id)
            ?? throw new NotFoundException("Produto não encontrado.");
        await repository.HardDeleteAsync(entity);
    }

    public async Task<ProductResponse> AdjustStockAsync(Guid id, AdjustStockRequest request)
    {
        var product = await repository.GetByIdAsync(id)
            ?? throw new NotFoundException("Produto não encontrado.");

        var newStock = product.Stock + request.Quantity;
        if (newStock < 0)
            throw new BusinessException(
                $"Ajuste inválido: estoque não pode ficar negativo. Estoque atual: {product.Stock}.");

        string? supplierName = null;
        if (request.SupplierId.HasValue)
        {
            var supplier = await context.Suppliers.FindAsync(request.SupplierId.Value);
            supplierName = supplier?.Name;
        }

        await auditLogger.LogStockMovementAsync(
            id, product.Name, StockMovementType.ManualAdjust, request.Quantity,
            supplierId: request.SupplierId, supplierName: supplierName, note: request.Note);

        product.Stock = newStock;
        await repository.UpdateAsync(product);

        var updated = await repository.GetByIdAsync(product.Id)
            ?? throw new NotFoundException("Produto não encontrado após ajuste.");
        return await Map(updated);
    }

    private static ProductCategoryResponse? MapCategory(ProductCategory? c) =>
        c is null ? null : new(c.Id, c.Name, c.Color);

    private async Task<ProductResponse> Map(Product p) =>
        new(p.Id, p.Name, p.Barcode, p.NCM, p.Price, p.PurchasePrice,
            p.Stock, p.TotalSold, p.MinStock, p.MinCriticalStock, p.IsActive, p.CreatedAt,
            MapCategory(p.Category),
            await storage.ResolveReadUrlAsync(p.ImageUrl, MediaCategory.Product, p.UpdatedAt));
}
