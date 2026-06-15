using PDV.Domain.Enums;

namespace PDV.Domain.Entities;

public class TenantSettings : BaseEntity
{
    public Guid TenantId { get; set; }
    public Tenant Tenant { get; set; } = null!;

    // Negócio
    public string FantasyName { get; set; } = string.Empty;
    public string? CompanyName { get; set; }
    public string? Cnpj { get; set; }
    public string? StateRegistration { get; set; }
    public Segment Segment { get; set; } = Segment.Outro;
    public string? Phone { get; set; }
    public string? LogoUrl { get; set; }

    // Endereço (flat — facilita queries e indexação)
    public string? AddressCep { get; set; }
    public string? AddressStreet { get; set; }
    public string? AddressNumber { get; set; }
    public string? AddressComplement { get; set; }
    public string? AddressNeighborhood { get; set; }
    public string? AddressCity { get; set; }
    public string? AddressState { get; set; }

    // Horário de funcionamento (JSON serializado)
    public string? BusinessHoursJson { get; set; }

    // Operação — módulos ativos (JSON array de nomes de OperationModule).
    // Nulo/vazio = todos os módulos ativos (retrocompatível com tenants antigos).
    public string? EnabledModulesJson { get; set; }

    // Fiscal
    public string TaxRegime { get; set; } = "simples";

    // Operação / PDV
    public bool AllowDiscounts { get; set; } = true;
    public decimal DiscountLimitPercent { get; set; }

    // Pagamentos — métodos aceitos e taxa por venda (%)
    public bool PaymentPixEnabled { get; set; } = true;
    public bool PaymentCardCreditEnabled { get; set; } = true;
    public bool PaymentCardDebitEnabled { get; set; } = true;
    public bool PaymentCashEnabled { get; set; } = true;
    public decimal PaymentPixFee { get; set; }
    public decimal PaymentCardCreditFee { get; set; }
    public decimal PaymentCardDebitFee { get; set; }
    public decimal PaymentCashFee { get; set; }
}
