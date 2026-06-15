using FluentValidation;
using PDV.Application.DTOs.Common;
using PDV.Application.DTOs.Employees;
using PDV.Application.Helpers;
using PDV.Application.Interfaces;
using PDV.Domain.Entities;
using PDV.Domain.Enums;
using PDV.Domain.Exceptions;
using PDV.Domain.Interfaces;

namespace PDV.Infrastructure.Services;

public class EmployeeService(
    IEmployeeRepository employeeRepository,
    ITenantRoleRepository roleRepository,
    IUserRepository userRepository,
    ITenantContext tenantContext,
    IStorageService storage,
    IValidator<CreateEmployeeRequest> createValidator,
    IValidator<UpdateEmployeeRequest> updateValidator) : IEmployeeService
{
    public async Task<PaginatedResponse<EmployeeResponse>> GetAllAsync(int page, int pageSize)
    {
        var (data, totalCount) = await employeeRepository.GetAllAsync(page, pageSize);
        var totalPages = (int)Math.Ceiling((double)totalCount / pageSize);
        var mapped = await Task.WhenAll(data.Select(Map));
        return new PaginatedResponse<EmployeeResponse>(mapped, page, pageSize, totalCount, totalPages);
    }

    public async Task<EmployeeResponse> GetByIdAsync(Guid id)
    {
        var employee = await employeeRepository.GetByIdAsync(id)
            ?? throw new NotFoundException("Funcionário não encontrado.");
        return await Map(employee);
    }

    public async Task<EmployeeResponse> CreateAsync(CreateEmployeeRequest request)
    {
        await createValidator.ValidateAndThrowAsync(request);

        var existing = await userRepository.GetByEmailAsync(request.Email);
        if (existing is not null)
            throw new BusinessException("Já existe um usuário com este e-mail.");

        var role = await roleRepository.GetByIdAsync(request.RoleId)
            ?? throw new BusinessException("Papel não encontrado.");

        var user = new User
        {
            Email = request.Email,
            Name = request.Name,
            Role = UserRole.Employee,
            LastTenantId = tenantContext.TenantId,
        };

        user.LocalAuth = new LocalAuth
        {
            UserId = user.Id,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.TemporaryPassword),
            MustChangePassword = true,
        };

        user.Settings = new UserSettings
        {
            UserId = user.Id,
            Theme = Theme.Light,
        };

        // Vincula o usuário ao tenant atual. Sem este UserTenant o login não resolve
        // o tenantId (derivado de UserTenants) e o funcionário nunca acessa o tenant.
        user.UserTenants =
        [
            new UserTenant
            {
                UserId = user.Id,
                TenantId = tenantContext.TenantId,
                Role = UserRole.Employee,
                JoinedAt = DateTime.UtcNow,
            }
        ];

        await userRepository.AddAsync(user);

        var employee = new Employee
        {
            TenantId = tenantContext.TenantId,
            UserId = user.Id,
            UserName = user.Name,
            UserEmail = user.Email,
            RoleId = role.Id,
            Phone = request.Phone,
        };

        await employeeRepository.AddAsync(employee);

        var created = await employeeRepository.GetByIdAsync(employee.Id)
            ?? throw new NotFoundException("Funcionário não encontrado após criação.");
        return await Map(created);
    }

    public async Task<EmployeeResponse> UpdateAsync(Guid id, UpdateEmployeeRequest request)
    {
        await updateValidator.ValidateAndThrowAsync(request);

        var employee = await employeeRepository.GetByIdAsync(id)
            ?? throw new NotFoundException("Funcionário não encontrado.");

        var role = await roleRepository.GetByIdAsync(request.RoleId)
            ?? throw new BusinessException("Papel não encontrado.");

        employee.RoleId = role.Id;
        employee.Phone = request.Phone;
        employee.UpdatedAt = DateTime.UtcNow;

        await employeeRepository.UpdateAsync(employee);

        var updated = await employeeRepository.GetByIdAsync(employee.Id)
            ?? throw new NotFoundException("Funcionário não encontrado após atualização.");
        return await Map(updated);
    }

    public async Task DeactivateAsync(Guid id)
    {
        var employee = await employeeRepository.GetByIdAsync(id)
            ?? throw new NotFoundException("Funcionário não encontrado.");

        employee.IsActive = false;
        employee.UpdatedAt = DateTime.UtcNow;
        await employeeRepository.UpdateAsync(employee);

        // UserId pode ser null se o User foi hard-deletado; nesse caso o acesso já foi revogado.
        if (employee.UserId is null) return;

        // Carrega o usuário com seus vínculos de tenant para revogar o acesso apenas
        // a ESTE tenant — sem desativar a conta global (o usuário pode pertencer a outros).
        var user = await userRepository.GetByIdAsync(employee.UserId.Value);
        if (user is null) return;

        var membership = user.UserTenants.FirstOrDefault(ut => ut.TenantId == tenantContext.TenantId);
        if (membership is not null)
            user.UserTenants.Remove(membership);

        if (user.LastTenantId == tenantContext.TenantId)
            user.LastTenantId = user.UserTenants.FirstOrDefault()?.TenantId;

        user.UpdatedAt = DateTime.UtcNow;
        await userRepository.UpdateAsync(user);
    }

    public async Task ReactivateAsync(Guid id)
    {
        var employee = await employeeRepository.GetByIdAnyStatusAsync(id)
            ?? throw new NotFoundException("Funcionário não encontrado.");

        employee.IsActive = true;
        employee.UpdatedAt = DateTime.UtcNow;
        await employeeRepository.UpdateAsync(employee);

        // UserId pode ser null se o User foi hard-deletado; reativar o employee sem restaurar acesso.
        if (employee.UserId is null) return;

        var user = await userRepository.GetByIdAsync(employee.UserId.Value);
        if (user is null) return;

        // Restaura o vínculo do usuário com este tenant (removido na desativação).
        if (user.UserTenants.All(ut => ut.TenantId != tenantContext.TenantId))
        {
            user.UserTenants.Add(new UserTenant
            {
                UserId = user.Id,
                TenantId = tenantContext.TenantId,
                Role = UserRole.Employee,
                JoinedAt = DateTime.UtcNow,
            });
        }

        user.LastTenantId = tenantContext.TenantId;
        user.UpdatedAt = DateTime.UtcNow;
        await userRepository.UpdateAsync(user);
    }

    public async Task<IEnumerable<EmployeeResponse>> GetAllInactiveAsync()
    {
        var data = await employeeRepository.GetAllInactiveAsync();
        return await Task.WhenAll(data.Select(Map));
    }

    public async Task HardDeleteAsync(Guid id)
    {
        var employee = await employeeRepository.GetInactiveByIdAsync(id)
            ?? throw new NotFoundException("Funcionário não encontrado.");
        await employeeRepository.HardDeleteAsync(employee);
    }

    private async Task<EmployeeResponse> Map(Employee e) =>
        new(e.Id, e.UserId, e.UserName, e.UserEmail,
            e.RoleId, e.Role.Name,
            e.Phone,
            await storage.ResolveReadUrlAsync(e.ImageUrl, MediaCategory.Profile, e.UpdatedAt),
            e.IsActive, e.CreatedAt);
}
