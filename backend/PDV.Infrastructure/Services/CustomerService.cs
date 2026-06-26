using FluentValidation;
using Microsoft.EntityFrameworkCore;
using PDV.Application.DTOs.Common;
using PDV.Application.DTOs.Customers;
using PDV.Application.Interfaces;
using PDV.Domain.Entities;
using PDV.Domain.Enums;
using PDV.Domain.Exceptions;
using PDV.Domain.Interfaces;
using PDV.Infrastructure.Persistence;

namespace PDV.Infrastructure.Services;

public class CustomerService(
    ICustomerRepository repository,
    AppDbContext context,
    ITenantContext tenantContext,
    IAuditLogger auditLogger,
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

        await auditLogger.LogCustomerDeactivatedAsync(customer.Id, customer.Name);

        customer.IsActive = false;
        customer.UpdatedAt = DateTime.UtcNow;
        await repository.UpdateAsync(customer);
    }

    public async Task<CustomerCrmStatsResponse> GetCrmStatsAsync(Guid id)
    {
        _ = await repository.GetByIdAsync(id)
            ?? throw new NotFoundException("Cliente não encontrado.");

        // Sales (IgnoreQueryFilters not needed — Sales have TenantId global filter)
        var sales = await context.Sales
            .Where(s => s.CustomerId == id && s.Status == SaleStatus.Active)
            .Include(s => s.Items)
            .OrderByDescending(s => s.CreatedAt)
            .ToListAsync();

        var activeSales = sales.Where(s => s.Status == SaleStatus.Active).ToList();
        var totalSales = activeSales.Count;
        var totalSpent = activeSales.Sum(s => s.Total);
        var averageTicket = totalSales > 0 ? totalSpent / totalSales : 0m;
        var lastPurchaseDate = activeSales.FirstOrDefault()?.CreatedAt;

        var preferredPaymentMethod = activeSales
            .GroupBy(s => s.PaymentMethod.ToString())
            .OrderByDescending(g => g.Count())
            .Select(g => g.Key)
            .FirstOrDefault();

        var topProducts = activeSales
            .SelectMany(s => s.Items)
            .GroupBy(i => i.ProductName)
            .Select(g => new { Name = g.Key, Qty = g.Sum(i => i.Quantity), Total = g.Sum(i => i.Subtotal) })
            .OrderByDescending(p => p.Qty)
            .Take(10)
            .ToList();

        var maxQty = topProducts.Count > 0 ? topProducts.Max(p => p.Qty) : 1;

        var topProductDtos = topProducts
            .Select(p => new CustomerTopProductDto(p.Name, p.Qty, p.Total, maxQty));

        var recentSales = sales.Take(20).Select(s =>
        {
            var itemsSummary = s.Items.Count > 0
                ? string.Join(" + ", s.Items.Take(2).Select(i => i.ProductName))
                    + (s.Items.Count > 2 ? $" +{s.Items.Count - 2}" : "")
                : "—";
            return new CustomerRecentSaleDto(
                s.Id,
                s.Id.ToString()[..4].ToUpper(),
                itemsSummary,
                s.PaymentMethod.ToString(),
                s.Total,
                s.CreatedAt
            );
        });

        // Appointments
        var appointments = await context.Appointments
            .Where(a => a.CustomerId == id)
            .Include(a => a.ServiceItems)
            .OrderByDescending(a => a.Start)
            .ToListAsync();

        var appointmentCounts = new CustomerAppointmentCountsDto(
            Total: appointments.Count,
            Completed: appointments.Count(a => a.Status == AppointmentStatus.Concluido),
            Cancelled: appointments.Count(a => a.Status == AppointmentStatus.Cancelado),
            InProgress: appointments.Count(a => a.Status == AppointmentStatus.EmAtendimento)
        );

        var nextAppointment = appointments
            .Where(a => a.Start > DateTime.UtcNow && a.Status != AppointmentStatus.Cancelado)
            .OrderBy(a => a.Start)
            .FirstOrDefault();

        var nextAppointmentDto = nextAppointment == null ? null
            : new CustomerNextAppointmentDto(
                nextAppointment.Id,
                nextAppointment.Start,
                nextAppointment.ServiceItems.Select(s => s.ServiceName),
                nextAppointment.EmployeeName,
                nextAppointment.Status.ToString()
            );

        var topServices = appointments
            .SelectMany(a => a.ServiceItems)
            .GroupBy(s => s.ServiceName)
            .Select(g => new { Name = g.Key, Count = g.Count() })
            .OrderByDescending(s => s.Count)
            .Take(5)
            .ToList();

        var maxServiceCount = topServices.Count > 0 ? topServices.Max(s => s.Count) : 1;

        var topServiceDtos = topServices
            .Select(s => new CustomerTopServiceDto(s.Name, s.Count, maxServiceCount));

        return new CustomerCrmStatsResponse(
            totalSales, totalSpent, averageTicket, lastPurchaseDate, preferredPaymentMethod,
            topProductDtos, recentSales,
            appointmentCounts, nextAppointmentDto, topServiceDtos
        );
    }

    public Task<int> PurgeAllAsync() => repository.PurgeAllAsync();

    public async Task<IEnumerable<CustomerResponse>> GetAllInactiveAsync()
    {
        var data = await repository.GetAllInactiveAsync();
        return data.Select(Map);
    }

    public async Task RestoreAsync(Guid id)
    {
        var entity = await repository.GetInactiveByIdAsync(id)
            ?? throw new NotFoundException("Cliente não encontrado.");
        await repository.RestoreAsync(entity);
    }

    public async Task HardDeleteAsync(Guid id)
    {
        var entity = await repository.GetInactiveByIdAsync(id)
            ?? throw new NotFoundException("Cliente não encontrado.");
        await repository.HardDeleteAsync(entity);
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
