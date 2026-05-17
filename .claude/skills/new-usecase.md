# Skill — Novo use case

Use esta skill sempre que precisar criar um novo use case em `PDVUltra.Application`.

## Estrutura de pastas

```
PDVUltra.Application/
└── UseCases/
    └── {Feature}/
        ├── {Action}{Feature}UseCase.cs
        ├── {Action}{Feature}Input.cs
        └── {Action}{Feature}Output.cs
```

Exemplo para criar produto: `UseCases/Products/CreateProductUseCase.cs`

## Checklist obrigatório

1. Input e Output são records imutáveis — nunca classes mutáveis
2. O use case recebe dependências via construtor (repositório, ITenantContext)
3. Validação dos dados de entrada no início do método `ExecuteAsync`
4. Nunca retornar a entidade de domínio — sempre mapear para Output
5. Nunca chamar `DbContext` diretamente — sempre via repositório
6. Registrar o use case no DI em `Program.cs`

## Template

```csharp
// Input.cs
public record {Action}{Feature}Input(
    string Name
    // demais propriedades obrigatórias
);

// Output.cs
public record {Action}{Feature}Output(
    Guid Id,
    string Name,
    DateTime CreatedAt
);

// UseCase.cs
public class {Action}{Feature}UseCase
{
    private readonly I{Feature}Repository _repository;
    private readonly ITenantContext _tenant;

    public {Action}{Feature}UseCase(I{Feature}Repository repository, ITenantContext tenant)
    {
        _repository = repository;
        _tenant = tenant;
    }

    public async Task<{Action}{Feature}Output> ExecuteAsync({Action}{Feature}Input input, CancellationToken ct = default)
    {
        // 1. Validar input
        if (string.IsNullOrWhiteSpace(input.Name))
            throw new DomainException("INVALID_NAME", "Nome é obrigatório.");

        // 2. Executar regra de negócio
        var entity = new {Feature}(_tenant.TenantId, input.Name);

        // 3. Persistir
        await _repository.AddAsync(entity, ct);

        // 4. Retornar output mapeado — nunca a entidade direta
        return new {Action}{Feature}Output(entity.Id, entity.Name, entity.CreatedAt);
    }
}
```

## Template do Controller correspondente

O controller é fino — só recebe, delega e retorna. Zero lógica.

```csharp
[ApiController]
[Route("api/{features}")]
[Authorize]
public class {Feature}sController : ControllerBase
{
    private readonly {Action}{Feature}UseCase _useCase;

    public {Feature}sController({Action}{Feature}UseCase useCase)
        => _useCase = useCase;

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] {Action}{Feature}Input input, CancellationToken ct)
    {
        var result = await _useCase.ExecuteAsync(input, ct);
        return CreatedAtAction(nameof(Create), new { id = result.Id }, new { data = result, error = (object?)null });
    }
}
```
