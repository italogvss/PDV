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
import { colors } from './palette';
import { typography, fontFamily, fontFamilyMono, loadGeistFont } from './typography';
import { shadows, customShadows, radius } from './shape';
import { components } from './components';

const baseOptions: ThemeOptions = {
  palette: {
    mode: 'light',
    primary: {
      main: colors.neutral[900],
      light: colors.neutral[700],
      dark: '#000000',
      contrastText: colors.surface.paper,
    },
    secondary: {
      main: colors.accent[600],
      light: colors.accent[400],
      dark: colors.accent[800],
      contrastText: '#ffffff',
    },
    success: {
      main: colors.semantic.success.main,
      contrastText: colors.semantic.success.contrastText,
      soft: colors.semantic.success.soft,
      ink: colors.semantic.success.ink,
    },
    warning: {
      main: colors.semantic.warning.main,
      contrastText: colors.semantic.warning.contrastText,
      soft: colors.semantic.warning.soft,
      ink: colors.semantic.warning.ink,
    },
    error: {
      main: colors.semantic.error.main,
      contrastText: colors.semantic.error.contrastText,
      soft: colors.semantic.error.soft,
      ink: colors.semantic.error.ink,
    },
    info: {
      main: colors.semantic.info.main,
      contrastText: colors.semantic.info.contrastText,
      soft: colors.semantic.info.soft,
      ink: colors.semantic.info.ink,
    },
    text: {
      primary: colors.text.primary,
      secondary: colors.text.secondary,
      tertiary: colors.text.tertiary,
      disabled: colors.text.disabled,
    },
    background: {
      default: colors.surface.default,
      paper: colors.surface.paper,
    },
    divider: colors.border.subtle,
    action: {
      hover: colors.surface.sunken,
      selected: colors.surface.raised,
      disabled: colors.text.disabled,
      disabledBackground: colors.surface.raised,
      focus: colors.accent[100],
    },
    // Tokens customizados
    neutral: colors.neutral,
    accent: colors.accent,
    premium: colors.premium,
    surface: colors.surface,
    border: colors.border,
    data: colors.data,
  },
  shape: { borderRadius: radius.md },
  shadows,
  customShadows,
  typography,
  spacing: 5, // base 5px — folga leve em cima do grid 4 original
  breakpoints: {
    values: { xs: 0, sm: 540, md: 760, lg: 900, xl: 1280 },
  },
};

// Cria o tema sem overrides primeiro, depois injeta os component overrides com
// acesso ao próprio theme (necessário para usar tokens dentro deles).
const baseTheme = createTheme(baseOptions, ptBR);

export const zeloTheme = createTheme(baseTheme, {
  components: components(baseTheme),
});

export { colors, customShadows, radius, fontFamily, fontFamilyMono, loadGeistFont };
export type { AppColors } from './palette';
export type { CustomShadows } from './shape';
