# Tema MUI — Extensão de paleta

Cores fora do padrão MUI devem ser declaradas via module augmentation. Nunca usar hex avulso.

```ts
// theme/palette.ts
declare module '@mui/material/styles' {
  interface Palette {
    neutral: Palette['primary']
    revenue: Palette['primary']
  }
  interface PaletteOptions {
    neutral?: PaletteOptions['primary']
    revenue?: PaletteOptions['primary']
  }
}

export const palette = {
  neutral: {
    main: '#64748b',
    light: '#94a3b8',
    dark: '#475569',
    contrastText: '#fff',
  },
  revenue: {
    main: '#0f6e56',
    light: '#1d9e75',
    dark: '#085041',
    contrastText: '#fff',
  },
}
```

Customizações globais de componentes sempre via `theme.components`:

```ts
// theme/index.ts
components: {
  MuiButton: {
    styleOverrides: {
      root: ({ theme }) => ({
        borderRadius: theme.spacing(1),
        textTransform: 'none',
      }),
    },
  },
}
```
