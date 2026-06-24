namespace PDV.Application.DTOs.Access;

// Metadados do eixo de Access Control para o frontend montar a matriz de permissões e a tela
// de Operação sem hardcodar a relação módulo↔permissão. Strings de módulo em lowercase
// ("sales"), permissões no nome do enum ("SellProducts").
public record AccessMetadataResponse(
    IReadOnlyList<string> Modules,
    IReadOnlyList<string> Permissions,
    IReadOnlyDictionary<string, IReadOnlyList<string>> ModulePermissions,
    IReadOnlyList<string> CorePermissions);
