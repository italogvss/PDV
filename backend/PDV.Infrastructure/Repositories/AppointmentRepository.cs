using Microsoft.EntityFrameworkCore;
using PDV.Domain.Entities;
using PDV.Domain.Interfaces;
using PDV.Infrastructure.Persistence;

namespace PDV.Infrastructure.Repositories;

public class AppointmentRepository(AppDbContext context) : IAppointmentRepository
{
    public async Task<Appointment?> GetByIdAsync(Guid id) =>
        await context.Appointments
            .Include(a => a.ServiceItems)
            .Include(a => a.Employee).ThenInclude(e => e.User)
            .Include(a => a.Customer)
            .FirstOrDefaultAsync(a => a.Id == id);

    public async Task<IEnumerable<Appointment>> GetByDateRangeAsync(DateOnly startDate, DateOnly endDate)
    {
        var startDt = startDate.ToDateTime(TimeOnly.MinValue);
        var endDt = endDate.AddDays(1).ToDateTime(TimeOnly.MinValue);

        return await context.Appointments
            .Include(a => a.ServiceItems)
            .Include(a => a.Employee).ThenInclude(e => e.User)
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
}
