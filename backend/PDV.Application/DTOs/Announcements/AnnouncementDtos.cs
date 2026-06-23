namespace PDV.Application.DTOs.Announcements;

// Feed pós-login. `Announcements` traz só os avisos editoriais pendentes (não vistos, ativos e
// segmentados para o usuário). `SeenKeys` traz apenas as Keys de ciclo de vida ("lifecycle:*")
// já vistas — o frontend usa isso para decidir quais modais fixos ainda deve exibir.
public record AnnouncementFeedResponse(
    IReadOnlyList<AnnouncementResponse> Announcements,
    IReadOnlyList<string> SeenKeys);

public record AnnouncementResponse(
    Guid Id,
    string Title,
    string Body,
    string Type,
    string? ImageUrl,
    string? CtaLabel,
    string? CtaUrl);

public record MarkSeenRequest(string Key);
