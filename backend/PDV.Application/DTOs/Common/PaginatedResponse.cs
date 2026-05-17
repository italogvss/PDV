namespace PDV.Application.DTOs.Common;

public record PaginatedResponse<T>(
    IEnumerable<T> Data,
    int Page,
    int PageSize,
    int TotalCount,
    int TotalPages);
