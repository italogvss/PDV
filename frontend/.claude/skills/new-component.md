# Skill — Novo componente reutilizável

Use esta skill sempre que precisar criar um componente em `/frontend/src/components/`.

## Checklist obrigatório

1. Criar pasta `/components/{ComponentName}/`
2. Criar `types.ts` com a interface de props
3. Criar `index.tsx` com o padrão `export default function`
4. Usar apenas tokens do tema MUI — nenhuma cor hardcoded
5. Textos visíveis via `Typography` com `variant` e `color` do tema
6. Usar props do MUI (`color`, `variant`, `size`) antes de criar prop customizada

## Template

```tsx
// components/{ComponentName}/types.ts
export interface {ComponentName}Props {
  label: string
  onClick?: () => void
}

// components/{ComponentName}/index.tsx
import { Box, Typography } from '@mui/material'
import { {ComponentName}Props } from './types'

export default function {ComponentName}({ label, onClick }: {ComponentName}Props) {
  return (
    <Box onClick={onClick}>
      <Typography variant="body1" color="text.primary">
        {label}
      </Typography>
    </Box>
  )
}
```

## Regras de cor

Nunca usar hex avulso. Sempre token do tema:

- texto principal: `color="text.primary"`
- texto secundário: `color="text.secondary"`
- fundo de card: `sx={{ bgcolor: 'background.paper' }}`
- cor customizada: declarar em `theme/palette.ts` antes de usar

## sx vs theme.components

- `sx` para variações pontuais de layout (margin, padding, width)
- `theme.components` para estilo base repetido em todo uso do componente MUI
