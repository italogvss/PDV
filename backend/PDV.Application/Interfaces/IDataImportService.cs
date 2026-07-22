using PDV.Application.DTOs.Imports;

namespace PDV.Application.Interfaces;

// Importação de dados cadastrais via CSV. Tudo-ou-nada: valida o arquivo inteiro e, se qualquer
// linha falhar, não insere nada (BusinessException com o detalhe das linhas). O stream é lido,
// validado e descartado — nada é armazenado em blob.
public interface IDataImportService
{
    Task<ImportResultDto> ImportProductsAsync(Stream csv);
    Task<ImportResultDto> ImportCustomersAsync(Stream csv);
    Task<ImportResultDto> ImportServicesAsync(Stream csv);
}
