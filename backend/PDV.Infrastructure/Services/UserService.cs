using FluentValidation;
using Microsoft.EntityFrameworkCore;
using PDV.Application.DTOs.Common;
using PDV.Application.DTOs.Users;
using PDV.Application.Interfaces;
using PDV.Domain.Exceptions;
using PDV.Infrastructure.Persistence;

namespace PDV.Infrastructure.Services;

public class UserService(
    AppDbContext context,
    IValidator<UpdateUserRequest> updateValidator) : IUserService
{
    public async Task<PaginatedResponse<UserResponse>> GetAllAsync(int page, int pageSize, string? search)
    {
        var query = context.Users.AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
            query = query.Where(u => u.Name.Contains(search) || u.Email.Contains(search));

        var totalCount = await query.CountAsync();
        var users = await query
            .OrderBy(u => u.Name)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        var totalPages = (int)Math.Ceiling((double)totalCount / pageSize);
        return new PaginatedResponse<UserResponse>(users.Select(ToResponse), page, pageSize, totalCount, totalPages);
    }

    public async Task<UserResponse> GetByIdAsync(Guid id)
    {
        var user = await context.Users.FindAsync(id)
            ?? throw new NotFoundException("Usuário não encontrado.");
        return ToResponse(user);
    }

    public async Task<UserResponse> UpdateAsync(Guid id, UpdateUserRequest request)
    {
        await updateValidator.ValidateAndThrowAsync(request);

        var user = await context.Users.FindAsync(id)
            ?? throw new NotFoundException("Usuário não encontrado.");

        user.Name = request.Name;
        user.UpdatedAt = DateTime.UtcNow;
        await context.SaveChangesAsync();
        return ToResponse(user);
    }

    private static UserResponse ToResponse(PDV.Domain.Entities.User u) =>
        new(u.Id, u.Name, u.Email, u.AvatarUrl, u.CreatedAt);
}
