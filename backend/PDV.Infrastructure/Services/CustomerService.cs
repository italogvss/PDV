using FluentValidation;
using PDV.Application.DTOs.Common;
using PDV.Application.DTOs.Customers;
using PDV.Application.Interfaces;
using PDV.Domain.Entities;
using PDV.Domain.Exceptions;
using PDV.Domain.Interfaces;

namespace PDV.Infrastructure.Services;

public class CustomerService(
    ICustomerRepository repository,
    ITenantContext tenantContext,
    IValidator<CreateCustomerRequest> createValidator,
    IValidator<UpdateCustomerRequest> updateValidator) : ICustomerService
{
    public async Task<PaginatedResponse<CustomerResponse>> GetAllAsync(int page, int pageSize, string? search)
    {
        var (data, totalCount) = await repository.GetAllAsync(page, pageSize, search);
        var totalPages = (int)Math.Ceiling((double)totalCount / pageSize);
        return new PaginatedResponse<CustomerResponse>(data.Select(Map), page, pageSize, totalCount, totalPages);
    }

    public async Task<CustomerResponse> GetByIdAsync(Guid id)
    {
        var customer = await repository.GetByIdAsync(id)
            ?? throw new NotFoundException("Cliente não encontrado.");
        return Map(customer);
    }

    public async Task<CustomerResponse> CreateAsync(CreateCustomerRequest request)
    {
        await createValidator.ValidateAndThrowAsync(request);

        var customer = new Customer
        {
            TenantId = tenantContext.TenantId,
            Name = request.Name,
            Phone = NullIfEmpty(request.Phone),
            Email = NullIfEmpty(request.Email),
            Document = NullIfEmpty(request.Document),
            Note = request.Note ?? string.Empty,
            AddressStreet = request.Address?.Street,
            AddressNumber = request.Address?.Number,
            AddressCity = request.Address?.City,
            AddressState = request.Address?.State,
            AddressZipCode = request.Address?.ZipCode,
        };

        await repository.AddAsync(customer);
        return Map(customer);
    }

    public async Task<CustomerResponse> UpdateAsync(Guid id, UpdateCustomerRequest request)
    {
        await updateValidator.ValidateAndThrowAsync(request);

        var customer = await repository.GetByIdAsync(id)
            ?? throw new NotFoundException("Cliente não encontrado.");

        customer.Name = request.Name;
        customer.Phone = NullIfEmpty(request.Phone);
        customer.Email = NullIfEmpty(request.Email);
        customer.Document = NullIfEmpty(request.Document);
        customer.Note = request.Note ?? string.Empty;
        customer.AddressStreet = request.Address?.Street;
        customer.AddressNumber = request.Address?.Number;
        customer.AddressCity = request.Address?.City;
        customer.AddressState = request.Address?.State;
        customer.AddressZipCode = request.Address?.ZipCode;
        customer.UpdatedAt = DateTime.UtcNow;

        await repository.UpdateAsync(customer);
        return Map(customer);
    }

    public async Task DeleteAsync(Guid id)
    {
        var customer = await repository.GetByIdAsync(id)
            ?? throw new NotFoundException("Cliente não encontrado.");

        customer.IsActive = false;
        customer.UpdatedAt = DateTime.UtcNow;
        await repository.UpdateAsync(customer);
    }

    private static CustomerResponse Map(Customer c)
    {
        var hasAddress = c.AddressStreet != null
            || c.AddressNumber != null
            || c.AddressCity != null
            || c.AddressState != null
            || c.AddressZipCode != null;

        var address = hasAddress
            ? new CustomerAddressDto(c.AddressStreet, c.AddressNumber, c.AddressCity, c.AddressState, c.AddressZipCode)
            : null;

        return new CustomerResponse(c.Id, c.Name, c.Phone, c.Email, c.Document, c.Note, address, c.CreatedAt);
    }

    private static string? NullIfEmpty(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value;
}
