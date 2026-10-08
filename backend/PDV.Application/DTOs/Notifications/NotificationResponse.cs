namespace PDV.Application.DTOs.Notifications;

// Lista plana de notificações ativas. Só vêm itens com Count > 0 — o frontend não precisa
// saber quais regras existem, só renderizar o que chegou.
//
// Key é a chave do NotificationCatalog; o rótulo, o ícone, a severidade e a rota são do
// frontend (constants/notifications.ts). Chave sem definição no frontend é ignorada, o que
// permite subir o backend antes.
public record NotificationsResponse(IReadOnlyList<NotificationItemResponse> Items);

public record NotificationItemResponse(string Key, int Count);
