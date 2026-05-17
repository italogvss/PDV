using FluentValidation;
using Microsoft.EntityFrameworkCore;
using PDV.Application.DTOs.Common;
using PDV.Application.DTOs.Users;
using PDV.Application.Interfaces;
using PDV.Domain.Entities;
using PDV.Domain.Enums;
using PDV.Domain.Exceptions;
using PDV.Infrastructure.Persistence;

namespace PDV.Infrastructure.Services;

public class UserService(
    AppDbContext context,
    IValidator<CreateUserRequest> createValidator,
    IValidator<UpdateUserRequest> updateValidator,
    IValidator<ResetPasswordRequest> resetValidator) : IUserService
{
    public async Task<PaginatedResponse<UserResponse>> GetAllAsync(int page, int pageSize, string? search)
    {
        var query = context.Users.AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
            query = query.Where(u => u.Name.Contains(search) || u.Username.Contains(search));

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

    public async Task<UserResponse> CreateAsync(CreateUserRequest request)
    {
        await createValidator.ValidateAndThrowAsync(request);

        var exists = await context.Users.AnyAsync(u => u.Username == request.Username);
        if (exists)
            throw new BusinessException($"O nome de usuário '{request.Username}' já está em uso.");

        var user = new User
        {
            Id = Guid.NewGuid(),
            Name = request.Name,
            Username = request.Username,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
            Role = Enum.Parse<UserRole>(request.Role),
            CreatedAt = DateTime.UtcNow
        };

        context.Users.Add(user);
        await context.SaveChangesAsync();
        return ToResponse(user);
    }

    public async Task<UserResponse> UpdateAsync(Guid id, UpdateUserRequest request)
    {
        await updateValidator.ValidateAndThrowAsync(request);

        var user = await context.Users.FindAsync(id)
            ?? throw new NotFoundException("Usuário não encontrado.");

        var exists = await context.Users.AnyAsync(u => u.Username == request.Username && u.Id != id);
        if (exists)
            throw new BusinessException($"O nome de usuário '{request.Username}' já está em uso.");

        user.Name = request.Name;
        user.Username = request.Username;
        user.Role = Enum.Parse<UserRole>(request.Role);
        await context.SaveChangesAsync();
        return ToResponse(user);
    }

    public async Task DeleteAsync(Guid id)
    {
        var user = await context.Users.FindAsync(id)
            ?? throw new NotFoundException("Usuário não encontrado.");

        context.Users.Remove(user);
        await context.SaveChangesAsync();
    }

    public async Task ResetPasswordAsync(Guid id, ResetPasswordRequest request)
    {
        await resetValidator.ValidateAndThrowAsync(request);

        var user = await context.Users.FindAsync(id)
            ?? throw new NotFoundException("Usuário não encontrado.");

        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.NewPassword);
        await context.SaveChangesAsync();
    }

    private static UserResponse ToResponse(User u) =>
        new(u.Id, u.Name, u.Username, u.Role.ToString(), u.CreatedAt);
}
