using FluentValidation;
using PDV.Application.DTOs.Common;
using PDV.Application.DTOs.Employees;
using PDV.Application.Interfaces;
using PDV.Domain.Entities;
using PDV.Domain.Enums;
using PDV.Domain.Exceptions;
using PDV.Domain.Interfaces;

namespace PDV.Infrastructure.Services;

public class EmployeeService(
    IEmployeeRepository employeeRepository,
    IEmployeeTypePermissionRepository permissionRepository,
    IUserRepository userRepository,
    ITenantContext tenantContext,
    IValidator<CreateEmployeeRequest> createValidator,
    IValidator<UpdateEmployeeRequest> updateValidator) : IEmployeeService
{
    public async Task<PaginatedResponse<EmployeeResponse>> GetAllAsync(int page, int pageSize)
    {
        var (data, totalCount) = await employeeRepository.GetAllAsync(page, pageSize);
        var totalPages = (int)Math.Ceiling((double)totalCount / pageSize);
        return new PaginatedResponse<EmployeeResponse>(data.Select(Map), page, pageSize, totalCount, totalPages);
    }

    public async Task<EmployeeResponse> GetByIdAsync(Guid id)
    {
        var employee = await employeeRepository.GetByIdAsync(id)
            ?? throw new NotFoundException("Funcionário não encontrado.");
        return Map(employee);
    }

    public async Task<EmployeeResponse> CreateAsync(CreateEmployeeRequest request)
    {
        await createValidator.ValidateAndThrowAsync(request);

        var existing = await userRepository.GetByEmailAsync(request.Email);
        if (existing is not null)
            throw new BusinessException("Já existe um usuário com este e-mail.");

        if (!Enum.TryParse<EmployeeType>(request.EmployeeType, out var employeeType))
            throw new BusinessException("EmployeeType inválido.");

        var user = new User
        {
            Email = request.Email,
            Name = request.Name,
            Role = UserRole.Employee,
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

        await userRepository.AddAsync(user);

        var employee = new Employee
        {
            TenantId = tenantContext.TenantId,
            UserId = user.Id,
            EmployeeType = employeeType,
            Position = request.Position,
            Salary = request.Salary,
            Phone = request.Phone,
        };

        await employeeRepository.AddAsync(employee);

        var created = await employeeRepository.GetByIdAsync(employee.Id)
            ?? throw new NotFoundException("Funcionário não encontrado após criação.");
        return Map(created);
    }

    public async Task<EmployeeResponse> UpdateAsync(Guid id, UpdateEmployeeRequest request)
    {
        await updateValidator.ValidateAndThrowAsync(request);

        var employee = await employeeRepository.GetByIdAsync(id)
            ?? throw new NotFoundException("Funcionário não encontrado.");

        if (!Enum.TryParse<EmployeeType>(request.EmployeeType, out var employeeType))
            throw new BusinessException("EmployeeType inválido.");

        employee.EmployeeType = employeeType;
        employee.Position = request.Position;
        employee.Salary = request.Salary;
        employee.Phone = request.Phone;
        employee.UpdatedAt = DateTime.UtcNow;

        await employeeRepository.UpdateAsync(employee);

        var updated = await employeeRepository.GetByIdAsync(employee.Id)
            ?? throw new NotFoundException("Funcionário não encontrado após atualização.");
        return Map(updated);
    }

    public async Task DeactivateAsync(Guid id)
    {
        var employee = await employeeRepository.GetByIdAsync(id)
            ?? throw new NotFoundException("Funcionário não encontrado.");

        employee.IsActive = false;
        employee.User.IsActive = false;
        employee.UpdatedAt = DateTime.UtcNow;
        employee.User.UpdatedAt = DateTime.UtcNow;

        await employeeRepository.UpdateAsync(employee);
    }

    public async Task ReactivateAsync(Guid id)
    {
        var employee = await employeeRepository.GetByIdAnyStatusAsync(id)
            ?? throw new NotFoundException("Funcionário não encontrado.");

        employee.IsActive = true;
        employee.User.IsActive = true;
        employee.UpdatedAt = DateTime.UtcNow;
        employee.User.UpdatedAt = DateTime.UtcNow;

        await employeeRepository.UpdateAsync(employee);
    }

    public async Task<EmployeePermissionsResponse> GetPermissionsAsync(string employeeType)
    {
        if (!Enum.TryParse<EmployeeType>(employeeType, out var type))
            throw new BusinessException("EmployeeType inválido.");

        var permissions = await permissionRepository.GetByTenantAndTypeAsync(tenantContext.TenantId, type);

        return new EmployeePermissionsResponse(
            type.ToString(),
            permissions.Select(p => p.Permission.ToString()));
    }

    public async Task<EmployeePermissionsResponse> SetPermissionsAsync(EmployeePermissionsRequest request)
    {
        if (!Enum.TryParse<EmployeeType>(request.EmployeeType, out var type))
            throw new BusinessException("EmployeeType inválido.");

        var parsedPermissions = new List<Permission>();
        foreach (var p in request.Permissions)
        {
            if (!Enum.TryParse<Permission>(p, out var permission))
                throw new BusinessException($"Permissão inválida: '{p}'.");
            parsedPermissions.Add(permission);
        }

        await permissionRepository.ReplaceAsync(tenantContext.TenantId, type, parsedPermissions);

        return new EmployeePermissionsResponse(type.ToString(), parsedPermissions.Select(p => p.ToString()));
    }

    private static EmployeeResponse Map(Employee e) =>
        new(e.Id, e.UserId, e.User.Name, e.User.Email,
            e.EmployeeType.ToString(), e.Position,
            e.Salary, e.Phone, e.AvatarUrl, e.IsActive, e.CreatedAt);
}
