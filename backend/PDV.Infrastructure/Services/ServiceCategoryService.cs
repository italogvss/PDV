using FluentValidation;
using PDV.Application.DTOs.ServiceCategories;
using PDV.Application.Interfaces;
using PDV.Domain.Entities;
using PDV.Domain.Exceptions;
using PDV.Domain.Interfaces;

namespace PDV.Infrastructure.Services;

public class ServiceCategoryService(
    IServiceCategoryRepository repository,
    ITenantContext tenantContext,
    IValidator<CreateServiceCategoryRequest> createValidator,
    IValidator<UpdateServiceCategoryRequest> updateValidator) : IServiceCategoryService
{
    public async Task<IEnumerable<ServiceCategoryResponse>> GetAllAsync()
    {
        var categories = await repository.GetAllAsync();
        return categories.Select(Map);
    }

    public async Task<ServiceCategoryResponse> GetByIdAsync(Guid id)
    {
        var category = await repository.GetByIdAsync(id)
            ?? throw new NotFoundException("Categoria de serviço não encontrada.");
        return Map(category);
    }

    public async Task<ServiceCategoryResponse> CreateAsync(CreateServiceCategoryRequest request)
    {
        await createValidator.ValidateAndThrowAsync(request);

        if (await repository.NameExistsAsync(request.Name))
            throw new BusinessException($"Já existe uma categoria com o nome '{request.Name}'.");

        var category = new ServiceCategory
        {
            TenantId = tenantContext.TenantId,
            Name = request.Name,
            Color = request.Color,
        };

        await repository.AddAsync(category);
        return Map(category);
    }

    public async Task<ServiceCategoryResponse> UpdateAsync(Guid id, UpdateServiceCategoryRequest request)
    {
        await updateValidator.ValidateAndThrowAsync(request);

        var category = await repository.GetByIdAsync(id)
            ?? throw new NotFoundException("Categoria de serviço não encontrada.");

        if (await repository.NameExistsAsync(request.Name, excludeId: id))
            throw new BusinessException($"Já existe uma categoria com o nome '{request.Name}'.");

        category.Name = request.Name;
        category.Color = request.Color;

        await repository.UpdateAsync(category);
        return Map(category);
    }

    public async Task DeleteAsync(Guid id)
    {
        var category = await repository.GetByIdAsync(id)
            ?? throw new NotFoundException("Categoria de serviço não encontrada.");

        category.IsActive = false;
        await repository.UpdateAsync(category);
    }

    private static ServiceCategoryResponse Map(ServiceCategory c) => new(c.Id, c.Name, c.Color);
}
