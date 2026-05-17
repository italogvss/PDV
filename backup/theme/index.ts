import { createTheme, type Components, type Theme } from '@mui/material/styles'
import { palette, tokens } from './palette'

// ─── Sombras do design ──────────────────────────────────────────────────────
const shadows: Theme['shadows'] = [
  'none',
  // shadow-sm — cards, itens de nav ativos
  '0 1px 0 rgba(20,20,20,0.03), 0 1px 2px rgba(20,20,20,0.04)',
  // shadow-md — tooltips, popovers
  '0 4px 14px rgba(20,20,20,0.06)',
  // shadow-lg — drawers, modais, menus
  '0 24px 48px -16px rgba(20,20,20,0.18)',
  '0 24px 48px -16px rgba(20,20,20,0.18)',
  '0 24px 48px -16px rgba(20,20,20,0.18)',
  '0 24px 48px -16px rgba(20,20,20,0.18)',
  '0 24px 48px -16px rgba(20,20,20,0.18)',
  '0 24px 48px -16px rgba(20,20,20,0.18)',
  '0 24px 48px -16px rgba(20,20,20,0.18)',
  '0 24px 48px -16px rgba(20,20,20,0.18)',
  '0 24px 48px -16px rgba(20,20,20,0.18)',
  '0 24px 48px -16px rgba(20,20,20,0.18)',
  '0 24px 48px -16px rgba(20,20,20,0.18)',
  '0 24px 48px -16px rgba(20,20,20,0.18)',
  '0 24px 48px -16px rgba(20,20,20,0.18)',
  '0 24px 48px -16px rgba(20,20,20,0.18)',
  '0 24px 48px -16px rgba(20,20,20,0.18)',
  '0 24px 48px -16px rgba(20,20,20,0.18)',
  '0 24px 48px -16px rgba(20,20,20,0.18)',
  '0 24px 48px -16px rgba(20,20,20,0.18)',
  '0 24px 48px -16px rgba(20,20,20,0.18)',
  '0 24px 48px -16px rgba(20,20,20,0.18)',
  '0 24px 48px -16px rgba(20,20,20,0.18)',
  '0 24px 48px -16px rgba(20,20,20,0.18)',
]

// ─── Overrides de componentes ────────────────────────────────────────────────
const components: Components<Theme> = {
  // Estilos globais + variáveis CSS do design-system
  MuiCssBaseline: {
    styleOverrides: `
      @font-face {
        font-family: 'Geist';
        src: url('/node_modules/geist/dist/fonts/geist-sans/Geist-Variable.woff2') format('woff2-variations');
        font-weight: 100 900;
        font-style: normal;
        font-display: swap;
      }
      @font-face {
        font-family: 'Geist Mono';
        src: url('/node_modules/geist/dist/fonts/geist-mono/GeistMono-Variable.woff2') format('woff2-variations');
        font-weight: 100 900;
        font-style: normal;
        font-display: swap;
      }

      :root {
        --green:          ${tokens.green};
        --green-strong:   ${tokens.greenStrong};
        --green-soft:     ${tokens.greenSoft};
        --green-ink:      ${tokens.greenInk};
        --amber:          ${tokens.amber};
        --amber-soft:     ${tokens.amberSoft};
        --amber-ink:      ${tokens.amberInk};
        --red:            ${tokens.red};
        --red-soft:       ${tokens.redSoft};
        --red-ink:        ${tokens.redInk};
        --blue:           ${tokens.blue};
        --blue-soft:      ${tokens.blueSoft};
        --purple:         ${tokens.purple};
        --purple-soft:    ${tokens.purpleSoft};
        --bg:             ${tokens.bg};
        --surface:        ${tokens.surface};
        --surface-2:      ${tokens.surface2};
        --surface-3:      ${tokens.surface3};
        --border:         ${tokens.border};
        --border-strong:  ${tokens.borderStrong};
        --text:           ${tokens.text};
        --text-2:         ${tokens.text2};
        --text-3:         ${tokens.text3};
        --radius-sm:      6px;
        --radius:         10px;
        --radius-lg:      14px;
        --shadow-sm:      0 1px 0 rgba(20,20,20,0.03), 0 1px 2px rgba(20,20,20,0.04);
        --shadow-md:      0 4px 14px rgba(20,20,20,0.06);
        --shadow-lg:      0 24px 48px -16px rgba(20,20,20,0.18);
        --side-w:         248px;
        --topbar-h:       56px;
      }

      *, *::before, *::after { box-sizing: border-box; }

      html, body, #root { height: 100%; }

      body {
        margin: 0;
        font-family: 'Geist', 'Inter', ui-sans-serif, -apple-system, system-ui, sans-serif;
        background: var(--bg);
        color: var(--text);
        font-size: 14px;
        line-height: 1.45;
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
        letter-spacing: -0.005em;
      }

      .mono, code, pre {
        font-family: 'Geist Mono', ui-monospace, SFMono-Regular, Menlo, monospace;
        font-feature-settings: "tnum";
      }

      .tnum {
        font-variant-numeric: tabular-nums;
        font-feature-settings: "tnum";
      }

      *::-webkit-scrollbar { width: 10px; height: 10px; }
      *::-webkit-scrollbar-thumb {
        background: var(--surface-3);
        border-radius: 99px;
        border: 2px solid var(--bg);
      }
      *::-webkit-scrollbar-thumb:hover { background: var(--border-strong); }
      *::-webkit-scrollbar-track { background: transparent; }
    `,
  },

  // ─── Button ───────────────────────────────────────────────────────────────
  MuiButton: {
    defaultProps: {
      variant: 'outlined',
      disableRipple: false,
      disableElevation: true,
    },
    styleOverrides: {
      root: {
        textTransform: 'none',
        fontFamily: 'inherit',
        fontWeight: 500,
        letterSpacing: '-0.005em',
        boxShadow: 'none',
        '&:hover': { boxShadow: 'none' },
        '&:active': { boxShadow: 'none' },
        '&.Mui-focusVisible': {
          boxShadow: `0 0 0 3px ${tokens.greenSoft}`,
          outline: 'none',
        },
      },
      // Tamanho padrão — equivale a .btn (h=32px)
      sizeMedium: {
        fontSize: 13,
        height: 32,
        padding: '0 12px',
        borderRadius: 8,
        gap: 6,
        '& .MuiButton-startIcon, & .MuiButton-endIcon': { margin: 0 },
        '& svg': { width: 14, height: 14 },
      },
      // Tamanho pequeno — equivale a .btn.sm (h=28px)
      sizeSmall: {
        fontSize: 12,
        height: 28,
        padding: '0 9px',
        borderRadius: 7,
        gap: 5,
        '& .MuiButton-startIcon, & .MuiButton-endIcon': { margin: 0 },
        '& svg': { width: 13, height: 13 },
      },
      // Tamanho grande — equivale ao botão de finalizar venda
      sizeLarge: {
        fontSize: 14,
        height: 42,
        padding: '0 18px',
        borderRadius: 10,
        gap: 8,
        '& svg': { width: 16, height: 16 },
      },
      // Variant outlined → equivale a .btn (fundo branco + borda)
      outlined: {
        backgroundColor: tokens.surface,
        borderColor: tokens.border,
        color: tokens.text,
        '&:hover': {
          backgroundColor: tokens.surface2,
          borderColor: tokens.borderStrong,
        },
        '&.Mui-disabled': {
          backgroundColor: tokens.surface2,
          borderColor: tokens.border,
          color: tokens.text3,
        },
      },
      // Variant contained primary → equivale a .btn.green
      containedPrimary: {
        backgroundColor: tokens.greenStrong,
        color: '#ffffff',
        '&:hover': { backgroundColor: '#17854a' },
        '&.Mui-disabled': { backgroundColor: tokens.greenSoft, color: tokens.greenInk },
      },
      // Variant contained secondary → equivale a .btn.primary (fundo escuro)
      containedSecondary: {
        backgroundColor: tokens.text,
        color: '#ffffff',
        '&:hover': { backgroundColor: '#1a1917' },
      },
      // Variant text → equivale a .btn.ghost (transparente)
      text: {
        color: tokens.text2,
        borderColor: 'transparent',
        '&:hover': {
          backgroundColor: tokens.surface2,
          color: tokens.text,
        },
      },
      textPrimary: {
        color: tokens.greenStrong,
        '&:hover': { backgroundColor: tokens.greenSoft },
      },
    },
  },

  // ─── IconButton ───────────────────────────────────────────────────────────
  MuiIconButton: {
    defaultProps: { disableRipple: false },
    styleOverrides: {
      root: {
        width: 32,
        height: 32,
        borderRadius: 8,
        border: '1px solid transparent',
        color: tokens.text2,
        '&:hover': {
          backgroundColor: tokens.surface2,
          borderColor: tokens.border,
          color: tokens.text,
        },
      },
      sizeSmall: { width: 28, height: 28, borderRadius: 6 },
    },
  },

  // ─── Card ─────────────────────────────────────────────────────────────────
  MuiCard: {
    defaultProps: { elevation: 0 },
    styleOverrides: {
      root: {
        backgroundColor: tokens.surface,
        border: `1px solid ${tokens.border}`,
        borderRadius: 14,
        boxShadow: 'none',
        overflow: 'hidden',
      },
    },
  },

  MuiCardContent: {
    styleOverrides: {
      root: {
        padding: 18,
        '&:last-child': { paddingBottom: 18 },
      },
    },
  },

  // ─── Paper ────────────────────────────────────────────────────────────────
  MuiPaper: {
    defaultProps: { elevation: 0 },
    styleOverrides: {
      root: {
        backgroundImage: 'none',
        backgroundColor: tokens.surface,
        border: `1px solid ${tokens.border}`,
        borderRadius: 14,
      },
      elevation1: {
        boxShadow: '0 1px 0 rgba(20,20,20,0.03), 0 1px 2px rgba(20,20,20,0.04)',
      },
      elevation2: {
        boxShadow: '0 4px 14px rgba(20,20,20,0.06)',
      },
      elevation8: {
        boxShadow: '0 24px 48px -16px rgba(20,20,20,0.18)',
      },
    },
  },

  // ─── Divider ──────────────────────────────────────────────────────────────
  MuiDivider: {
    styleOverrides: {
      root: { borderColor: tokens.border },
    },
  },

  // ─── Table ────────────────────────────────────────────────────────────────
  MuiTableCell: {
    styleOverrides: {
      root: {
        fontSize: 13,
        padding: '10px 16px',
        borderBottomColor: tokens.border,
        color: tokens.text,
        verticalAlign: 'middle',
      },
      head: {
        fontSize: 11.5,
        fontWeight: 500,
        color: tokens.text3,
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
        backgroundColor: tokens.surface2,
        padding: '8px 16px',
      },
    },
  },

  MuiTableRow: {
    styleOverrides: {
      root: {
        '&:last-child td': { borderBottom: 0 },
        '&:hover': { backgroundColor: tokens.surface2 },
        '&.MuiTableRow-head:hover': { backgroundColor: 'transparent' },
      },
    },
  },

  // ─── Chip — equivale à classe .tag ────────────────────────────────────────
  MuiChip: {
    defaultProps: { size: 'small' },
    styleOverrides: {
      root: {
        height: 22,
        fontSize: 11.5,
        fontWeight: 500,
        borderRadius: 99,
        fontFamily: 'inherit',
        letterSpacing: '-0.005em',
      },
      filled: {
        backgroundColor: tokens.surface2,
        color: tokens.text2,
        border: `1px solid ${tokens.border}`,
      },
      filledPrimary: {
        backgroundColor: tokens.greenSoft,
        color: tokens.greenInk,
        border: 'none',
      },
      filledError: {
        backgroundColor: tokens.redSoft,
        color: tokens.redInk,
        border: 'none',
      },
      filledWarning: {
        backgroundColor: tokens.amberSoft,
        color: tokens.amberInk,
        border: 'none',
      },
      filledInfo: {
        backgroundColor: tokens.blueSoft,
        color: tokens.blueInk,
        border: 'none',
      },
      label: { padding: '0 8px' },
      icon: { marginLeft: 6, marginRight: -2, fontSize: 10 },
    },
  },

  // ─── TextField / OutlinedInput — equivale a .field-input ──────────────────
  MuiOutlinedInput: {
    styleOverrides: {
      root: {
        fontSize: 13,
        color: tokens.text,
        backgroundColor: tokens.surface,
        borderRadius: 7,
        '& .MuiOutlinedInput-notchedOutline': {
          borderColor: tokens.border,
        },
        '&:hover .MuiOutlinedInput-notchedOutline': {
          borderColor: tokens.borderStrong,
        },
        '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
          borderColor: tokens.greenStrong,
          borderWidth: 1,
          boxShadow: `0 0 0 3px ${tokens.greenSoft}`,
        },
        '&.Mui-error .MuiOutlinedInput-notchedOutline': {
          borderColor: tokens.red,
        },
        '&.Mui-error.Mui-focused .MuiOutlinedInput-notchedOutline': {
          boxShadow: `0 0 0 3px ${tokens.redSoft}`,
        },
      },
      input: {
        padding: '7px 12px',
        height: 20,
        fontFamily: 'inherit',
        letterSpacing: '-0.005em',
      },
      inputSizeSmall: {
        padding: '5px 10px',
        fontSize: 12.5,
      },
    },
  },

  MuiInputLabel: {
    styleOverrides: {
      root: {
        fontSize: 13,
        color: tokens.text2,
        '&.Mui-focused': { color: tokens.greenStrong },
        '&.Mui-error': { color: tokens.red },
      },
    },
  },

  MuiFormHelperText: {
    styleOverrides: {
      root: {
        fontSize: 11.5,
        marginTop: 4,
        '&.Mui-error': { color: tokens.red },
      },
    },
  },

  // ─── Select ───────────────────────────────────────────────────────────────
  MuiSelect: {
    styleOverrides: {
      select: {
        fontSize: 13,
        padding: '7px 12px',
      },
    },
  },

  // ─── Menu ─────────────────────────────────────────────────────────────────
  MuiMenu: {
    defaultProps: { elevation: 8 },
    styleOverrides: {
      paper: {
        borderRadius: 14,
        border: `1px solid ${tokens.border}`,
        boxShadow: '0 24px 48px -16px rgba(20,20,20,0.18)',
        minWidth: 180,
        overflow: 'hidden',
      },
      list: { padding: '6px' },
    },
  },

  MuiMenuItem: {
    styleOverrides: {
      root: {
        fontSize: 13,
        color: tokens.text2,
        borderRadius: 6,
        padding: '7px 10px',
        gap: 10,
        '&:hover': { backgroundColor: tokens.surface2, color: tokens.text },
        '&.Mui-selected': {
          backgroundColor: tokens.greenSoft,
          color: tokens.greenInk,
          fontWeight: 500,
        },
        '&.Mui-selected:hover': { backgroundColor: tokens.greenSoft },
        '& svg': { width: 15, height: 15, color: tokens.text3 },
      },
    },
  },

  // ─── Tooltip ──────────────────────────────────────────────────────────────
  MuiTooltip: {
    defaultProps: { arrow: false },
    styleOverrides: {
      tooltip: {
        backgroundColor: tokens.text,
        color: '#ffffff',
        fontSize: 11.5,
        fontWeight: 500,
        fontFamily: 'inherit',
        borderRadius: 6,
        padding: '4px 8px',
        letterSpacing: '-0.005em',
      },
    },
  },

  // ─── Dialog ───────────────────────────────────────────────────────────────
  MuiDialog: {
    defaultProps: { PaperProps: { elevation: 8 } },
    styleOverrides: {
      paper: {
        borderRadius: 14,
        border: `1px solid ${tokens.border}`,
        boxShadow: '0 24px 48px -16px rgba(20,20,20,0.18)',
      },
    },
  },

  MuiDialogTitle: {
    styleOverrides: {
      root: {
        fontSize: 15,
        fontWeight: 600,
        letterSpacing: '-0.01em',
        color: tokens.text,
        padding: '16px 20px',
        borderBottom: `1px solid ${tokens.border}`,
      },
    },
  },

  MuiDialogContent: {
    styleOverrides: {
      root: { padding: 20 },
    },
  },

  MuiDialogActions: {
    styleOverrides: {
      root: {
        padding: '12px 20px',
        borderTop: `1px solid ${tokens.border}`,
        gap: 8,
      },
    },
  },

  // ─── Drawer ───────────────────────────────────────────────────────────────
  MuiDrawer: {
    styleOverrides: {
      paper: {
        border: `1px solid ${tokens.border}`,
        boxShadow: '0 24px 48px -16px rgba(20,20,20,0.18)',
      },
    },
  },

  // ─── Tabs ─────────────────────────────────────────────────────────────────
  MuiTab: {
    styleOverrides: {
      root: {
        fontSize: 13,
        fontWeight: 500,
        textTransform: 'none',
        fontFamily: 'inherit',
        letterSpacing: '-0.005em',
        color: tokens.text2,
        minHeight: 36,
        padding: '6px 12px',
        '&.Mui-selected': { color: tokens.text },
      },
    },
  },

  MuiTabs: {
    styleOverrides: {
      indicator: { backgroundColor: tokens.text },
    },
  },

  // ─── Badge ────────────────────────────────────────────────────────────────
  MuiBadge: {
    styleOverrides: {
      badge: {
        fontSize: 10,
        fontWeight: 600,
        height: 16,
        minWidth: 16,
        padding: '0 4px',
        borderRadius: 99,
      },
    },
  },

  // ─── CircularProgress ─────────────────────────────────────────────────────
  MuiCircularProgress: {
    defaultProps: { size: 20, thickness: 4 },
    styleOverrides: {
      colorPrimary: { color: tokens.greenStrong },
    },
  },

  // ─── LinearProgress ───────────────────────────────────────────────────────
  MuiLinearProgress: {
    styleOverrides: {
      root: {
        height: 6,
        borderRadius: 99,
        backgroundColor: tokens.surface3,
      },
      bar: { borderRadius: 99 },
      barColorPrimary: { backgroundColor: tokens.greenStrong },
    },
  },

  // ─── Snackbar / Alert ─────────────────────────────────────────────────────
  MuiAlert: {
    defaultProps: { variant: 'filled' },
    styleOverrides: {
      root: {
        fontSize: 13,
        fontFamily: 'inherit',
        borderRadius: 10,
        padding: '10px 14px',
        alignItems: 'center',
      },
      filledSuccess: {
        backgroundColor: tokens.greenStrong,
        color: '#ffffff',
      },
      filledError: {
        backgroundColor: tokens.red,
        color: '#ffffff',
      },
      filledWarning: {
        backgroundColor: tokens.amber,
        color: tokens.text,
      },
      filledInfo: {
        backgroundColor: tokens.blue,
        color: '#ffffff',
      },
      message: { padding: 0, fontWeight: 500 },
      icon: { padding: 0 },
    },
  },

  // ─── Switch ───────────────────────────────────────────────────────────────
  MuiSwitch: {
    styleOverrides: {
      root: { padding: 8 },
      switchBase: {
        '&.Mui-checked': {
          color: tokens.greenStrong,
          '& + .MuiSwitch-track': {
            backgroundColor: tokens.green,
            opacity: 1,
          },
        },
      },
      thumb: { boxShadow: 'none' },
      track: {
        borderRadius: 12,
        backgroundColor: tokens.surface3,
        opacity: 1,
      },
    },
  },

  // ─── Skeleton ─────────────────────────────────────────────────────────────
  MuiSkeleton: {
    defaultProps: { animation: 'wave' },
    styleOverrides: {
      root: {
        backgroundColor: tokens.surface2,
        borderRadius: 6,
      },
    },
  },
}

// ─── Tipografia ──────────────────────────────────────────────────────────────
const typography = {
  fontFamily: '"Geist", "Inter", ui-sans-serif, -apple-system, system-ui, sans-serif',
  fontWeightLight: 300,
  fontWeightRegular: 400,
  fontWeightMedium: 500,
  fontWeightBold: 600,
  fontSize: 14,
  htmlFontSize: 16,

  // Título de página — 24px / -0.02em
  h1: {
    fontSize: 24,
    fontWeight: 600,
    letterSpacing: '-0.02em',
    lineHeight: 1.3,
    color: tokens.text,
  },
  // Título de seção — 18px
  h2: {
    fontSize: 18,
    fontWeight: 600,
    letterSpacing: '-0.015em',
    lineHeight: 1.35,
    color: tokens.text,
  },
  // Título de card — 15px / -0.01em
  h3: {
    fontSize: 15,
    fontWeight: 600,
    letterSpacing: '-0.01em',
    lineHeight: 1.4,
    color: tokens.text,
  },
  // Subtítulo de card — 14px
  h4: {
    fontSize: 14,
    fontWeight: 600,
    letterSpacing: '-0.01em',
    lineHeight: 1.4,
    color: tokens.text,
  },
  h5: {
    fontSize: 13,
    fontWeight: 600,
    letterSpacing: '-0.005em',
    lineHeight: 1.4,
    color: tokens.text,
  },
  h6: {
    fontSize: 12,
    fontWeight: 600,
    letterSpacing: 0,
    lineHeight: 1.4,
    color: tokens.text,
  },

  // Texto de corpo principal — 14px
  body1: {
    fontSize: 14,
    fontWeight: 400,
    letterSpacing: '-0.005em',
    lineHeight: 1.5,
  },
  // Texto de corpo menor — 13px
  body2: {
    fontSize: 13,
    fontWeight: 400,
    letterSpacing: '-0.005em',
    lineHeight: 1.5,
    color: tokens.text2,
  },

  // Rótulo médio — 13px/500
  subtitle1: {
    fontSize: 13,
    fontWeight: 500,
    letterSpacing: '-0.005em',
    lineHeight: 1.4,
  },
  // Rótulo pequeno — 12px/500
  subtitle2: {
    fontSize: 12,
    fontWeight: 500,
    letterSpacing: '-0.005em',
    lineHeight: 1.4,
    color: tokens.text2,
  },

  // Legenda — 11.5px
  caption: {
    fontSize: 11.5,
    fontWeight: 400,
    letterSpacing: 0,
    lineHeight: 1.4,
    color: tokens.text3,
  },

  // Label uppercase — equivale ao .nav-label e .field-label-sub do design
  overline: {
    fontSize: 11,
    fontWeight: 500,
    letterSpacing: '0.06em',
    lineHeight: 1.6,
    textTransform: 'uppercase' as const,
    color: tokens.text3,
  },

  // Texto de botão
  button: {
    fontSize: 13,
    fontWeight: 500,
    letterSpacing: '-0.005em',
    textTransform: 'none' as const,
  },
}

// ─── Tema principal ──────────────────────────────────────────────────────────
export const theme = createTheme({
  palette,
  typography,
  shadows,
  shape: {
    borderRadius: 10, // --radius base do design
  },
  components,
})
