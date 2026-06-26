using PDV.Application.DTOs.ContactMessages;

namespace PDV.Application.Interfaces;

public interface IContactMessageService
{
    Task<ContactMessageResponse> CreateAsync(CreateContactMessageRequest request);
}
