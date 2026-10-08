namespace PDV.Application.Helpers;

// "Hoje" do lojista é o dia no fuso de Brasília, não em UTC.
//
// O produto é pt-BR (UTC−3). Com DateTime.UtcNow.Date, das 21h às 23h59 o servidor já virou
// o dia: "agendamentos de hoje" passaria a listar os de amanhã e uma conta que vence hoje
// apareceria como vencida desde as 21h do dia anterior. Aqui a data é sempre a que o lojista
// vê no relógio da parede.
//
// Os containers rodam Linux (IDs IANA); no host Windows o .NET 6+ também resolve IDs IANA
// via ICU, mas o fallback cobre ambientes sem ICU (globalization-invariant).
public static class BusinessClock
{
    private const string IanaId = "America/Sao_Paulo";
    private const string WindowsId = "E. South America Standard Time";

    private static readonly TimeZoneInfo TimeZone = ResolveTimeZone();

    // Data de hoje no fuso do lojista, com o componente de hora zerado.
    public static DateTime Today => TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, TimeZone).Date;

    private static TimeZoneInfo ResolveTimeZone()
    {
        try
        {
            return TimeZoneInfo.FindSystemTimeZoneById(IanaId);
        }
        catch (TimeZoneNotFoundException)
        {
            try
            {
                return TimeZoneInfo.FindSystemTimeZoneById(WindowsId);
            }
            catch (TimeZoneNotFoundException)
            {
                // Último recurso: offset fixo de Brasília (sem horário de verão, extinto em 2019).
                return TimeZoneInfo.CreateCustomTimeZone(IanaId, TimeSpan.FromHours(-3), IanaId, IanaId);
            }
        }
    }
}
