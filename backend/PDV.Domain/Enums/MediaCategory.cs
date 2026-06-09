using System.Text.Json.Serialization;

namespace PDV.Domain.Enums;

// Aceita/serializa pelo nome ("Product") no JSON — o frontend envia a categoria como string.
// Escopado ao enum para não alterar o contrato (numérico) dos demais enums da API.
[JsonConverter(typeof(JsonStringEnumConverter))]
public enum MediaCategory
{
    Profile,   // bucket: "profile"   — avatares de usuário/funcionário
    Product,   // bucket: "product"   — fotos de produto
    Service,   // bucket: "service"   — fotos de serviço
    Tenant,    // bucket: "tenant"    — logo da loja
}
