using PDV.Domain.Entities;
using PDV.Domain.Enums;
using PDV.Infrastructure.Persistence;

namespace PDV.Infrastructure.Services.Notifications;

// Tudo que uma regra precisa para contar. Carrega o TenantSettings já resolvido para que
// nenhuma regra volte ao banco só para checar uma configuração da loja.
internal sealed record NotificationContext(AppDbContext Db, DateTime Today, TenantSettings? Settings)
{
    public DateTime Tomorrow => Today.AddDays(1);

    public bool InventoryControlEnabled => Settings?.InventoryControlEnabled ?? false;
}

// Uma notificação do motor. É dado, não código: a regra declara quando pode aparecer
// (módulo do tenant × permissão do usuário × preferência pessoal) e como se conta.
//
// Permissions tem semântica OR (basta ter uma); Owner e Admin passam sempre.
internal sealed record NotificationRule(
    string Key,
    OperationModule Module,
    Func<UserSettings, bool> IsPreferenceEnabled,
    Permission[] Permissions,
    Func<NotificationContext, Task<int>> CountAsync);
