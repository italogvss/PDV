namespace PDV.Application.DTOs.ContactMessages;

public record CreateContactMessageRequest(
    string Category,
    string Subject,
    string Body,
    string? ExpectedBehavior,
    string? Reproducibility,
    string? PageContext,
    string? AppVersion,
    string? Browser,
    string? ScreenResolution,
    string? Platform
);
