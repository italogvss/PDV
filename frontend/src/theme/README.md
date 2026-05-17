# Tema MUI — Zelo

Tema completo para o Material UI 5 reproduzindo o design system Zelo (estética
Notion/Linear, neutros levemente quentes + verde como acento).

## Estrutura

```
src/theme/
├── palette.ts       Tokens de cor (neutral / accent / premium / data / semântico)
├── typography.ts    Geist + escala tipográfica; loadGeistFont() helper
├── shape.ts         radius, shadows e customShadows
├── augment.ts       Module augmentation — registra tokens custom na tipagem do MUI
├── components.ts    Overrides de Button, Card, Drawer, Table, Chip, Menu, etc.
└── index.ts         createTheme() + export `zeloTheme`
```

## Uso

```tsx
import { ThemeProvider, CssBaseline } from '@mui/material';
import { zeloTheme, loadGeistFont } from './theme';

loadGeistFont(); // injeta Geist via Google Fonts (idempotente)

export default function Root() {
  return (
    <ThemeProvider theme={zeloTheme}>
      <CssBaseline />
      <App />
    </ThemeProvider>
  );
}
```

## Tokens customizados

Disponíveis via `useTheme()` ou prop `sx`:

| Token              | Onde usar                                                                |
| ------------------ | ------------------------------------------------------------------------ |
| `palette.accent`   | Escala 50–900 da cor da marca (verde por padrão). Use para CTAs e foco.  |
| `palette.neutral`  | Escala completa de cinzas. Substitui `grey` do MUI.                       |
| `palette.premium`  | Dourado para indicar plano Premium (badges, banners, gradientes).         |
| `palette.surface`  | `default` (body) · `paper` (cards) · `sunken` (sidebar) · `raised`        |
| `palette.border`   | `subtle` (1px padrão) · `strong` (hover)                                  |
| `palette.data`     | Cores auxiliares (purple/blue/orange/pink/teal) para tags e avatares.    |
| `text.tertiary`    | Terceiro nível de texto (legendas, metadados).                            |
| `customShadows`    | xs · sm · md · lg · xl · ring (foco) — mais leves que os do MUI default.  |

Os semânticos `success/warning/error/info` ganham os campos `.soft` e `.ink`
(fundo claro + texto escuro), prontos para Chips e Alerts.

## Variantes adicionadas

- `<Button variant="soft" color="success">` — fundo claro tonal
- `<Button variant="ghost">` — transparente, vira filled no hover
- `<Chip color="premium">` — gradiente dourado para selo Premium

Esses props são tipados (via `augment.ts`) e aparecem no autocomplete.

## Customização por tenant

Quer trocar a cor de destaque para outro cliente (azul, laranja, roxo)?
Substitua `accentGreen` em `palette.ts` por outra escala de mesmo formato:

```ts
const accentBlue: ColorScale = {
  50: 'oklch(0.97 0.02 245)',
  // ...
  900: 'oklch(0.32 0.12 245)',
};
```

Ou, melhor ainda, exporte uma factory `createZeloTheme({ accent })`
que recebe a escala dinamicamente — todos os overrides já consomem
`theme.palette.accent[...]` via referência, então o componente reflete
imediatamente.

## Locale

`createTheme` é composto com `ptBR` do MUI, então DataGrid, DatePicker e
mensagens de paginação saem em português.

## Dependências

```bash
npm install @mui/material @emotion/react @emotion/styled @mui/icons-material
```
