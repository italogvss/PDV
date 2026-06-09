using PDV.Domain.Enums;

namespace PDV.Application.DTOs.Media;

public record ConfirmUploadRequest(MediaCategory Category, Guid EntityId, string RelativePath);
