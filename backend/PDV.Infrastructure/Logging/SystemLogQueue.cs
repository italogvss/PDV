using System.Threading.Channels;
using PDV.Domain.Entities;

namespace PDV.Infrastructure.Logging;

// Fila em memória entre o sink do Serilog (produtor, síncrono) e o SystemLogWriterService
// (consumidor, grava no banco). Existe para que logar NUNCA bloqueie o request nem abra um
// DbContext dentro do pipeline de log — o que causaria reentrância (o EF loga, o log grava no EF...).
//
// Bounded + DropWrite: sob rajada é preferível perder log a segurar a aplicação.
public class SystemLogQueue
{
    private const int Capacity = 1000;

    private readonly Channel<SystemLog> _channel = Channel.CreateBounded<SystemLog>(
        new BoundedChannelOptions(Capacity)
        {
            FullMode = BoundedChannelFullMode.DropWrite,
            SingleReader = true,
            SingleWriter = false,
        });

    public bool TryWrite(SystemLog log) => _channel.Writer.TryWrite(log);

    // Aguarda haver ao menos um item. false = canal encerrado.
    public ValueTask<bool> WaitToReadAsync(CancellationToken ct) => _channel.Reader.WaitToReadAsync(ct);

    // Consome sem esperar — usado para drenar o que já está na fila e formar o lote.
    public bool TryRead(out SystemLog log) => _channel.Reader.TryRead(out log!);
}
