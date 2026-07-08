namespace PDV.Application.DTOs.Reports;

public record TopServiceResponse(
    Guid ServiceId,
    string ServiceName,
    int Count,
    decimal Revenue);
