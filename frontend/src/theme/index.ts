/**
 * Tema principal — Zelo (light, neutral + green accent).
 *
 * Uso:
 *   import { ThemeProvider, CssBaseline } from '@mui/material';
 *   import { zeloTheme, loadGeistFont } from './theme';
 *
 *   loadGeistFont();
 *
 *   <ThemeProvider theme={zeloTheme}>
 *     <CssBaseline />
 *     <App />
 *   </ThemeProvider>
 */

import { createTheme, type ThemeOptions } from '@mui/material/styles';
import { ptBR } from '@mui/material/locale';

import './augment'; // module augmentation
import { colors, getColors, type AppThemeMode } from './palette';
import { buildTypography, BASE_FONT_SIZE, fontFamily, fontFamilyMono, loadGeistFont } from './typography';
import { shadows, customShadows, radius } from './shape';
import { components } from './components';

/**
 * Constrói o tema do app para o modo (light/dark) e o tamanho de texto escolhidos.
 * `textSize` é o tamanho base configurável pelo usuário (14–20).
 */
export function createAppTheme(mode: AppThemeMode = 'light', textSize: number = BASE_FONT_SIZE) {
  const c = getColors(mode);
  const scale = textSize / BASE_FONT_SIZE;

  const baseOptions: ThemeOptions = {
  palette: {
    mode,
    primary: {
      main: c.neutral[900],
      light: c.neutral[700],
      dark: mode === 'dark' ? c.neutral[800] : '#000000',
      contrastText: c.surface.paper,
    },
    secondary: {
      main: c.accent[600],
      light: c.accent[400],
      dark: c.accent[800],
      contrastText: '#ffffff',
    },
    success: {
      main: c.semantic.success.main,
      light: c.semantic.success.light,
      dark: c.semantic.success.dark,
      contrastText: c.semantic.success.contrastText,
      soft: c.semantic.success.soft,
      ink: c.semantic.success.ink,
    },
    warning: {
      main: c.semantic.warning.main,
      contrastText: c.semantic.warning.contrastText,
      soft: c.semantic.warning.soft,
      ink: c.semantic.warning.ink,
    },
    error: {
      main: c.semantic.error.main,
      contrastText: c.semantic.error.contrastText,
      soft: c.semantic.error.soft,
      ink: c.semantic.error.ink,
    },
    info: {
      main: c.semantic.info.main,
      contrastText: c.semantic.info.contrastText,
      soft: c.semantic.info.soft,
      ink: c.semantic.info.ink,
    },
    text: {
      primary: c.text.primary,
      secondary: c.text.secondary,
      tertiary: c.text.tertiary,
      disabled: c.text.disabled,
    },
    background: {
      default: c.surface.default,
      paper: c.surface.paper,
    },
    divider: c.border.subtle,
    action: {
      hover: c.surface.sunken,
      selected: c.surface.raised,
      disabled: c.text.disabled,
      disabledBackground: c.surface.raised,
      focus: c.accent[100],
    },
    // Tokens customizados
    neutral: c.neutral,
    accent: c.accent,
    premium: c.premium,
    surface: c.surface,
    border: c.border,
    data: c.data,
  },
  shape: { borderRadius: radius.md },
  shadows,
  customShadows,
  typography: buildTypography(textSize),
  spacing: 5, // base 5px — folga leve em cima do grid 4 original
  breakpoints: {
    values: { xs: 0, sm: 540, md: 760, lg: 900, xl: 1280 },
  },
  };

  // Cria o tema sem overrides primeiro, depois injeta os component overrides com
  // acesso ao próprio theme (necessário para usar tokens dentro deles).
  const baseTheme = createTheme(baseOptions, ptBR);

  return createTheme(baseTheme, {
    components: components(baseTheme, scale),
  });
}

/** Tema padrão (light, tamanho base) — mantido para imports existentes. */
export const zeloTheme = createAppTheme('light', BASE_FONT_SIZE);

export { colors, customShadows, radius, fontFamily, fontFamilyMono, loadGeistFont };
export type { AppColors } from './palette';
export type { CustomShadows } from './shape';
