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
    sunken:  neutral[100],  // topbar/sidebar bg
    raised:  neutral[200],  // hover suave
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
    purple: { main: '#9152d4', soft: '#efe5fa', ink: '#4d2b80' },
    blue:   { main: '#3a82d4', soft: '#e1eaf8', ink: '#1f4b8a' },
    orange: { main: '#d97a1f', soft: '#fbe9d4', ink: '#7a3c10' },
    pink:   { main: '#d94576', soft: '#fbe1ea', ink: '#80264a' },
    teal:   { main: '#1f9aa6', soft: '#d4eef1', ink: '#0f4f55' },
  },
} as const;

export type AppColors = typeof colors;
