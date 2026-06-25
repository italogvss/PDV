using Microsoft.EntityFrameworkCore;
using PDV.Domain.Entities;
using PDV.Domain.Interfaces;
using PDV.Infrastructure.Persistence;

namespace PDV.Infrastructure.Repositories;

public class EmployeeSalaryLinkRepository(AppDbContext context) : IEmployeeSalaryLinkRepository
{
    public async Task<EmployeeSalaryLink?> GetByEmployeeIdAsync(Guid employeeId) =>
        await context.EmployeeSalaryLinks.FirstOrDefaultAsync(l => l.EmployeeId == employeeId);

    public async Task AddAsync(EmployeeSalaryLink link)
    {
        await context.EmployeeSalaryLinks.AddAsync(link);
        await context.SaveChangesAsync();
    }

    public async Task DeleteAsync(EmployeeSalaryLink link)
    {
        context.EmployeeSalaryLinks.Remove(link);
        await context.SaveChangesAsync();
    }
}
