using FluentValidation;
using PDV.Application.DTOs.TenantRoles;
using PDV.Application.Interfaces;
using PDV.Domain.Entities;
using PDV.Domain.Enums;
using PDV.Domain.Exceptions;
using PDV.Domain.Interfaces;

namespace PDV.Infrastructure.Services;

public class TenantRoleService(
    ITenantRoleRepository roleRepository,
    ITenantContext tenantContext,
    IValidator<CreateTenantRoleRequest> createValidator,
    IValidator<UpdateTenantRoleRequest> updateValidator,
    IValidator<SetRolePermissionsRequest> setPermissionsValidator) : ITenantRoleService
{
    public async Task<IEnumerable<TenantRoleResponse>> GetAllAsync()
    {
        var roles = await roleRepository.GetAllAsync();
        return roles.Select(Map);
    }

    public async Task<TenantRoleResponse> GetByIdAsync(Guid id)
    {
        var role = await roleRepository.GetByIdAsync(id)
            ?? throw new NotFoundException("Papel não encontrado.");
        return Map(role);
    }

    public async Task<TenantRoleResponse> CreateAsync(CreateTenantRoleRequest request)
    {
        await createValidator.ValidateAndThrowAsync(request);

        var role = new TenantRole
        {
            TenantId = tenantContext.TenantId,
            Name = request.Name.Trim(),
            Description = request.Description?.Trim(),
            Color = request.Color?.Trim(),
            IsDefault = false,
        };

        await roleRepository.AddAsync(role);

        var created = await roleRepository.GetByIdAsync(role.Id)
            ?? throw new NotFoundException("Papel não encontrado após criação.");
        return Map(created);
    }

    public async Task<TenantRoleResponse> UpdateAsync(Guid id, UpdateTenantRoleRequest request)
    {
        await updateValidator.ValidateAndThrowAsync(request);

        var role = await roleRepository.GetByIdAsync(id)
            ?? throw new NotFoundException("Papel não encontrado.");

        // Papéis padrão são referência do sistema — o nome não pode ser alterado
        // (a matriz de permissões e o seed dependem dele); a descrição pode.
        if (role.IsDefault && role.Name != request.Name.Trim())
            throw new BusinessException("O nome de um papel padrão não pode ser alterado.");

        role.Name = request.Name.Trim();
        role.Description = request.Description?.Trim();
        role.Color = request.Color?.Trim();
        role.UpdatedAt = DateTime.UtcNow;

        await roleRepository.UpdateAsync(role);

        var updated = await roleRepository.GetByIdAsync(role.Id)
            ?? throw new NotFoundException("Papel não encontrado após atualização.");
        return Map(updated);
    }

    public async Task DeactivateAsync(Guid id)
    {
        var role = await roleRepository.GetByIdAsync(id)
            ?? throw new NotFoundException("Papel não encontrado.");

        if (role.IsDefault)
            throw new BusinessException("Papéis padrão não podem ser removidos.");

        var activeEmployees = await roleRepository.CountActiveEmployeesAsync(id);
        if (activeEmployees > 0)
            throw new BusinessException("Existem funcionários ativos com este papel. Reatribua-os antes de remover.");

        role.IsActive = false;
        role.UpdatedAt = DateTime.UtcNow;
        await roleRepository.UpdateAsync(role);
    }

    public async Task<IEnumerable<string>> GetPermissionsAsync(Guid id)
    {
        var role = await roleRepository.GetByIdAsync(id)
            ?? throw new NotFoundException("Papel não encontrado.");
        return role.Permissions.Select(p => p.Permission.ToString());
    }

    public async Task<IEnumerable<string>> SetPermissionsAsync(Guid id, SetRolePermissionsRequest request)
    {
        await setPermissionsValidator.ValidateAndThrowAsync(request);

        var role = await roleRepository.GetByIdAsync(id)
            ?? throw new NotFoundException("Papel não encontrado.");

        var parsedPermissions = new List<Permission>();
        foreach (var p in request.Permissions)
        {
            if (!Enum.TryParse<Permission>(p, out var permission))
                throw new BusinessException($"Permissão inválida: '{p}'.");
            parsedPermissions.Add(permission);
        }

        await roleRepository.ReplacePermissionsAsync(id, parsedPermissions);

        return parsedPermissions.Select(p => p.ToString());
    }

    private static TenantRoleResponse Map(TenantRole r) =>
        new(r.Id, r.Name, r.Description, r.Color, r.IsDefault,
            r.Employees.Count(e => e.IsActive),
            r.Permissions.Select(p => p.Permission.ToString()));
}
