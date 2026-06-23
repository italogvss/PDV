namespace PDV.Domain.Entities;

// Marca o que cada usuário já viu — mecanismo genérico de "uma vez por usuário".
// Entidade GLOBAL, scoped por UserId (sem query filter de tenant). A Key é livre:
//   - aviso editorial → Key = Announcement.Id (string do Guid)
//   - modal de ciclo de vida → Key reservada com prefixo, ex.: "lifecycle:welcome"
public class UserSeenMarker : BaseEntity
{
    public Guid UserId { get; set; }
    public string Key { get; set; } = string.Empty;
    public DateTime SeenAt { get; set; } = DateTime.UtcNow;
}
