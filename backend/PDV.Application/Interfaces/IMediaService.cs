using PDV.Application.DTOs.Media;
using PDV.Domain.Enums;

namespace PDV.Application.Interfaces;

public interface IMediaService
{
    Task<PresignedUrlResponse> GetUploadUrlAsync(MediaCategory category, Guid entityId);
    Task ConfirmAsync(ConfirmUploadRequest request);
    Task RemoveAsync(MediaCategory category, Guid entityId);
}
