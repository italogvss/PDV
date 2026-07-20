/**
 * Palette tokens — Zelo design system
 * Cores em HEX (cinzas levemente quentes).
 *
 * Convenção:
 *   surface.* = backgrounds em camadas
 *   neutral.* = escala de cinzas (50–900)
 *   accent.*  = cor da marca (verde por padrão); pode ser trocada por tenant
 *   premium.* = dourado para indicar plano Premium
 *   semantic = sucesso/erro/aviso/info já mapeados aos `success/warning/error/info` do MUI
 */

import type { AccentColor } from '../types/usersettings.type';

export type ColorScale = {
  50: string;
  100: string;
  200: string;
  300: string;
  400: string;
  500: string;
  600: string;
  700: string;
  800: string;
  900: string;
};

export type SemanticTone = {
  main: string;
  contrastText: string;
  soft: string;     // fundo suave (chips, badges)
  ink: string;      // texto sobre o fundo soft
  light?: string;   // variante clara (apenas success por ora)
  dark?: string;    // variante escura (apenas success por ora)
};

const neutral: ColorScale = {
  50:  '#fdfdfb',
  100: '#faf9f6',
  200: '#f4f3ef',
  300: '#e8e7e2',
  400: '#d1cfc8',
  500: '#a6a39b',
  600: '#807d75',
  700: '#54524c',
  800: '#34322e',
  900: '#1f1e1b',
};

const accentGreen: ColorScale = {
  50:  '#ecf7ee',
  100: '#d6efd9',
  200: '#b1e0b6',
  300: '#7fcd87',
  400: '#52b85f',
  500: '#2fa040',
  600: '#1f8a35',
  700: '#1c732e',
  800: '#1a5d27',
  900: '#174720',
};

const accentBlue: ColorScale = {
  50:  '#ecf3fc',
  100: '#d4e6f8',
  200: '#a9cdf1',
  300: '#74ade7',
  400: '#4a93dd',
  500: '#3a82d4',
  600: '#2f6dbb',
  700: '#285a9b',
  800: '#224a7e',
  900: '#1b3a63',
};

const accentOrange: ColorScale = {
  50:  '#fcf3e7',
  100: '#f9e1c4',
  200: '#f2c489',
  300: '#eaa451',
  400: '#e08a2a',
  500: '#d97a1f',
  600: '#bd6817',
  700: '#9c5415',
  800: '#7e4416',
  900: '#663815',
};

const accentPurple: ColorScale = {
  50:  '#f4ecfb',
  100: '#e7d6f6',
  200: '#cfaeec',
  300: '#b07fe1',
  400: '#9e63d9',
  500: '#9152d4',
  600: '#7e3fc0',
  700: '#69359f',
  800: '#562d81',
  900: '#432461',
};

const accentPink: ColorScale = {
  50:  '#fceef3',
  100: '#f9d6e2',
  200: '#f2adc4',
  300: '#e97fa0',
  400: '#e25c84',
  500: '#d94576',
  600: '#c2335f',
  700: '#a12a4f',
  800: '#832442',
  900: '#631b33',
};

const accentGraphite: ColorScale = {
  50:  '#f3f3f3',
  100: '#e2e2e2',
  200: '#c6c6c6',
  300: '#a0a0a0',
  400: '#757575',
  500: '#5c5c5c',
  600: '#4b4b4b',
  700: '#3d3d3d',
  800: '#2e2e2e',
  900: '#1f1f1f',
};

const premiumGold: ColorScale = {
  50:  '#fbf7e9',
  100: '#f6efc6',
  200: '#efe09b',
  300: '#eaca65',
  400: '#daab3b',
  500: '#c98a1f',
  600: '#b46b18',
  700: '#935015',
  800: '#733f15',
  900: '#5c3315',
};

export const colors = {
  neutral,
  accent: accentGreen,
  premium: premiumGold,

  surface: {
    default: neutral[50],   // body
    paper:   '#ffffff',     // cards
    sunken:  neutral[200],  // topbar/sidebar bg
    raised:  neutral[300],  // hover suave
  },

  text: {
    primary:   neutral[900],
    secondary: neutral[700],
    tertiary:  neutral[600],
    disabled:  neutral[500],
  },

  border: {
    subtle: neutral[300],
    strong: neutral[400],
  },

  semantic: {
    // Verde próprio, independente do accent da marca — assim trocar a cor
    // de destaque por tenant não muda o significado de "sucesso".
    success: {
      main:  '#1f9d57',
      light: '#4cbb7f',
      dark:  '#177a43',
      contrastText: '#ffffff',
      soft: '#e4f6ec',
      ink:  '#0e5b30',
    } as SemanticTone,
    warning: {
      main: '#d49a2c',
      contrastText: '#ffffff',
      soft: '#f6ecca',
      ink:  '#7a4a14',
    } as SemanticTone,
    error: {
      main: '#d9433a',
      contrastText: '#ffffff',
      soft: '#fbe6e1',
      ink:  '#8a2922',
    } as SemanticTone,
    // Azul próprio do status (distinto do data.blue, que é cor de exemplo).
    info: {
      main: '#2d6cc9',
      contrastText: '#ffffff',
      soft: '#e3ecfa',
      ink:  '#1b4380',
    } as SemanticTone,
  },

  // Cores auxiliares para tags/avatars/integrações
  data: {
    red:   { main: '#d43737', soft: '#d4eef1', ink: '#0f4f55' },
    orange: { main: '#d38339', soft: '#fbe9d4', ink: '#7a3c10' },
    yellow: { main: '#e6bf41', soft: '#fbe9d4', ink: '#7a3c10' },
    green:   { main: '#52ca3a', soft: '#d4eef1', ink: '#0f4f55' },
    teal:   { main: '#34d698', soft: '#d4eef1', ink: '#0f4f55' },
    blue:   { main: '#2f85cc', soft: '#e1eaf8', ink: '#1f4b8a' },
    purple: { main: '#a551d6', soft: '#efe5fa', ink: '#4d2b80' },
    pink:   { main: '#df52a9', soft: '#fbe1ea', ink: '#80264a' },
  },
} as const;

export type AppColors = typeof colors;

// ---------------------------------------------------------------------------
// Variante DARK (pragmática) — derivada dos mesmos tokens.
// Estratégia: escala de cinzas invertida (neutral[900] vira claro, para que
// `primary` continue sendo o tom de maior contraste), surfaces/text/border
// escuros e quentes, e tons semânticos `soft/ink` adaptados para fundo escuro.
// `accent`, `premium` e `data` permanecem (são cores de marca/identidade).
// ---------------------------------------------------------------------------

// Escala neutra invertida: 50 = mais escuro, 900 = mais claro.
const neutralDark: ColorScale = {
  50:  neutral[900],
  100: neutral[800],
  200: neutral[700],
  300: neutral[600],
  400: neutral[500],
  500: neutral[400],
  600: neutral[300],
  700: neutral[200],
  800: neutral[100],
  900: neutral[50],
};

export const darkColors = {
  neutral: neutralDark,
  accent: accentGreen,
  premium: premiumGold,

  surface: {
    default: '#1a1916',   // body
    paper:   '#242320',   // cards
    sunken:  '#141310',   // topbar/sidebar bg
    raised:  '#2d2b27',   // hover suave
  },

  text: {
    primary:   '#f4f3ef',
    secondary: '#cbc8c0',
    tertiary:  '#9a978f',
    disabled:  '#6e6b64',
  },

  border: {
    subtle: '#34322e',
    strong: '#4a4843',
  },

  semantic: {
    success: {
      main:  '#1f9d57',
      light: '#4cbb7f',
      dark:  '#177a43',
      contrastText: '#ffffff',
      soft: 'rgba(31,157,87,0.18)',
      ink:  '#6fe0a3',
    } as SemanticTone,
    warning: {
      main: '#d49a2c',
      contrastText: '#ffffff',
      soft: 'rgba(212,154,44,0.18)',
      ink:  '#f0c873',
    } as SemanticTone,
    error: {
      main: '#d9433a',
      contrastText: '#ffffff',
      soft: 'rgba(217,67,58,0.18)',
      ink:  '#f0a39d',
    } as SemanticTone,
    info: {
      main: '#2d6cc9',
      contrastText: '#ffffff',
      soft: 'rgba(45,108,201,0.20)',
      ink:  '#9dc0f0',
    } as SemanticTone,
  },

  data: colors.data,
} as const;

export type AppThemeMode = 'light' | 'dark';

/**
 * Escalas de cor de destaque (accent) disponíveis. A cor escolhida pelo usuário
 * substitui o `accent` do tema — que por sua vez deriva o `secondary` do MUI.
 */
export const accentScales: Record<AccentColor, ColorScale> = {
  green: accentGreen,
  blue: accentBlue,
  orange: accentOrange,
  purple: accentPurple,
  pink: accentPink,
  graphite: accentGraphite,
};

/**
 * Retorna os tokens de cor para o modo + accent escolhidos. O modo define
 * surface/text/border/semantic; o accent substitui apenas a escala `accent`.
 */
export function getColors(mode: AppThemeMode, accent: AccentColor = 'green'): AppColors {
  const base = mode === 'dark' ? (darkColors as unknown as AppColors) : colors;
  return { ...base, accent: accentScales[accent] };
}
