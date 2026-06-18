namespace PDV.Application.Interfaces;

// Identidade do usuário autenticado (claim `sub`/NameIdentifier do JWT). Usado pelas entidades
// de cobrança, que são scoped por UserId (Owner) e não por tenant.
public interface IUserContext
{
    Guid UserId { get; }
}
