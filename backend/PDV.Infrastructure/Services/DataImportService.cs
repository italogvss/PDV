using System.Globalization;
using System.Text;
using Microsoft.EntityFrameworkCore;
using PDV.Application.DTOs.Imports;
using PDV.Application.Helpers;
using PDV.Application.Interfaces;
using PDV.Domain.Constants;
using PDV.Domain.Entities;
using PDV.Domain.Exceptions;
using PDV.Infrastructure.Persistence;

namespace PDV.Infrastructure.Services;

// Importação de dados cadastrais via CSV. Usa o AppDbContext direto (não os repositórios, que dão
// SaveChanges por chamada) para inserir tudo num único commit atômico — é o requisito tudo-ou-nada.
// As colunas espelham a exportação de ReportService; o arquivo exportado pode ser reimportado.
public class DataImportService(AppDbContext context, ITenantContext tenantContext) : IDataImportService
{
    // Quantas linhas com erro listar na mensagem antes de resumir (evita Detail gigante).
    private const int MaxErrorsShown = 15;

    public async Task<ImportResultDto> ImportProductsAsync(Stream csv)
    {
        var (header, rows) = ReadAndValidate(csv, requiredColumns: ["Produto", "Preço"]);
        var col = BuildColumnMap(header);

        var categories = await LoadProductCategoriesAsync();
        var existingBarcodes = new HashSet<string>(
            await context.Products.Where(p => p.Barcode != null).Select(p => p.Barcode!).ToListAsync(),
            StringComparer.Ordinal);
        var seenBarcodes = new HashSet<string>(StringComparer.Ordinal);

        var errors = new List<string>();
        var products = new List<Product>(rows.Count);

        foreach (var row in rows)
        {
            var name = Field(row, col, "Produto");
            if (string.IsNullOrWhiteSpace(name))
            {
                errors.Add($"Linha {row.LineNumber}: nome do produto vazio.");
                continue;
            }

            if (!TryParseDecimal(Field(row, col, "Preço"), out var price) || price < 0)
            {
                errors.Add($"Linha {row.LineNumber}: preço inválido.");
                continue;
            }

            var stockRaw = Field(row, col, "Estoque");
            var stock = 0;
            if (!string.IsNullOrWhiteSpace(stockRaw) && !int.TryParse(stockRaw, out stock))
            {
                errors.Add($"Linha {row.LineNumber}: estoque inválido.");
                continue;
            }

            var barcode = NullIfEmpty(Field(row, col, "Código de Barras"));
            if (barcode is not null)
            {
                if (existingBarcodes.Contains(barcode))
                {
                    errors.Add($"Linha {row.LineNumber}: já existe um produto com o código de barras '{barcode}'.");
                    continue;
                }
                if (!seenBarcodes.Add(barcode))
                {
                    errors.Add($"Linha {row.LineNumber}: código de barras '{barcode}' duplicado no arquivo.");
                    continue;
                }
            }

            products.Add(new Product
            {
                Id = Guid.NewGuid(),
                TenantId = tenantContext.TenantId,
                Name = name.Trim(),
                Barcode = barcode,
                NCM = NullIfEmpty(Field(row, col, "NCM")),
                Price = price,
                Stock = stock,
                CategoryId = ResolveCategory(Field(row, col, "Categoria"), categories),
                IsActive = ParseAtivo(Field(row, col, "Ativo")),
                CreatedAt = DateTime.UtcNow,
            });
        }

        ThrowIfErrors(errors);

        context.Products.AddRange(products);
        await context.SaveChangesAsync();
        return new ImportResultDto(products.Count, categories.Created);
    }

    public async Task<ImportResultDto> ImportCustomersAsync(Stream csv)
    {
        var (header, rows) = ReadAndValidate(csv, requiredColumns: ["Nome"]);
        var col = BuildColumnMap(header);

        var errors = new List<string>();
        var customers = new List<Customer>(rows.Count);

        foreach (var row in rows)
        {
            var name = Field(row, col, "Nome");
            if (string.IsNullOrWhiteSpace(name))
            {
                errors.Add($"Linha {row.LineNumber}: nome do cliente vazio.");
                continue;
            }

            customers.Add(new Customer
            {
                Id = Guid.NewGuid(),
                TenantId = tenantContext.TenantId,
                Name = name.Trim(),
                Phone = NullIfEmpty(Field(row, col, "Telefone")),
                Email = NullIfEmpty(Field(row, col, "E-mail")),
                Document = NullIfEmpty(Field(row, col, "CPF/CNPJ")),
                AddressStreet = NullIfEmpty(Field(row, col, "Rua")),
                AddressNumber = NullIfEmpty(Field(row, col, "Número")),
                AddressCity = NullIfEmpty(Field(row, col, "Cidade")),
                AddressState = NullIfEmpty(Field(row, col, "Estado")),
                AddressZipCode = NullIfEmpty(Field(row, col, "CEP")),
                IsActive = true,
                CreatedAt = DateTime.UtcNow,
            });
        }

        ThrowIfErrors(errors);

        context.Customers.AddRange(customers);
        await context.SaveChangesAsync();
        return new ImportResultDto(customers.Count, 0);
    }

    public async Task<ImportResultDto> ImportServicesAsync(Stream csv)
    {
        var (header, rows) = ReadAndValidate(csv, requiredColumns: ["Nome", "Preço"]);
        var col = BuildColumnMap(header);

        var categories = await LoadServiceCategoriesAsync();

        var errors = new List<string>();
        var services = new List<Service>(rows.Count);

        foreach (var row in rows)
        {
            var name = Field(row, col, "Nome");
            if (string.IsNullOrWhiteSpace(name))
            {
                errors.Add($"Linha {row.LineNumber}: nome do serviço vazio.");
                continue;
            }

            if (!TryParseDecimal(Field(row, col, "Preço"), out var price) || price < 0)
            {
                errors.Add($"Linha {row.LineNumber}: preço inválido.");
                continue;
            }

            var durationRaw = Field(row, col, "Duração (min)");
            int? duration = null;
            if (!string.IsNullOrWhiteSpace(durationRaw))
            {
                if (!int.TryParse(durationRaw, out var d) || d < 0)
                {
                    errors.Add($"Linha {row.LineNumber}: duração inválida.");
                    continue;
                }
                duration = d;
            }

            services.Add(new Service
            {
                Id = Guid.NewGuid(),
                TenantId = tenantContext.TenantId,
                Name = name.Trim(),
                Description = NullIfEmpty(Field(row, col, "Descrição")),
                Price = price,
                DurationMinutes = duration,
                CategoryId = ResolveCategory(Field(row, col, "Categoria"), categories),
                IsActive = ParseAtivo(Field(row, col, "Ativo")),
                CreatedAt = DateTime.UtcNow,
            });
        }

        ThrowIfErrors(errors);

        context.Services.AddRange(services);
        await context.SaveChangesAsync();
        return new ImportResultDto(services.Count, categories.Created);
    }

    // ----- infraestrutura de parse/validação compartilhada -----

    private static (string[] Header, IReadOnlyList<CsvParser.Row> Rows) ReadAndValidate(
        Stream csv, string[] requiredColumns)
    {
        string content;
        using (var reader = new StreamReader(csv, Encoding.UTF8, detectEncodingFromByteOrderMarks: true))
            content = reader.ReadToEnd();

        if (string.IsNullOrWhiteSpace(content))
            throw new BusinessException("O arquivo está vazio.");

        var parsed = CsvParser.Parse(content);
        if (parsed.Header.Length == 0)
            throw new BusinessException("Não foi possível ler o cabeçalho do arquivo.");

        if (parsed.Rows.Count == 0)
            throw new BusinessException("O arquivo não contém nenhuma linha de dados.");

        if (parsed.Rows.Count > ImportLimits.MaxRows)
            throw new BusinessException(
                $"O arquivo tem {parsed.Rows.Count} linhas. O máximo permitido é {ImportLimits.MaxRows}.");

        var headerSet = new HashSet<string>(
            parsed.Header.Select(h => h.Trim()), StringComparer.OrdinalIgnoreCase);
        var missing = requiredColumns.Where(c => !headerSet.Contains(c)).ToList();
        if (missing.Count > 0)
            throw new BusinessException(
                $"O arquivo não tem as colunas obrigatórias: {string.Join(", ", missing)}. " +
                "Use o arquivo exportado como modelo.");

        return (parsed.Header, parsed.Rows);
    }

    // Mapa nome-da-coluna (trim, case-insensitive) → índice. A ordem das colunas não importa;
    // colunas extras (ex.: "Cadastrado em") são simplesmente ignoradas.
    private static Dictionary<string, int> BuildColumnMap(string[] header)
    {
        var map = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
        for (var i = 0; i < header.Length; i++)
            map.TryAdd(header[i].Trim(), i);
        return map;
    }

    private static string Field(CsvParser.Row row, Dictionary<string, int> col, string name)
    {
        if (col.TryGetValue(name, out var idx) && idx < row.Fields.Length)
            return row.Fields[idx];
        return string.Empty;
    }

    private static void ThrowIfErrors(List<string> errors)
    {
        if (errors.Count == 0) return;

        var shown = errors.Take(MaxErrorsShown);
        var detail = string.Join(" ", shown);
        if (errors.Count > MaxErrorsShown)
            detail += $" (+{errors.Count - MaxErrorsShown} outros erros)";

        throw new BusinessException(
            "A importação foi cancelada: corrija os erros e tente novamente. Nenhum registro foi importado.",
            detail);
    }

    // ----- resolução de categoria (mínimo de operações no banco) -----

    // Acumulador: dicionário nome→id já existente + fábrica das categorias novas (add em memória,
    // vão no mesmo SaveChanges). `Created` conta as novas para o resultado da importação.
    private sealed class CategoryResolver
    {
        public required Dictionary<string, Guid> ByName { get; init; }
        public required Func<string, Guid> Create { get; init; }
        public int Created { get; set; }
    }

    private async Task<CategoryResolver> LoadProductCategoriesAsync()
    {
        // 1 SELECT das categorias do tenant (query filter já aplica tenant + IsActive).
        var existing = await context.ProductCategories
            .Select(c => new { c.Id, c.Name })
            .ToListAsync();

        var byName = new Dictionary<string, Guid>(StringComparer.OrdinalIgnoreCase);
        foreach (var c in existing)
            byName.TryAdd(c.Name.Trim(), c.Id);

        return new CategoryResolver
        {
            ByName = byName,
            Create = name =>
            {
                var id = Guid.NewGuid();
                context.ProductCategories.Add(new ProductCategory
                {
                    Id = id,
                    TenantId = tenantContext.TenantId,
                    Name = name,
                    Color = ImportLimits.DefaultCategoryColor,
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow,
                });
                return id;
            },
        };
    }

    private async Task<CategoryResolver> LoadServiceCategoriesAsync()
    {
        var existing = await context.ServiceCategories
            .Select(c => new { c.Id, c.Name })
            .ToListAsync();

        var byName = new Dictionary<string, Guid>(StringComparer.OrdinalIgnoreCase);
        foreach (var c in existing)
            byName.TryAdd(c.Name.Trim(), c.Id);

        return new CategoryResolver
        {
            ByName = byName,
            Create = name =>
            {
                var id = Guid.NewGuid();
                context.ServiceCategories.Add(new ServiceCategory
                {
                    Id = id,
                    TenantId = tenantContext.TenantId,
                    Name = name,
                    Color = ImportLimits.DefaultCategoryColor,
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow,
                });
                return id;
            },
        };
    }

    // Resolve o nome de categoria do CSV: existente → id; nova → cria em memória (add ao mesmo
    // SaveChanges) e memoriza no dicionário; vazio → sem categoria. Zero query por linha.
    private static Guid? ResolveCategory(string rawName, CategoryResolver categories)
    {
        var name = rawName.Trim();
        if (name.Length == 0) return null;

        if (categories.ByName.TryGetValue(name, out var id))
            return id;

        var newId = categories.Create(name);
        categories.ByName[name] = newId;
        categories.Created++;
        return newId;
    }

    // ----- parsing de valores -----

    private static string? NullIfEmpty(string value)
    {
        var v = value.Trim();
        return v.Length == 0 ? null : v;
    }

    // Aceita tanto o formato exportado (invariante, ponto decimal) quanto o pt-BR (vírgula decimal
    // com ponto de milhar) que sai de planilhas do usuário.
    private static bool TryParseDecimal(string raw, out decimal value)
    {
        value = 0;
        var v = raw.Trim();
        if (v.Length == 0) return false;

        var hasComma = v.Contains(',');
        var hasDot = v.Contains('.');
        if (hasComma && hasDot)
            v = v.Replace(".", "").Replace(",", "."); // pt-BR: ponto=milhar, vírgula=decimal
        else if (hasComma)
            v = v.Replace(",", ".");

        return decimal.TryParse(v, NumberStyles.Number, CultureInfo.InvariantCulture, out value);
    }

    private static bool ParseAtivo(string raw)
    {
        var v = raw.Trim();
        // Vazio ou "Sim" → ativo; "Não"/"Nao"/"false"/"0" → inativo.
        if (v.Length == 0) return true;
        return v is not ("Não" or "Nao" or "não" or "nao" or "N" or "false" or "0");
    }
}
