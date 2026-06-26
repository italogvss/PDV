using FluentValidation;
using PDV.Application.DTOs.ContactMessages;
using PDV.Application.Interfaces;
using PDV.Domain.Entities;
using PDV.Domain.Enums;
using PDV.Domain.Interfaces;

namespace PDV.Infrastructure.Services;

public class ContactMessageService(
    IContactMessageRepository repository,
    ITenantContext tenantContext,
    IUserContext userContext,
    IValidator<CreateContactMessageRequest> createValidator) : IContactMessageService
{
    public async Task<ContactMessageResponse> CreateAsync(CreateContactMessageRequest request)
    {
        await createValidator.ValidateAndThrowAsync(request);

        var category = Enum.Parse<ContactMessageCategory>(request.Category);

        var message = new ContactMessage
        {
            TenantId = tenantContext.TenantId,
            UserId = userContext.UserId,
            Category = category,
            Subject = request.Subject,
            Body = request.Body,
            Status = ContactMessageStatus.Unread,
            ExpectedBehavior = category == ContactMessageCategory.BugReport ? request.ExpectedBehavior : null,
            Reproducibility = category == ContactMessageCategory.BugReport && request.Reproducibility != null
                ? Enum.Parse<Reproducibility>(request.Reproducibility)
                : null,
            PageContext = request.PageContext,
            AppVersion = request.AppVersion,
            Browser = request.Browser,
            ScreenResolution = request.ScreenResolution,
            Platform = request.Platform,
            CreatedAt = DateTime.UtcNow,
        };

        await repository.AddAsync(message);
        return Map(message);
    }

    private static ContactMessageResponse Map(ContactMessage m) =>
        new(
            m.Id,
            m.Category.ToString(),
            m.Subject,
            m.Body,
            m.Status.ToString(),
            m.ExpectedBehavior,
            m.Reproducibility?.ToString(),
            m.PageContext,
            m.AppVersion,
            m.Browser,
            m.ScreenResolution,
            m.Platform,
            m.CreatedAt
        );
}
