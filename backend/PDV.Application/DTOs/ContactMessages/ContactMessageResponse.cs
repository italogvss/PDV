namespace PDV.Application.DTOs.ContactMessages;

public record ContactMessageResponse(
    Guid Id,
    string Category,
    string Subject,
    string Body,
    string Status,
    string? ExpectedBehavior,
    string? Reproducibility,
    string? PageContext,
    string? AppVersion,
    string? Browser,
    string? ScreenResolution,
    string? Platform,
    DateTime CreatedAt
);
