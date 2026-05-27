# Skill: Novo Controller + DTOs

Use esta skill ao criar um controller e os DTOs de uma feature.

## Checklist

1. Criar DTOs em `PDV.Application/DTOs/{Feature}/`
2. Criar validators em `PDV.Application/Validators/{Feature}/`
3. Criar controller em `PDV.Api/Controllers/`

---

## DTOs

```csharp
// PDV.Application/DTOs/Expenses/ExpenseResponse.cs
public record ExpenseResponse(
    Guid Id,
    string Description,
    decimal Amount,
    bool IsPaid,
    DateTime CreatedAt);

// PDV.Application/DTOs/Expenses/CreateExpenseRequest.cs
public record CreateExpenseRequest(
    string Description,
    decimal Amount,
    DateTime DueDate);

// PDV.Application/DTOs/Expenses/UpdateExpenseRequest.cs
public record UpdateExpenseRequest(
    string Description,
    decimal Amount,
    DateTime DueDate,
    bool IsPaid);
```

Usar `record` para todos os DTOs. Um arquivo por DTO.

---

## Validator

```csharp
// PDV.Application/Validators/Expenses/CreateExpenseRequestValidator.cs
public class CreateExpenseRequestValidator : AbstractValidator<CreateExpenseRequest>
{
    public CreateExpenseRequestValidator()
    {
        RuleFor(x => x.Description).NotEmpty().MaximumLength(200);
        RuleFor(x => x.Amount).GreaterThan(0);
        RuleFor(x => x.DueDate).NotEmpty();
    }
}
```

---

## Controller

```csharp
// PDV.Api/Controllers/ExpensesController.cs
[ApiController]
[Route("api/expenses")]
[Authorize]
public class ExpensesController(IExpenseService service) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] int? month = null,
        [FromQuery] int? year = null,
        [FromQuery] bool? isPaid = null)
    {
        var result = await service.GetAllAsync(page, pageSize, month, year, isPaid);
        return Ok(result);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var result = await service.GetByIdAsync(id);
        return Ok(result);
    }

    [HttpPost]
    [Authorize(Roles = "Owner")]
    public async Task<IActionResult> Create([FromBody] CreateExpenseRequest request)
    {
        var result = await service.CreateAsync(request);
        return Created($"/api/expenses/{result.Id}", result);
    }

    [HttpPut("{id:guid}")]
    [Authorize(Roles = "Owner")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateExpenseRequest request)
    {
        var result = await service.UpdateAsync(id, request);
        return Ok(result);
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Roles = "Owner")]
    public async Task<IActionResult> Delete(Guid id)
    {
        await service.DeleteAsync(id);
        return NoContent();
    }
}
```

Regras:
- Controller só delega para o service — sem lógica
- `[Authorize(Roles = "Owner")]` em endpoints de escrita (POST, PUT, DELETE, PATCH)
- `[Authorize]` sem role em endpoints de leitura (GET) — qualquer usuário autenticado
- Retorno: `Ok(result)`, `Created(location, result)` ou `NoContent()`
- Erros tratados pelo `ExceptionMiddleware` — não usar try/catch no controller