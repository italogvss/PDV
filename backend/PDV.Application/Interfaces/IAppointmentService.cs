using PDV.Application.DTOs.Appointments;

namespace PDV.Application.Interfaces;

public interface IAppointmentService
{
    Task<IEnumerable<AppointmentResponse>> GetByDateRangeAsync(DateOnly startDate, DateOnly endDate);
    Task<AppointmentResponse> GetByIdAsync(Guid id);
    Task<AppointmentResponse> CreateAsync(CreateAppointmentRequest request);
    Task<AppointmentResponse> UpdateAsync(Guid id, UpdateAppointmentRequest request);
    Task<AppointmentResponse> ChangeStatusAsync(Guid id, ChangeAppointmentStatusRequest request, Guid changedByUserId);
    Task DeleteAsync(Guid id);
    Task<int> PurgeAllAsync();
}
