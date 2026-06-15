using FluentValidation;
using PDV.Application.DTOs.Common;
using PDV.Application.DTOs.Suppliers;
using PDV.Application.Interfaces;
using PDV.Domain.Entities;
using PDV.Domain.Exceptions;
using PDV.Domain.Interfaces;

namespace PDV.Infrastructure.Services;

public class SupplierService(
    ISupplierRepository repository,
    ITenantContext tenantContext,
    IValidator<CreateSupplierRequest> createValidator,
    IValidator<UpdateSupplierRequest> updateValidator) : ISupplierService
{
    public async Task<PaginatedResponse<SupplierResponse>> GetAllAsync(int page, int pageSize, string? search)
    {
        var (data, totalCount) = await repository.GetAllAsync(page, pageSize, search);
        var totalPages = (int)Math.Ceiling((double)totalCount / pageSize);
        return new PaginatedResponse<SupplierResponse>(data.Select(Map), page, pageSize, totalCount, totalPages);
    }

    public async Task<SupplierResponse> GetByIdAsync(Guid id)
    {
        var supplier = await repository.GetByIdAsync(id)
            ?? throw new NotFoundException("Fornecedor não encontrado.");
        return Map(supplier);
    }

    public async Task<SupplierResponse> CreateAsync(CreateSupplierRequest request)
    {
        await createValidator.ValidateAndThrowAsync(request);

        var supplier = new Supplier
        {
            TenantId = tenantContext.TenantId,
            Name = request.Name,
            Phone = NullIfEmpty(request.Phone),
        };

        await repository.AddAsync(supplier);
        return Map(supplier);
    }

    public async Task<SupplierResponse> UpdateAsync(Guid id, UpdateSupplierRequest request)
    {
        await updateValidator.ValidateAndThrowAsync(request);

        var supplier = await repository.GetByIdAsync(id)
            ?? throw new NotFoundException("Fornecedor não encontrado.");

        supplier.Name = request.Name;
        supplier.Phone = NullIfEmpty(request.Phone);
        supplier.UpdatedAt = DateTime.UtcNow;

        await repository.UpdateAsync(supplier);
        return Map(supplier);
    }

    public async Task DeleteAsync(Guid id)
    {
        var supplier = await repository.GetByIdAsync(id)
            ?? throw new NotFoundException("Fornecedor não encontrado.");

        supplier.IsActive = false;
        supplier.UpdatedAt = DateTime.UtcNow;
        await repository.UpdateAsync(supplier);
    }

    public Task<int> PurgeAllAsync() => repository.PurgeAllAsync();

    public async Task<IEnumerable<SupplierResponse>> GetAllInactiveAsync()
    {
        var data = await repository.GetAllInactiveAsync();
        return data.Select(Map);
    }

    public async Task RestoreAsync(Guid id)
    {
        var entity = await repository.GetInactiveByIdAsync(id)
            ?? throw new NotFoundException("Fornecedor não encontrado.");
        await repository.RestoreAsync(entity);
    }

    public async Task HardDeleteAsync(Guid id)
    {
        var entity = await repository.GetInactiveByIdAsync(id)
            ?? throw new NotFoundException("Fornecedor não encontrado.");
        await repository.HardDeleteAsync(entity);
    }

    private static SupplierResponse Map(Supplier s) =>
        new(s.Id, s.Name, s.Phone, s.CreatedAt);

    private static string? NullIfEmpty(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value;
}
