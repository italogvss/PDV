using Microsoft.EntityFrameworkCore;
using PDV.Application.Interfaces;
using PDV.Domain.Entities;
using PDV.Domain.Enums;
using PDV.Domain.Interfaces;
using PDV.Infrastructure.Persistence;

namespace PDV.Infrastructure.Repositories;

public class AppointmentRepository(AppDbContext context, ITenantContext tenantContext) : IAppointmentRepository
{
    public async Task<Appointment?> GetByIdAsync(Guid id) =>
        await context.Appointments
            .Include(a => a.ServiceItems)
            .Include(a => a.Employee)
            .Include(a => a.Customer)
            .FirstOrDefaultAsync(a => a.Id == id);

    public async Task<IEnumerable<Appointment>> GetByDateRangeAsync(DateOnly startDate, DateOnly endDate)
    {
        var startDt = startDate.ToDateTime(TimeOnly.MinValue);
        var endDt = endDate.AddDays(1).ToDateTime(TimeOnly.MinValue);

        return await context.Appointments
            .Include(a => a.ServiceItems)
            .Include(a => a.Employee)
            .Include(a => a.Customer)
            .Where(a => a.Start >= startDt && a.Start < endDt)
            .OrderBy(a => a.Start)
            .ToListAsync();
    }

    public async Task AddAsync(Appointment appointment)
    {
        await context.Appointments.AddAsync(appointment);
        await context.SaveChangesAsync();
    }

    public async Task UpdateAsync(Appointment appointment)
    {
        appointment.UpdatedAt = DateTime.UtcNow;
        context.Appointments.Update(appointment);
        await context.SaveChangesAsync();
    }

    public async Task ReplaceServiceItemsAsync(Guid appointmentId, IEnumerable<AppointmentServiceItem> newItems)
    {
        var existing = await context.AppointmentServiceItems
            .Where(i => i.AppointmentId == appointmentId)
            .ToListAsync();

        context.AppointmentServiceItems.RemoveRange(existing);
        await context.AppointmentServiceItems.AddRangeAsync(newItems);
        await context.SaveChangesAsync();
    }

    public async Task DeleteAsync(Appointment appointment)
    {
        appointment.IsActive = false;
        appointment.UpdatedAt = DateTime.UtcNow;
        context.Appointments.Update(appointment);
        await context.SaveChangesAsync();
    }

    public async Task<bool> HasConflictAsync(Guid? employeeId, DateTime start, int durationMinutes, Guid? excludeId = null)
    {
        var newEnd = start.AddMinutes(durationMinutes);
        return await context.Appointments
            .Where(a => a.EmployeeId == employeeId
                && a.Status != AppointmentStatus.Cancelado
                && (excludeId == null || a.Id != excludeId)
                && a.Start < newEnd
                && a.Start.AddMinutes(a.DurationMinutes) > start)
            .AnyAsync();
    }

    // IgnoreQueryFilters: remove TUDO do tenant, inclusive registros já soft-deletados (IsActive = false).
    // O filtro de TenantId é reaplicado manualmente para não vazar exclusão entre tenants.
    // AppointmentServiceItems são removidos por cascade de FK configurado no banco.
    public Task<int> PurgeAllAsync() =>
        context.Appointments
            .IgnoreQueryFilters()
            .Where(a => a.TenantId == tenantContext.TenantId)
            .ExecuteDeleteAsync();
}
