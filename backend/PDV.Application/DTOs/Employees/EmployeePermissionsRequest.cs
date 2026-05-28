namespace PDV.Application.DTOs.Employees;

// Owner envia a lista completa de permissões para um tipo.
// A lista substitui tudo que existia antes (ReplaceAsync).
public record EmployeePermissionsRequest(
    string EmployeeType,
    IEnumerable<string> Permissions);
