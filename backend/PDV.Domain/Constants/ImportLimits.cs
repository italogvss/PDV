namespace PDV.Domain.Constants;

// Limites da importação de dados via CSV. Escolhidos para cobrir o catálogo típico
// de um pequeno comércio sem pesar o servidor (insert único em transação).
public static class ImportLimits
{
    public const long MaxFileBytes = 2 * 1024 * 1024; // 2 MB
    public const int MaxRows = 1000;                    // linhas de dados (sem contar o cabeçalho)

    // Cor padrão de categoria criada automaticamente durante a importação
    // (o cadastro manual exige cor; aqui não há input do usuário).
    public const string DefaultCategoryColor = "#9E9E9E";
}
