using FluentValidation;
using PDV.Application.DTOs.ProductCategories;
using PDV.Application.Interfaces;
using PDV.Domain.Entities;
using PDV.Domain.Exceptions;
using PDV.Domain.Interfaces;

namespace PDV.Infrastructure.Services;

public class ProductCategoryService(
    IProductCategoryRepository repository,
    ITenantContext tenantContext,
    IValidator<CreateProductCategoryRequest> createValidator,
    IValidator<UpdateProductCategoryRequest> updateValidator) : IProductCategoryService
{
    public async Task<IEnumerable<ProductCategoryResponse>> GetAllAsync()
    {
        var categories = await repository.GetAllAsync(tenantContext.TenantId);
        return categories.Select(Map);
    }

    public async Task<ProductCategoryResponse> GetByIdAsync(Guid id)
    {
        var category = await repository.GetByIdAsync(id, tenantContext.TenantId)
            ?? throw new NotFoundException("Categoria não encontrada.");
        return Map(category);
    }

    public async Task<ProductCategoryResponse> CreateAsync(CreateProductCategoryRequest request)
    {
        await createValidator.ValidateAndThrowAsync(request);

        if (await repository.NameExistsAsync(request.Name, tenantContext.TenantId))
            throw new BusinessException($"Já existe uma categoria com o nome '{request.Name}'.");

        var category = new ProductCategory
        {
            Id = Guid.NewGuid(),
            TenantId = tenantContext.TenantId,
            Name = request.Name,
            Color = request.Color,
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
        };

        await repository.AddAsync(category);
        return Map(category);
    }

    public async Task<ProductCategoryResponse> UpdateAsync(Guid id, UpdateProductCategoryRequest request)
    {
        await updateValidator.ValidateAndThrowAsync(request);

        var category = await repository.GetByIdAsync(id, tenantContext.TenantId)
            ?? throw new NotFoundException("Categoria não encontrada.");

        if (await repository.NameExistsAsync(request.Name, tenantContext.TenantId, excludeId: id))
            throw new BusinessException($"Já existe uma categoria com o nome '{request.Name}'.");

        category.Name = request.Name;
        category.Color = request.Color;

        await repository.UpdateAsync(category);
        return Map(category);
    }

    public async Task DeleteAsync(Guid id)
    {
        var category = await repository.GetByIdAsync(id, tenantContext.TenantId)
            ?? throw new NotFoundException("Categoria não encontrada.");

        category.IsActive = false;
        await repository.UpdateAsync(category);
    }

    private static ProductCategoryResponse Map(ProductCategory c) => new(c.Id, c.Name, c.Color);
}
