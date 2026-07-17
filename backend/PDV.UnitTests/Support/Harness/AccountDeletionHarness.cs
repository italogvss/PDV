using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using PDV.Application.DTOs.Subscriptions;
using PDV.Application.Interfaces;
using PDV.Domain.Constants;
using PDV.Domain.Entities;
using PDV.Domain.Enums;
using PDV.Domain.Interfaces;
using PDV.Infrastructure.Services;

namespace PDV.UnitTests.Support.Harness;

// Monta o AccountDeletionService. O ILogger vai como NullLogger: o service loga por rastreabilidade,
// não como efeito observável — mockar o logger só produziria asserções sobre texto de log.
//
// Nota importante: este service DECIDE a exclusão (se pode, quando começa a carência, o que cancelar).
// A exclusão física em si é do DataDeletionService, que injeta AppDbContext concreto e cuja regra é
// ordem de FK / cascade — isso não é testável com mock e fica fora deste projeto.
public sealed class AccountDeletionHarness
{
    public Mock<IUserRepository> Users { get; } = new();
    public Mock<ISubscriptionRepository> Subscriptions { get; } = new();
    public Mock<ISubscriptionService> SubscriptionService { get; } = new();
    public Mock<IDataRetentionRepository> Retention { get; } = new();
    public Mock<IAccountDeletionRepository> Ledger { get; } = new();

    private readonly Mock<IUserContext> _userContext = new();

    public User User { get; private set; } = UserBuilderDefault();

    private static User UserBuilderDefault() =>
        Builders.UserBuilder.AnOwner().InTenant(Guid.NewGuid()).Build();

    public AccountDeletionHarness()
    {
        _userContext.SetupGet(c => c.UserId).Returns(() => User.Id);
        Users.Setup(r => r.GetByIdAsync(It.IsAny<Guid>())).ReturnsAsync(() => User);
        Subscriptions.Setup(r => r.GetByUserIdAsync(It.IsAny<Guid>())).ReturnsAsync((Subscription?)null);
        Ledger.Setup(r => r.AddAsync(It.IsAny<AccountDeletion>()))
              .Callback<AccountDeletion>(l => SavedLedger = l)
              .Returns(Task.CompletedTask);
        Ledger.Setup(r => r.UpdateAsync(It.IsAny<AccountDeletion>()))
              .Callback<AccountDeletion>(l => SavedLedger = l)
              .Returns(Task.CompletedTask);
    }

    // Ledger gravado pelo service — a prova de conformidade do pedido.
    public AccountDeletion? SavedLedger { get; private set; }

    public AccountDeletionHarness ForUser(User user) { User = user; return this; }

    public AccountDeletionHarness WithSubscription(Subscription? subscription)
    {
        Subscriptions.Setup(r => r.GetByUserIdAsync(User.Id)).ReturnsAsync(subscription);
        return this;
    }

    // Resposta do cancelamento reusado do SubscriptionService. `accessUntil` é o que decide se o
    // Path B (agendar p/ o fim do plano) é viável.
    public AccountDeletionHarness WhenCancelledReturns(
        string status, bool refundRequested, DateTime? accessUntil)
    {
        SubscriptionService.Setup(s => s.CancelAsync()).ReturnsAsync(
            new CancelSubscriptionResult(
                Status: status,
                RefundRequested: refundRequested,
                AccessUntil: accessUntil,
                DataAvailableUntil: DateTime.UtcNow.AddDays(RetentionDefaults.DaysAfterAccessLoss)));
        return this;
    }

    // Já existe um pedido em curso, com prazo de reversão ainda aberto (ou já vencido).
    public AccountDeletionHarness WithActiveLedger(DateTime scheduledDeletionAt)
    {
        var entry = new AccountDeletion
        {
            Id = Guid.NewGuid(),
            UserId = User.Id,
            Scope = AccountDeletionScope.Account,
            Path = AccountDeletionPath.DeleteNow,
            Status = AccountDeletionStatus.Requested,
            RequestedAt = DateTime.UtcNow.AddDays(-1),
            CarencyStartsAt = DateTime.UtcNow.AddDays(-1),
            ScheduledDeletionAt = scheduledDeletionAt,
        };
        Ledger.Setup(r => r.GetActiveAccountRequestAsync(User.Id)).ReturnsAsync(entry);
        return this;
    }

    public AccountDeletionHarness WithoutActiveLedger()
    {
        Ledger.Setup(r => r.GetActiveAccountRequestAsync(It.IsAny<Guid>()))
              .ReturnsAsync((AccountDeletion?)null);
        return this;
    }

    public AccountDeletionService Build() => new(
        _userContext.Object,
        Users.Object,
        Subscriptions.Object,
        SubscriptionService.Object,
        Retention.Object,
        Ledger.Object,
        NullLogger<AccountDeletionService>.Instance);
}
