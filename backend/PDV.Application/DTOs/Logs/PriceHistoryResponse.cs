namespace PDV.Application.DTOs.Logs;

public record PriceHistoryResponse(
    Guid Id,
    string EntityType,
    Guid? EntityId,
    string EntityName,
    decimal OldPrice,
    decimal NewPrice,
    Guid? ChangedByUserId,
    string ChangedByName,
    DateTime ChangedAt);
