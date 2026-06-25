using FluentValidation;
using PDV.Application.DTOs.Common;
using PDV.Application.DTOs.Employees;
using PDV.Application.Helpers;
using PDV.Application.Interfaces;
using PDV.Domain.Constants;
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
    IEntitlementService entitlementService,
    IAuditLogger auditLogger,
    IExpenseRepository expenseRepository,
    IEmployeeSalaryLinkRepository salaryLinkRepository,
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

        var existingUsername = await userRepository.GetByUsernameAsync(request.Username);
        if (existingUsername is not null)
            throw new BusinessException("Nome de usuário já está em uso.");

        if (await employeeRepository.EmailExistsInTenantAsync(request.Email))
            throw new BusinessException("Já existe um funcionário com este e-mail nesta loja.");

        // Enforcement de limite do plano (402 se atingido).
        await entitlementService.EnsureWithinLimitAsync(PlanLimits.MaxEmployees, await employeeRepository.CountAsync());

        var role = await roleRepository.GetByIdAsync(request.RoleId)
            ?? throw new BusinessException("Papel não encontrado.");

        var user = new User
        {
            Email = request.Email,
            Username = request.Username,
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
            Salary = request.Salary,
            PaymentDay = request.PaymentDay,
            AutoCreateSalaryExpense = request.AutoCreateSalaryExpense,
        };

        await employeeRepository.AddAsync(employee);

        if (request.AutoCreateSalaryExpense)
            await ActivateSalaryExpenseAsync(employee);

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

        var wasAutoCreate = employee.AutoCreateSalaryExpense;
        var prevSalary = employee.Salary;
        var prevPaymentDay = employee.PaymentDay;

        employee.RoleId = role.Id;
        employee.Phone = request.Phone;
        employee.Salary = request.Salary;
        employee.PaymentDay = request.PaymentDay;
        employee.AutoCreateSalaryExpense = request.AutoCreateSalaryExpense;
        employee.UpdatedAt = DateTime.UtcNow;

        await employeeRepository.UpdateAsync(employee);

        if (wasAutoCreate && !request.AutoCreateSalaryExpense)
        {
            // Switch desligado → encerrar série de salário
            await TerminateSalaryExpenseAsync(employee);
        }
        else if (!wasAutoCreate && request.AutoCreateSalaryExpense)
        {
            // Switch ligado → iniciar série de salário
            await ActivateSalaryExpenseAsync(employee);
        }
        else if (wasAutoCreate && request.AutoCreateSalaryExpense &&
                 (prevSalary != request.Salary || prevPaymentDay != request.PaymentDay))
        {
            // Salário ou dia de pagamento alterado com switch ativo → reiniciar série
            await TerminateSalaryExpenseAsync(employee);
            await ActivateSalaryExpenseAsync(employee);
        }

        var updated = await employeeRepository.GetByIdAsync(employee.Id)
            ?? throw new NotFoundException("Funcionário não encontrado após atualização.");
        return await Map(updated);
    }

    public async Task DeactivateAsync(Guid id)
    {
        var employee = await employeeRepository.GetByIdAsync(id)
            ?? throw new NotFoundException("Funcionário não encontrado.");

        await auditLogger.LogEmployeeDeactivatedAsync(employee.Id, employee.UserName);

        // Encerra a série de salário para não continuar gerando despesas futuras de funcionário inativo.
        if (employee.AutoCreateSalaryExpense)
            await TerminateSalaryExpenseAsync(employee);

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

        // Recria a série de salário se estava ativa antes da desativação.
        if (employee.AutoCreateSalaryExpense && employee.Salary.HasValue && employee.PaymentDay.HasValue)
            await ActivateSalaryExpenseAsync(employee);

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

        // Limpa série residual — defesa, normalmente encerrada na desativação.
        await TerminateSalaryExpenseAsync(employee);

        // Zera EmployeeId nas despesas históricas para liberar a restrição FK.
        await expenseRepository.ClearEmployeeReferenceAsync(id);

        await employeeRepository.HardDeleteAsync(employee);
    }

    // ─── Salary expense helpers ────────────────────────────────────────────────

    private async Task ActivateSalaryExpenseAsync(Employee employee)
    {
        var seriesId = Guid.NewGuid();
        var dueDate = ComputeNextPaymentDate(DateTime.UtcNow, employee.PaymentDay!.Value);

        var expense = new Expense
        {
            Id = Guid.NewGuid(),
            TenantId = employee.TenantId,
            Description = $"Salario - {employee.UserName}",
            Category = ExpenseCategory.Salarios,
            Amount = employee.Salary!.Value,
            IsRecurring = true,
            RepeatCount = null,
            RecurringSeriesId = seriesId,
            EmployeeId = employee.Id,
            DueDate = dueDate,
            IsPaid = false,
            PaidAt = null,
            CreatedAt = DateTime.UtcNow,
        };

        await expenseRepository.AddAsync(expense);

        var link = new EmployeeSalaryLink
        {
            EmployeeId = employee.Id,
            TenantId = employee.TenantId,
            RecurringSeriesId = seriesId,
            CreatedAt = DateTime.UtcNow,
        };

        await salaryLinkRepository.AddAsync(link);
    }

    private async Task TerminateSalaryExpenseAsync(Employee employee)
    {
        var link = await salaryLinkRepository.GetByEmployeeIdAsync(employee.Id);
        if (link is null) return;

        var allInSeries = (await expenseRepository.GetAllInSeriesAsync(link.RecurringSeriesId)).ToList();
        var unpaid = allInSeries.Where(e => !e.IsPaid).ToList();
        var paid = allInSeries.Where(e => e.IsPaid).ToList();

        if (unpaid.Count > 0)
            await expenseRepository.DeleteRangeAsync(unpaid);

        // Desvincula despesas pagas da série — o background service não vai re-extendê-las.
        // EmployeeId permanece para proteger a exclusão manual dessas despesas históricas.
        foreach (var e in paid)
        {
            e.IsRecurring = false;
            e.RecurringSeriesId = null;
            await expenseRepository.UpdateAsync(e);
        }

        await salaryLinkRepository.DeleteAsync(link);
    }

    private static DateTime ComputeNextPaymentDate(DateTime today, int paymentDay)
    {
        var candidate = new DateTime(today.Year, today.Month, paymentDay, 0, 0, 0, DateTimeKind.Utc);
        if (candidate <= today)
            candidate = candidate.AddMonths(1);
        return candidate;
    }

    private async Task<EmployeeResponse> Map(Employee e) =>
        new(e.Id, e.UserId, e.UserName, e.UserEmail,
            e.RoleId, e.Role.Name,
            e.Phone,
            await storage.ResolveReadUrlAsync(e.ImageUrl, MediaCategory.Profile, e.UpdatedAt),
            e.IsActive, e.CreatedAt,
            e.Salary, e.PaymentDay, e.AutoCreateSalaryExpense);
}
