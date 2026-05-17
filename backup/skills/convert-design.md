# Skill — Converter arquivo da pasta /design

Use esta skill ao transformar arquivos de `/design` em componentes React reais.

## Regra principal

Arquivos em `/design` são referência visual — nunca editar. A conversão cria arquivos novos em `/components` ou `/pages`.

## Checklist obrigatório

1. Ler o arquivo em `/design/{arquivo}`
2. Identificar todos os valores de cor (hex, rgb, variáveis CSS)
3. Mapear cada cor para token do tema MUI — nunca copiar hex
4. Identificar quais partes são componentes reutilizáveis vs exclusivos da página
5. Criar componentes com `export default function`
6. Substituir HTML pelos equivalentes MUI
7. Substituir estilos inline por props `sx` com tokens do tema

## Mapeamento HTML → MUI

| HTML | MUI |
|---|---|
| `<div>` layout | `<Box>` |
| `<p>`, `<span>` | `<Typography variant="...">` |
| `<button>` | `<Button variant="...">` |
| `<input>` | `<TextField>` |
| `<ul>` / `<li>` | `<List>` / `<ListItem>` |
| `<table>` | `<DataGrid>` ou `<Table>` |
| `<nav>` sidebar | `<Drawer>` |
| card visual | `<Card>` + `<CardContent>` |

## Mapeamento de cores

1. Identificar a intenção da cor no design
2. Mapear para token do tema:
   - Cor principal da marca → `primary.main`
   - Texto principal → `text.primary`
   - Texto secundário → `text.secondary`
   - Fundo de card → `background.paper`
   - Fundo da página → `background.default`
   - Verde de lucro/receita → `revenue.main` (se declarado em palette.ts)
3. Se não tiver equivalente, declarar em `theme/palette.ts` antes de usar

## Mapeamento de espaçamentos (px → MUI spacing base 8px)

| Design | MUI |
|---|---|
| 4px | `0.5` |
| 8px | `1` |
| 16px | `2` |
| 24px | `3` |
| 32px | `4` |
| 48px | `6` |

## Exemplo de conversão

```html
<!-- /design/dashboard.html — não editar -->
<div style="background:#fff; border-radius:12px; padding:24px;">
  <span style="color:#64748b; font-size:14px;">Vendas hoje</span>
  <span style="color:#0f172a; font-size:28px; font-weight:600;">R$ 1.240,00</span>
</div>
```

```tsx
// components/MetricCard/types.ts
export interface MetricCardProps {
  label: string
  value: string
}

// components/MetricCard/index.tsx
import { Card, CardContent, Typography } from '@mui/material'
import { MetricCardProps } from './types'

export default function MetricCard({ label, value }: MetricCardProps) {
  return (
    <Card>
      <CardContent>
        <Typography variant="body2" color="text.secondary">{label}</Typography>
        <Typography variant="h4" color="text.primary" fontWeight={600}>{value}</Typography>
      </CardContent>
    </Card>
  )
}
```
