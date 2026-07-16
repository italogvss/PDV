namespace PDV.Domain.Enums;

// Abrangência do encerramento.
public enum AccountDeletionScope
{
    // Conta inteira: o User Owner, todos os seus tenants e dados vinculados.
    Account,

    // Uma loja específica (Owner com mais de um tenant): só o tenant escolhido é excluído; o User
    // permanece Owner das demais lojas.
    SingleStore,
}
