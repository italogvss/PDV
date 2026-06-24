namespace PDV.Application.Interfaces;

// Identidade do usuário autenticado (claims do JWT). Usado pelas entidades de cobrança
// (scoped por UserId) e para identificar o owner como profissional em agendamentos.
public interface IUserContext
{
    Guid UserId { get; }
    string UserName { get; }
}
