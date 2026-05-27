using FluentValidation;
using Microsoft.EntityFrameworkCore;
using PDV.Application.DTOs.Common;
using PDV.Application.DTOs.Sales;
using PDV.Application.Interfaces;
using PDV.Domain.Entities;
using PDV.Domain.Enums;
using PDV.Domain.Exceptions;
using PDV.Infrastructure.Persistence;

namespace PDV.Infrastructure.Services;

public class SaleService(
    AppDbContext context,
    ITenantContext tenantContext,
    IValidator<CreateSaleRequest> createValidator) : ISaleService
{
    private Guid TenantId => tenantContext.TenantId;

    public async Task<PaginatedResponse<SaleResponse>> GetAllAsync(
        int page, int pageSize,
        DateTime? startDate, DateTime? endDate,
        Guid? operatorId, SaleStatus? status)
    {
        var query = context.Sales
            .Include(s => s.Operator)
            .AsQueryable();

        if (startDate.HasValue)
            query = query.Where(s => s.CreatedAt >= startDate.Value);
        if (endDate.HasValue)
            query = query.Where(s => s.CreatedAt <= endDate.Value);
        if (operatorId.HasValue)
            query = query.Where(s => s.OperatorId == operatorId.Value);
        if (status.HasValue)
            query = query.Where(s => s.Status == status.Value);

        query = query.OrderByDescending(s => s.CreatedAt);

        var totalCount = await query.CountAsync();
        var data = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        var totalPages = (int)Math.Ceiling((double)totalCount / pageSize);
        return new PaginatedResponse<SaleResponse>(
            data.Select(MapToResponse), page, pageSize, totalCount, totalPages);
    }

    public async Task<SaleDetailResponse> GetByIdAsync(Guid id)
    {
        var sale = await context.Sales
            .Include(s => s.Operator)
            .Include(s => s.Items)
            .FirstOrDefaultAsync(s => s.Id == id)
            ?? throw new NotFoundException("Venda não encontrada.");

        return MapToDetail(sale);
    }

    public async Task<SaleDetailResponse> CreateAsync(CreateSaleRequest request, Guid operatorId)
    {
        await createValidator.ValidateAndThrowAsync(request);

        var tenantId = TenantId;

        await using var transaction = await context.Database.BeginTransactionAsync();

        var productIds = request.Items.Select(i => i.ProductId).ToList();
        var products = await context.Products
            .Where(p => productIds.Contains(p.Id))
            .ToDictionaryAsync(p => p.Id);

        foreach (var item in request.Items)
        {
            if (!products.TryGetValue(item.ProductId, out var product))
                throw new NotFoundException($"Produto com ID '{item.ProductId}' não encontrado.");
            if (!product.IsActive)
                throw new BusinessException($"O produto '{product.Name}' não está mais disponível.");
            if (product.Stock < item.Quantity)
                throw new BusinessException(
                    $"Estoque insuficiente para '{product.Name}'. Disponível: {product.Stock} unidade(s).");
        }

        foreach (var item in request.Items)
            products[item.ProductId].Stock -= item.Quantity;

        var saleItems = request.Items.Select(item =>
        {
            var product = products[item.ProductId];
            return new SaleItem
            {
                Id = Guid.NewGuid(),
                ProductId = item.ProductId,
                ProductName = product.Name,
                UnitPrice = product.Price,
                PurchasePriceSnapshot = product.PurchasePrice,
                Quantity = item.Quantity,
                Subtotal = product.Price * item.Quantity
            };
        }).ToList();

        var total = saleItems.Sum(i => i.Subtotal);
        decimal? installmentValue = null;
        if (request.IsInstallment && request.InstallmentCount.HasValue)
            installmentValue = total / request.InstallmentCount.Value;

        var sale = new Sale
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            OperatorId = operatorId,
            CustomerName = request.CustomerName,
            PaymentMethod = request.PaymentMethod,
            IsInstallment = request.IsInstallment,
            InstallmentCount = request.InstallmentCount,
            InstallmentValue = installmentValue,
            Total = total,
            AmountPaid = request.AmountPaid,
            Status = SaleStatus.Active,
            CreatedAt = DateTime.UtcNow,
            Items = saleItems
        };

        await context.Sales.AddAsync(sale);
        await context.SaveChangesAsync();
        await transaction.CommitAsync();

        var operatorUser = await context.Users.FindAsync(operatorId);
        sale.Operator = operatorUser!;

        return MapToDetail(sale);
    }

    public async Task CancelAsync(Guid id, Guid adminId)
    {
        var sale = await context.Sales
            .Include(s => s.Items)
            .FirstOrDefaultAsync(s => s.Id == id)
            ?? throw new NotFoundException("Venda não encontrada.");

        if (sale.Status == SaleStatus.Cancelled)
            throw new BusinessException("Esta venda já está cancelada.");

        await using var transaction = await context.Database.BeginTransactionAsync();

        sale.Status = SaleStatus.Cancelled;
        sale.CancelledById = adminId;
        sale.CancelledAt = DateTime.UtcNow;

        foreach (var item in sale.Items.Where(i => i.ProductId.HasValue))
        {
            var product = await context.Products
                .FirstOrDefaultAsync(p => p.Id == item.ProductId!.Value);

            if (product is { IsActive: true })
                product.Stock += item.Quantity;
        }

        await context.SaveChangesAsync();
        await transaction.CommitAsync();
    }

    private static SaleResponse MapToResponse(Sale s) =>
        new(s.Id, s.OperatorId, s.Operator?.Name ?? string.Empty,
            s.CustomerName, s.PaymentMethod, s.IsInstallment,
            s.InstallmentCount, s.InstallmentValue,
            s.Total, s.Status.ToString(), s.CancelledById, s.CancelledAt, s.CreatedAt);

    private static SaleDetailResponse MapToDetail(Sale s) =>
        new(s.Id, s.OperatorId, s.Operator?.Name ?? string.Empty,
            s.CustomerName, s.PaymentMethod, s.IsInstallment,
            s.InstallmentCount, s.InstallmentValue,
            s.Total, s.Status.ToString(), s.CancelledById, s.CancelledAt, s.CreatedAt,
            s.Items.Select(i => new SaleItemResponse(
                i.Id, i.SaleId, i.ProductId,
                i.ProductName, i.UnitPrice, i.PurchasePriceSnapshot, i.Quantity, i.Subtotal)).ToList(),
            s.AmountPaid,
            s.AmountPaid - s.Total);
}
