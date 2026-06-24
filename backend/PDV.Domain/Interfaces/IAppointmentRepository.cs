using PDV.Domain.Entities;

namespace PDV.Domain.Interfaces;

public interface IAppointmentRepository
{
    Task<Appointment?> GetByIdAsync(Guid id);
    Task<IEnumerable<Appointment>> GetByDateRangeAsync(DateOnly startDate, DateOnly endDate);
    Task AddAsync(Appointment appointment);
    Task UpdateAsync(Appointment appointment);
    Task ReplaceServiceItemsAsync(Guid appointmentId, IEnumerable<AppointmentServiceItem> newItems);
    Task DeleteAsync(Appointment appointment);
    Task<bool> HasConflictAsync(Guid? employeeId, DateTime start, int durationMinutes, Guid? excludeId = null);
    Task<int> PurgeAllAsync();
}
