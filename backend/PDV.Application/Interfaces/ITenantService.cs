using PDV.Application.DTOs.Tenants;

namespace PDV.Application.Interfaces;

public interface ITenantService
{
    Task<(CreateTenantResponse Response, string AccessToken)> CreateAsync(
        Guid userId, CreateTenantRequest request);

    Task<TenantSettingsResponse> GetSettingsAsync();
    Task<BusinessSettingsDto> UpdateBusinessAsync(BusinessSettingsDto request);
    Task<OperationSettingsDto> UpdateOperationAsync(OperationSettingsDto request);
    Task<PaymentsSettingsDto> UpdatePaymentsAsync(PaymentsSettingsDto request);
    Task<ModulesSettingsDto> UpdateModulesAsync(ModulesSettingsDto request);
    Task<string> DeactivateCurrentAsync(Guid userId);
    Task ValidateOwnershipAsync(Guid userId, Guid tenantId);
}
