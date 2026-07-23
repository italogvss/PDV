namespace PDV.Application.DTOs.Imports;

// Resultado de uma importação bem-sucedida. Em caso de falha de validação, o service lança
// BusinessException (422) com o detalhe das linhas problemáticas — nada é inserido.
public record ImportResultDto(int ImportedCount, int CreatedCategories);
