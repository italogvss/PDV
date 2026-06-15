namespace PDV.Domain.Enums;

// Tipo de comércio do tenant. Os nomes batem (case-insensitive) com os valores
// lowercase usados pelo frontend ("cafeteria", "varejo", ...). Define o conjunto
// padrão de módulos da operação na criação do tenant (ver SegmentModuleDefaults).
public enum Segment
{
    Cafeteria,
    Restaurante,
    Mercado,
    Varejo,
    Farmacia,
    Vestuario,
    Eletronicos,
    Servicos,
    Outro,
}
