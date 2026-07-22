namespace PDV.Application.Helpers;

/// <summary>
/// Parser de CSV mínimo, sem dependência externa (a exportação também escreve CSV na mão em
/// <c>ReportService</c>). Usado pela importação de dados. Lê o conteúdo inteiro em memória — os
/// limites de tamanho/linhas são validados antes de chegar aqui (<c>ImportLimits</c>).
///
/// Suporta: separador <c>,</c> ou <c>;</c> (detectado automaticamente pelo cabeçalho — o Excel
/// em pt-BR costuma exportar com <c>;</c>), campos entre aspas (<c>"..."</c>) com aspas escapadas
/// (<c>""</c>), vírgulas/ponto-e-vírgula e quebras de linha dentro de aspas, e reverte o prefixo
/// anti-injeção <c>'</c> que <c>ReportService.CsvField</c> adiciona em campos iniciados por
/// <c>= + - @</c>.
/// </summary>
public static class CsvParser
{
    public sealed record Row(int LineNumber, string[] Fields);

    public sealed record ParseResult(string[] Header, IReadOnlyList<Row> Rows);

    /// <summary>
    /// Faz o parse do conteúdo completo. A primeira linha não vazia é o cabeçalho; as demais
    /// viram <see cref="Row"/> com o número de linha 1-based (para mensagens de erro).
    /// Linhas totalmente em branco são ignoradas. O separador (<c>,</c> ou <c>;</c>) é detectado
    /// a partir do cabeçalho.
    /// </summary>
    public static ParseResult Parse(string content)
    {
        var delimiter = DetectDelimiter(content);
        var records = SplitRecords(content, delimiter);
        if (records.Count == 0)
            return new ParseResult([], []);

        var header = records[0].Fields;
        var rows = new List<Row>(records.Count - 1);
        for (var i = 1; i < records.Count; i++)
            rows.Add(records[i]);

        return new ParseResult(header, rows);
    }

    // Detecta o separador olhando só o cabeçalho (primeira linha lógica, fora de aspas): usa ';'
    // se ele aparecer mais que ',' ali — cobre o CSV do Excel pt-BR. Empate/nenhum → ',' (padrão
    // da nossa exportação).
    private static char DetectDelimiter(string content)
    {
        var commas = 0;
        var semicolons = 0;
        var inQuotes = false;

        for (var i = 0; i < content.Length; i++)
        {
            var c = content[i];
            if (inQuotes)
            {
                if (c == '"')
                {
                    if (i + 1 < content.Length && content[i + 1] == '"') i++;
                    else inQuotes = false;
                }
                continue;
            }

            if (c == '"') inQuotes = true;
            else if (c == ',') commas++;
            else if (c == ';') semicolons++;
            else if (c == '\n') break; // fim do cabeçalho
        }

        return semicolons > commas ? ';' : ',';
    }

    // Divide o texto em registros (cada registro = uma linha lógica, respeitando aspas).
    private static List<Row> SplitRecords(string content, char delimiter)
    {
        var result = new List<Row>();
        var fields = new List<string>();
        var field = new System.Text.StringBuilder();
        var inQuotes = false;
        var lineNumber = 1;
        var recordStartLine = 1;
        var recordHasContent = false;

        void PushField()
        {
            fields.Add(Unescape(field.ToString()));
            field.Clear();
        }

        void PushRecord()
        {
            PushField();
            // Ignora registro totalmente vazio (uma linha em branco).
            var isBlank = !recordHasContent && fields.Count == 1 && fields[0].Length == 0;
            if (!isBlank)
                result.Add(new Row(recordStartLine, [.. fields]));
            fields.Clear();
        }

        for (var i = 0; i < content.Length; i++)
        {
            var c = content[i];

            if (inQuotes)
            {
                if (c == '"')
                {
                    // Aspas duplas escapadas dentro de campo entre aspas.
                    if (i + 1 < content.Length && content[i + 1] == '"')
                    {
                        field.Append('"');
                        i++;
                    }
                    else
                    {
                        inQuotes = false;
                    }
                }
                else
                {
                    if (c == '\n') lineNumber++;
                    field.Append(c);
                }
                continue;
            }

            if (c == delimiter)
            {
                recordHasContent = true;
                PushField();
                continue;
            }

            switch (c)
            {
                case '"':
                    inQuotes = true;
                    recordHasContent = true;
                    break;
                case '\r':
                    break; // tratado junto do \n
                case '\n':
                    PushRecord();
                    lineNumber++;
                    recordStartLine = lineNumber;
                    recordHasContent = false;
                    break;
                default:
                    recordHasContent = true;
                    field.Append(c);
                    break;
            }
        }

        // Último registro sem quebra de linha final.
        if (field.Length > 0 || fields.Count > 0 || recordHasContent)
            PushRecord();

        return result;
    }

    // Reverte o prefixo anti-injeção ' aplicado na exportação a campos iniciados por = + - @.
    private static string Unescape(string value)
    {
        var v = value.Trim();
        if (v.Length >= 2 && v[0] == '\'' && v[1] is '=' or '+' or '-' or '@')
            v = v[1..];
        return v;
    }
}
