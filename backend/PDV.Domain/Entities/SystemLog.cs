namespace PDV.Domain.Entities;

// Log de sistema (Serilog) persistido para o admin inspecionar a saúde da aplicação: erros de
// request, falhas de webhook e execução dos jobs de background. Entidade GLOBAL — sem TenantId e
// sem query filter (o log nasce fora de qualquer contexto de tenant, inclusive nos hosted services).
//
// NÃO é auditoria de ação de admin (decisão de produto): registra o que a aplicação faz/falha,
// não quem mexeu em quê. Só eventos >= Warning são persistidos (ver SystemLogSink); housekeeping
// por RetentionDefaults.SystemLogDays.
public class SystemLog : BaseEntity
{
    public string Level { get; set; } = string.Empty;   // Warning | Error | Fatal
    public string Message { get; set; } = string.Empty;
    public string? Exception { get; set; }
    // Classe/namespace que emitiu o log (enricher SourceContext do Serilog).
    public string? SourceContext { get; set; }
    // Rota do request quando o log nasceu dentro de um; nulo em jobs de background.
    public string? RequestPath { get; set; }
    // A data/hora do evento é o CreatedAt herdado de BaseEntity.
}
