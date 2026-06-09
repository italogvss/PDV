using FluentValidation;
using PDV.Application.DTOs.Appointments;
using PDV.Application.Interfaces;
using PDV.Domain.Entities;
using PDV.Domain.Enums;
using PDV.Domain.Exceptions;
using PDV.Domain.Interfaces;

namespace PDV.Infrastructure.Services;

public class AppointmentService(
    IAppointmentRepository repository,
    IEmployeeRepository employeeRepository,
    IServiceRepository serviceRepository,
    ITenantContext tenantContext,
    IValidator<CreateAppointmentRequest> createValidator,
    IValidator<UpdateAppointmentRequest> updateValidator) : IAppointmentService
{
    public async Task<IEnumerable<AppointmentResponse>> GetByDateRangeAsync(DateOnly startDate, DateOnly endDate)
    {
        var appointments = await repository.GetByDateRangeAsync(startDate, endDate);
        return appointments.Select(Map);
    }

    public async Task<AppointmentResponse> GetByIdAsync(Guid id)
    {
        var appointment = await repository.GetByIdAsync(id)
            ?? throw new NotFoundException("Agendamento não encontrado.");
        return Map(appointment);
    }

    public async Task<AppointmentResponse> CreateAsync(CreateAppointmentRequest request)
    {
        await createValidator.ValidateAndThrowAsync(request);

        var employee = await employeeRepository.GetByIdAsync(request.EmployeeId)
            ?? throw new NotFoundException("Profissional não encontrado.");

        var serviceIds = request.ServiceIds.ToList();
        var serviceItems = await BuildServiceItemsAsync(serviceIds);

        var appointment = new Appointment
        {
            TenantId = tenantContext.TenantId,
            CustomerId = request.CustomerId,
            CustomerName = request.CustomerName,
            CustomerPhone = request.CustomerPhone,
            EmployeeId = employee.Id,
            Start = request.Start,
            DurationMinutes = request.DurationMinutes,
            Price = request.Price,
            Status = ParseStatus(request.Status),
            Note = request.Note,
            Color = request.Color,
            ServiceItems = serviceItems,
        };

        await repository.AddAsync(appointment);

        var created = await repository.GetByIdAsync(appointment.Id)
            ?? throw new NotFoundException("Agendamento não encontrado após criação.");
        return Map(created);
    }

    public async Task<AppointmentResponse> UpdateAsync(Guid id, UpdateAppointmentRequest request)
    {
        await updateValidator.ValidateAndThrowAsync(request);

        var appointment = await repository.GetByIdAsync(id)
            ?? throw new NotFoundException("Agendamento não encontrado.");

        var employee = await employeeRepository.GetByIdAsync(request.EmployeeId)
            ?? throw new NotFoundException("Profissional não encontrado.");

        appointment.CustomerId = request.CustomerId;
        appointment.CustomerName = request.CustomerName;
        appointment.CustomerPhone = request.CustomerPhone;
        appointment.EmployeeId = employee.Id;
        appointment.Start = request.Start;
        appointment.DurationMinutes = request.DurationMinutes;
        appointment.Price = request.Price;
        appointment.Status = ParseStatus(request.Status);
        appointment.Note = request.Note;
        appointment.Color = request.Color;

        var serviceIds = request.ServiceIds.ToList();
        var newServiceItems = await BuildServiceItemsAsync(serviceIds, id);

        await repository.UpdateAsync(appointment);
        await repository.ReplaceServiceItemsAsync(id, newServiceItems);

        var updated = await repository.GetByIdAsync(id)
            ?? throw new NotFoundException("Agendamento não encontrado após atualização.");
        return Map(updated);
    }

    public async Task<AppointmentResponse> ChangeStatusAsync(Guid id, ChangeAppointmentStatusRequest request)
    {
        var appointment = await repository.GetByIdAsync(id)
            ?? throw new NotFoundException("Agendamento não encontrado.");

        appointment.Status = ParseStatus(request.Status);
        await repository.UpdateAsync(appointment);

        var updated = await repository.GetByIdAsync(id)
            ?? throw new NotFoundException("Agendamento não encontrado após atualização.");
        return Map(updated);
    }

    public async Task DeleteAsync(Guid id)
    {
        var appointment = await repository.GetByIdAsync(id)
            ?? throw new NotFoundException("Agendamento não encontrado.");
        await repository.DeleteAsync(appointment);
    }

    private async Task<List<AppointmentServiceItem>> BuildServiceItemsAsync(
        IEnumerable<Guid> serviceIds, Guid? appointmentId = null)
    {
        var items = new List<AppointmentServiceItem>();
        foreach (var serviceId in serviceIds)
        {
            var service = await serviceRepository.GetByIdAsync(serviceId)
                ?? throw new NotFoundException($"Serviço '{serviceId}' não encontrado.");

            items.Add(new AppointmentServiceItem
            {
                AppointmentId = appointmentId ?? Guid.Empty,
                ServiceId = service.Id,
                ServiceName = service.Name,
                DurationMinutes = service.DurationMinutes ?? 30,
                Price = service.Price,
                CategoryColor = service.Category?.Color ?? "#807d75",
            });
        }
        return items;
    }

    private static AppointmentStatus ParseStatus(string status) => status switch
    {
        "pendente" => AppointmentStatus.Pendente,
        "confirmado" => AppointmentStatus.Confirmado,
        "em_atendimento" => AppointmentStatus.EmAtendimento,
        "concluido" => AppointmentStatus.Concluido,
        "cancelado" => AppointmentStatus.Cancelado,
        _ => throw new BusinessException($"Status '{status}' inválido.")
    };

    private static string MapStatus(AppointmentStatus status) => status switch
    {
        AppointmentStatus.EmAtendimento => "em_atendimento",
        _ => status.ToString().ToLower()
    };

    private static AppointmentServiceRefResponse MapItem(AppointmentServiceItem i) =>
        new(i.ServiceId, i.ServiceName, i.DurationMinutes, i.Price, i.CategoryColor);

    private static AppointmentResponse Map(Appointment a) =>
        new(a.Id, a.CustomerId, a.CustomerName, a.CustomerPhone,
            a.EmployeeId, a.ServiceItems.Select(MapItem),
            a.Start, a.DurationMinutes, a.Price, MapStatus(a.Status), a.Note, a.Color, a.CreatedAt);
}
