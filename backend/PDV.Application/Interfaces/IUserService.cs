using PDV.Application.DTOs.Common;
using PDV.Application.DTOs.Users;

namespace PDV.Application.Interfaces;

public interface IUserService
{
    Task<PaginatedResponse<UserResponse>> GetAllAsync(int page, int pageSize, string? search);
    Task<UserResponse> GetByIdAsync(Guid id);
    Task<UserResponse> UpdateAsync(Guid id, UpdateUserRequest request);
}
