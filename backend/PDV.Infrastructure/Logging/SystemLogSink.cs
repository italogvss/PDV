using Serilog.Core;
using Serilog.Events;
using PDV.Domain.Entities;

namespace PDV.Infrastructure.Logging;

// Sink do Serilog que persiste os eventos relevantes na tabela SystemLog, para o admin inspecionar
// a saúde da aplicação. Só enfileira (o writer em background é quem grava) — ver SystemLogQueue.
public class SystemLogSink(SystemLogQueue queue) : ILogEventSink
{
    // Piso do que vale persistir. Info/Debug ficam só no console: o banco guardaria ruído demais
    // (o UseSerilogRequestLogging emite um Information por request).
    private const LogEventLevel MinimumLevel = LogEventLevel.Warning;

    private const int MessageMaxLength = 8000;
    private const int ExceptionMaxLength = 16000;

    public void Emit(LogEvent logEvent)
    {
        if (logEvent.Level < MinimumLevel) return;

        queue.TryWrite(new SystemLog
        {
            Level = logEvent.Level.ToString(),
            Message = Truncate(logEvent.RenderMessage(), MessageMaxLength),
            Exception = logEvent.Exception is null ? null : Truncate(logEvent.Exception.ToString(), ExceptionMaxLength),
            SourceContext = ReadProperty(logEvent, "SourceContext", 300),
            RequestPath = ReadProperty(logEvent, "RequestPath", 300),
            CreatedAt = logEvent.Timestamp.UtcDateTime,
        });
    }

    // Propriedades do Serilog vêm com aspas quando escalares string — ToString() as manteria.
    private static string? ReadProperty(LogEvent logEvent, string name, int maxLength)
    {
        if (!logEvent.Properties.TryGetValue(name, out var value)) return null;
        var text = value is ScalarValue { Value: string s } ? s : value.ToString().Trim('"');
        return string.IsNullOrWhiteSpace(text) ? null : Truncate(text, maxLength);
    }

    private static string Truncate(string value, int maxLength) =>
        value.Length <= maxLength ? value : value[..maxLength];
}
