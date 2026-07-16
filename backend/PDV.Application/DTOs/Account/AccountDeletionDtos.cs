using PDV.Domain.Enums;

namespace PDV.Application.DTOs.Account;

// Estado da assinatura no momento do pedido — alimenta o alerta de vigência e a escolha de caminho
// no diálogo de confirmação.
//   WithinRefundWindow    — pedido dentro dos 7 dias: encerrar emite o estorno integral.
//   RefundInProgress      — estorno de um cancelamento anterior em curso: o pedido é bloqueado.
//   CanScheduleAtPeriodEnd— Path B disponível (assinatura paga vigente fora da janela de 7 dias).
public record AccountDeletionPreview(
    string SubscriptionStatus,
    DateTime? CurrentPeriodEnd,
    bool WithinRefundWindow,
    bool RefundInProgress,
    bool CanScheduleAtPeriodEnd,
    int GraceDays);

public record RequestAccountDeletionRequest(AccountDeletionPath Path);

// Resultado do pedido — o frontend deriva a mensagem daqui.
//   EffectiveAt          — início da carência bloqueada.
//   ScheduledDeletionAt  — quando a exclusão definitiva roda (fim da carência).
public record AccountDeletionResult(
    DateTime EffectiveAt,
    DateTime ScheduledDeletionAt,
    bool SubscriptionCanceled,
    bool RefundRequested);

// Estado corrente do encerramento (para banner/tela global e /me).
//   Blocked — a carência já começou (now >= EffectiveAt): a conta está bloqueada para uso.
public record AccountDeletionStatusResponse(
    bool Pending,
    DateTime? RequestedAt,
    DateTime? EffectiveAt,
    DateTime? ScheduledDeletionAt,
    bool Blocked);
