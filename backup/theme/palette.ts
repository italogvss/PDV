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

/**
 * Design tokens convertidos de oklch → sRGB hex
 * Fonte: design/styles.css — variáveis CSS do protótipo
 */
export const tokens = {
  // Acento principal — verde (oklch H=150)
  green: '#2db368',          // --green:        oklch(0.62 0.16 150)
  greenStrong: '#1a9a52',    // --green-strong:  oklch(0.55 0.17 150)
  greenSoft: '#e8f7ee',      // --green-soft:    oklch(0.95 0.04 150)
  greenInk: '#0d4b27',       // --green-ink:     oklch(0.32 0.10 150)

  // Status — âmbar (oklch H=75)
  amber: '#e4a011',          // --amber:         oklch(0.78 0.14 75)
  amberSoft: '#faf3e4',      // --amber-soft:    oklch(0.96 0.04 80)
  amberInk: '#7a5820',       // --amber-ink:     oklch(0.45 0.13 60)

  // Status — vermelho (oklch H=25)
  red: '#d44a28',            // --red:           oklch(0.62 0.18 25)
  redSoft: '#faf0ed',        // --red-soft:      oklch(0.96 0.03 25)
  redInk: '#8c2a14',         // --red-ink:       oklch(0.42 0.16 25)

  // Status — azul (oklch H=245)
  blue: '#3a7fd4',           // --blue:          oklch(0.62 0.14 245)
  blueSoft: '#eef2fa',       // --blue-soft:     oklch(0.96 0.03 245)
  blueInk: '#2050a0',        // oklch(0.42 0.14 245)

  // Status — roxo (oklch H=295)
  purple: '#8b5dd4',         // --purple:        oklch(0.62 0.14 295)
  purpleSoft: '#f2eefa',     // --purple-soft:   oklch(0.96 0.03 295)

  // Backgrounds e superfícies (oklch H=95 — cinza quente)
  bg: '#fafaf8',             // --bg:            oklch(0.99 0.003 95)
  surface: '#ffffff',        // --surface
  surface2: '#f5f5f2',       // --surface-2:     oklch(0.975 0.003 95)
  surface3: '#efefec',       // --surface-3:     oklch(0.955 0.003 95)

  // Bordas
  border: '#e7e7e4',         // --border:        oklch(0.92 0.004 95)
  borderStrong: '#d7d7d3',   // --border-strong: oklch(0.86 0.005 95)

  // Texto
  text: '#2e2c2a',           // --text:          oklch(0.22 0.005 95)
  text2: '#6a6864',          // --text-2:        oklch(0.45 0.006 95)
  text3: '#9a9894',          // --text-3:        oklch(0.62 0.006 95)
} as const

export const palette = {
  primary: {
    main: tokens.greenStrong,
    light: tokens.green,
    dark: '#157344',
    contrastText: '#ffffff',
  },
  secondary: {
    main: tokens.text2,
    light: tokens.text3,
    dark: tokens.text,
    contrastText: '#ffffff',
  },
  error: {
    main: tokens.red,
    light: '#e06040',
    dark: tokens.redInk,
    contrastText: '#ffffff',
  },
  warning: {
    main: tokens.amber,
    light: '#e8b23a',
    dark: tokens.amberInk,
    contrastText: tokens.text,
  },
  info: {
    main: tokens.blue,
    light: '#5a96e8',
    dark: tokens.blueInk,
    contrastText: '#ffffff',
  },
  success: {
    main: tokens.greenStrong,
    light: tokens.green,
    dark: '#157344',
    contrastText: '#ffffff',
  },
  neutral: {
    main: tokens.text2,
    light: tokens.text3,
    dark: tokens.text,
    contrastText: '#ffffff',
  },
  revenue: {
    main: tokens.greenStrong,
    light: tokens.green,
    dark: '#157344',
    contrastText: '#ffffff',
  },
  background: {
    default: tokens.bg,
    paper: tokens.surface,
  },
  text: {
    primary: tokens.text,
    secondary: tokens.text2,
    disabled: tokens.text3,
  },
  divider: tokens.border,
}
