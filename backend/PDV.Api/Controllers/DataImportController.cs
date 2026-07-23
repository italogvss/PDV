using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PDV.Api.Attributes;
using PDV.Application.DTOs.Imports;
using PDV.Application.Interfaces;
using PDV.Domain.Constants;
using PDV.Domain.Enums;
using PDV.Domain.Exceptions;

namespace PDV.Api.Controllers;

// Importação de dados cadastrais via CSV. Diferente da exportação (DataExportController, que fica
// fora do gate de plano por ser a saída de quem cancelou), a importação CRIA dados — então segue
// o gating normal de cada módulo (RequireModule + RequirePermission), igual ao cadastro manual.
//
// O CSV passa pelo backend só para ser lido, validado e descartado (nada é armazenado em blob) —
// não é o caso da regra "upload não passa pelo backend", que vale para mídia/MinIO.
[ApiController]
[Route("api/reports/import")]
[Authorize]
public class DataImportController(IDataImportService service) : ControllerBase
{
    [HttpPost("products")]
    [RequireModule(OperationModule.Inventory)]
    [RequirePermission(Permission.ManageStock)]
    public Task<IActionResult> ImportProducts(IFormFile file)
        => Handle(file, service.ImportProductsAsync);

    [HttpPost("customers")]
    [RequireModule(OperationModule.Customers)]
    [RequirePermission(Permission.ManageCustomers)]
    public Task<IActionResult> ImportCustomers(IFormFile file)
        => Handle(file, service.ImportCustomersAsync);

    [HttpPost("services")]
    [RequireModule(OperationModule.Services)]
    [RequirePermission(Permission.ManageServices)]
    public Task<IActionResult> ImportServices(IFormFile file)
        => Handle(file, service.ImportServicesAsync);

    private async Task<IActionResult> Handle(
        IFormFile file, Func<Stream, Task<ImportResultDto>> import)
    {
        ValidateFile(file);
        await using var stream = file.OpenReadStream();
        var result = await import(stream);
        return Ok(result);
    }

    private static void ValidateFile(IFormFile? file)
    {
        if (file is null || file.Length == 0)
            throw new BusinessException("Selecione um arquivo CSV para importar.");

        if (file.Length > ImportLimits.MaxFileBytes)
            throw new BusinessException(
                $"O arquivo excede o tamanho máximo de {ImportLimits.MaxFileBytes / (1024 * 1024)} MB.");

        var name = file.FileName ?? string.Empty;
        var isCsv = name.EndsWith(".csv", StringComparison.OrdinalIgnoreCase)
            || string.Equals(file.ContentType, "text/csv", StringComparison.OrdinalIgnoreCase);
        if (!isCsv)
            throw new BusinessException("Somente arquivos .csv são aceitos.");
    }
}
