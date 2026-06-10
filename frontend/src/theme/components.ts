/**
 * Overrides de componentes do MUI alinhados ao design system Zelo.
 * Aceita o theme construído para reutilizar tokens (cores, shadows, shape).
 */

import type { Components, Theme } from '@mui/material/styles';
import { alpha } from '@mui/material/styles';
import { radius } from './shape';
import { bgcolor } from '@mui/system';

export const components = (theme: Theme): Components<Theme> => ({
  // ------------------------------------------------------------------
  // Reset / baseline
  // ------------------------------------------------------------------
  MuiCssBaseline: {
    styleOverrides: {
      html: { WebkitFontSmoothing: 'antialiased', MozOsxFontSmoothing: 'grayscale' },
      body: {
        backgroundColor: theme.palette.surface.default,
        color: theme.palette.text.primary,
        letterSpacing: '-0.005em',
      },
      '*, *::before, *::after': { boxSizing: 'border-box' },
      '.tnum': { fontVariantNumeric: 'tabular-nums', fontFeatureSettings: '"tnum"' },
      '::selection': {
        background: theme.palette.accent[200],
        color: theme.palette.accent[900],
      },
      // Scrollbar discreta
      '*::-webkit-scrollbar': { width: 10, height: 10 },
      '*::-webkit-scrollbar-thumb': {
        background: theme.palette.surface.raised,
        borderRadius: 999,
        border: `2px solid ${theme.palette.surface.default}`,
      },
      '*::-webkit-scrollbar-thumb:hover': { background: theme.palette.border.strong },
      '*::-webkit-scrollbar-track': { background: 'transparent' },
    },
  },

  // ------------------------------------------------------------------
  // Botões
  // ------------------------------------------------------------------
  MuiButton: {
    defaultProps: { disableElevation: true, variant: 'outlined' },
    styleOverrides: {
      root: {
        borderRadius: radius.control,
        textTransform: 'none',
        fontWeight: 500,
        fontSize: 13,
        lineHeight: 1.2,
        padding: '6px 12px',
        minHeight: 32,
        gap: 6,
        '& .MuiButton-startIcon': { marginRight: 4 },
        '& .MuiButton-startIcon > svg, & .MuiButton-endIcon > svg': { fontSize: 22 },
      },
      sizeSmall: { minHeight: 28, padding: '4px 10px', fontSize: 12 },
      sizeLarge: { minHeight: 40, padding: '8px 16px', fontSize: 14 },

      outlined: {
        borderColor: theme.palette.border.subtle,
        backgroundColor: theme.palette.surface.paper,
        color: theme.palette.text.primary,
        '&:hover': {
          borderColor: theme.palette.border.strong,
          backgroundColor: theme.palette.surface.sunken,
        },
      },
      contained: {
        backgroundColor: theme.palette.primary.main,
        color: theme.palette.primary.contrastText,
        '&:hover': { backgroundColor: theme.palette.neutral[800] },
      },
      text: {
        color: theme.palette.text.secondary,
        '&:hover': { backgroundColor: theme.palette.surface.sunken },
      },
    },
    variants: [
      {
        // Verde primário (CTA)
        props: { color: 'success', variant: 'contained' },
        style: {
          backgroundColor: theme.palette.success.main,
          color: theme.palette.success.contrastText,
          '&:hover': { backgroundColor: theme.palette.success.dark },
        },
      },
      {
        // Variante "soft" — fundo claro com texto da cor
        props: { variant: 'soft' },
        style: {
          backgroundColor: theme.palette.accent[100],
          color: theme.palette.accent[900],
          border: 'none',
          '&:hover': { backgroundColor: theme.palette.accent[200] },
        },
      },
      {
        props: { variant: 'soft', color: 'warning' },
        style: {
          backgroundColor: theme.palette.warning.soft,
          color: theme.palette.warning.ink,
          '&:hover': { backgroundColor: alpha(theme.palette.warning.main, 0.18) },
        },
      },
      {
        props: { variant: 'soft', color: 'error' },
        style: {
          backgroundColor: theme.palette.error.soft,
          color: theme.palette.error.ink,
          '&:hover': { backgroundColor: alpha(theme.palette.error.main, 0.18) },
        },
      },
      {
        // Variante "ghost" — transparente até o hover
        props: { variant: 'ghost' },
        style: {
          backgroundColor: 'transparent',
          border: '1px solid transparent',
          color: theme.palette.text.secondary,
          '&:hover': {
            backgroundColor: theme.palette.surface.sunken,
            borderColor: theme.palette.border.subtle,
          },
        },
      },
    ],
  },

  MuiIconButton: {
    styleOverrides: {
      root: {
        borderRadius: radius.control,
        color: theme.palette.text.secondary,
        '&:hover': {
          backgroundColor: theme.palette.surface.sunken,
          color: theme.palette.text.primary,
        },
      },
      sizeSmall: { padding: 6 },
    },
  },

  // ------------------------------------------------------------------
  // Superfícies
  // ------------------------------------------------------------------
  MuiPaper: {
    defaultProps: { elevation: 0 },
    styleOverrides: {
      root: { backgroundImage: 'none' },
      outlined: {
        borderColor: theme.palette.border.subtle,
        borderRadius: radius.lg,
      },
    },
  },

  MuiCard: {
    defaultProps: { elevation: 0, variant: 'outlined' },
    styleOverrides: {
      root: {
        borderColor: theme.palette.border.subtle,
        borderRadius: radius.lg,
        backgroundColor: theme.palette.surface.paper,
      },
    },
  },
  MuiCardHeader: {
    styleOverrides: {
      root: {
        padding: '14px 18px',
        borderBottom: `1px solid ${theme.palette.border.subtle}`,
      },
      title: { fontSize: 14, fontWeight: 600, letterSpacing: '-0.01em' },
      subheader: { fontSize: 12, color: theme.palette.text.tertiary, marginTop: 2 },
    },
  },
  MuiCardContent: {
    styleOverrides: { root: { padding: 18, '&:last-child': { paddingBottom: 18 } } },
  },

  // ------------------------------------------------------------------
  // App shell — AppBar / Drawer / Toolbar
  // ------------------------------------------------------------------
  MuiAppBar: {
    defaultProps: { elevation: 0, color: 'transparent' },
    styleOverrides: {
      root: {
        backgroundColor: alpha(theme.palette.surface.default, 0.8),
        backdropFilter: 'blur(8px)',
        borderBottom: `1px solid ${theme.palette.border.subtle}`,
        color: theme.palette.text.primary,
      },
    },
  },
  MuiToolbar: {
    styleOverrides: { root: { minHeight: 56, '@media (min-width:600px)': { minHeight: 56 } } },
  },
  MuiDrawer: {
    styleOverrides: {
      paper: {
        backgroundColor: theme.palette.surface.sunken,
        borderColor: theme.palette.border.subtle,
        backgroundImage: 'none',
      },
    },
  },

  // ------------------------------------------------------------------
  // Navegação lateral
  // ------------------------------------------------------------------
  MuiToggleButtonGroup: {
    styleOverrides: {
      root: {
        '& .MuiToggleButton-root': {
          textTransform: 'none',
          fontWeight: 600,
          paddingLeft: theme.spacing(2),
          paddingRight: theme.spacing(2),
          borderColor: theme.palette.border.subtle,
          color: theme.palette.text.secondary,
          '&.Mui-selected': {
            border: 'none',
            backgroundColor: theme.palette.primary.main,
            color: theme.palette.primary.contrastText,
            borderColor: theme.palette.action.selected,
            '&:hover': { backgroundColor: theme.palette.primary.dark },
          },
        },
      },
    },
  },
  MuiList: {
    styleOverrides: { root: { padding: '6px 10px' } },
  },
  MuiListSubheader: {
    styleOverrides: {
      root: {
        ...theme.typography.overline,
        backgroundColor: 'transparent',
        color: theme.palette.text.tertiary,
        padding: '8px 8px 4px',
      },
    },
  },
  MuiListItemButton: {
    styleOverrides: {
      root: {
        borderRadius: radius.sm,
        padding: '6px 8px',
        gap: 9,
        color: theme.palette.text.secondary,
        fontSize: 13.5,
        '&:hover': {
          backgroundColor: theme.palette.surface.raised,
          color: theme.palette.text.primary,
        },
        '&.Mui-selected': {
          backgroundColor: theme.palette.surface.paper,
          color: theme.palette.text.primary,
          border: `1px solid ${theme.palette.border.subtle}`,
          padding: '5px 7px',
          boxShadow: theme.customShadows.xs,
          '& .MuiListItemIcon-root': { color: theme.palette.accent[700] },
          '&:hover': { backgroundColor: theme.palette.surface.paper },
        },
      },
    },
  },
  MuiListItemIcon: {
    styleOverrides: {
      root: { minWidth: 0, color: theme.palette.text.tertiary, '& > svg': { fontSize: 16 } },
    },
  },
  MuiListItemText: {
    styleOverrides: {
      primary: { fontSize: 13.5, fontWeight: 'inherit' },
    },
  },

  // ------------------------------------------------------------------
  // Inputs
  // ------------------------------------------------------------------
  MuiTextField: {
    defaultProps: { variant: 'outlined', size: 'small' },
  },
  MuiOutlinedInput: {
    styleOverrides: {
      root: {
        borderRadius: radius.control,
        backgroundColor: theme.palette.surface.paper,
        fontSize: 15,
        '& .MuiOutlinedInput-notchedOutline': { borderColor: theme.palette.border.subtle },
        '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: theme.palette.border.strong },
        '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
          borderColor: theme.palette.accent[600],
          borderWidth: 1,
        },
        '&.Mui-focused': { boxShadow: `0 0 0 3px ${theme.palette.accent[100]}` },
      },
      input: { padding: '8px 12px', height: 'auto' },
      inputSizeSmall: { padding: '8px 12px' },
    },
  },
  MuiInputLabel: {
    styleOverrides: {
      root: {
        fontSize: 15,
        color: theme.palette.text.secondary,
        '&.Mui-focused': { color: theme.palette.accent[700] },
      },
    },
  },
  MuiFormHelperText: {
    styleOverrides: { root: { fontSize: 11.5, marginLeft: 2 } },
  },
  MuiSelect: {
    styleOverrides: { select: { padding: '8px 12px' } },
  },
  MuiDatePicker: {
    defaultProps: {
      slotProps: { textField: { size: 'small' } },
    },
  },
  MuiPickersTextField: {
    defaultProps: { variant: 'outlined', size: 'small' },
  },
  MuiPickersOutlinedInput: {
    styleOverrides: {
      root: {
        borderRadius: radius.control,
        backgroundColor: theme.palette.surface.paper,
        fontSize: 15,
        '& .MuiPickersOutlinedInput-notchedOutline': { borderColor: theme.palette.border.subtle },
        '&:hover .MuiPickersOutlinedInput-notchedOutline': { borderColor: theme.palette.border.strong },
        '&.Mui-focused .MuiPickersOutlinedInput-notchedOutline': {
          borderColor: theme.palette.accent[600],
          borderWidth: 1,
        },
        '&.Mui-focused': { boxShadow: `0 0 0 3px ${theme.palette.accent[100]}` },
      },
    },
  },
  MuiPickersInputLabel: {
    styleOverrides: {
      root: {
        fontSize: 15,
        color: theme.palette.text.secondary,
        '&.Mui-focused': { color: theme.palette.accent[700] },
      },
    },
  },

  // ------------------------------------------------------------------
  // Chips (tags)
  // ------------------------------------------------------------------
  MuiChip: {
    styleOverrides: {
      root: {
        height: 22,
        borderRadius: 999,
        fontSize: 11.5,
        fontWeight: 500,
        backgroundColor: theme.palette.surface.sunken,
        color: theme.palette.text.secondary,
        border: `1px solid ${theme.palette.border.subtle}`,
        '& .MuiChip-icon': { fontSize: 12, marginLeft: 6, marginRight: -3 },
        '& .MuiChip-label': { padding: '0 8px' },
      },
      sizeSmall: { height: 20, fontSize: 11 },
    },
    variants: [
      {
        props: { color: 'success' },
        style: {
          backgroundColor: theme.palette.success.soft,
          color: theme.palette.success.ink,
          borderColor: 'transparent',
        },
      },
      {
        props: { color: 'warning' },
        style: {
          backgroundColor: theme.palette.warning.soft,
          color: theme.palette.warning.ink,
          borderColor: 'transparent',
        },
      },
      {
        props: { color: 'error' },
        style: {
          backgroundColor: theme.palette.error.soft,
          color: theme.palette.error.ink,
          borderColor: 'transparent',
        },
      },
      {
        props: { color: 'info' },
        style: {
          backgroundColor: theme.palette.info.soft,
          color: theme.palette.info.ink,
          borderColor: 'transparent',
        },
      },
      {
        props: { color: 'premium' },
        style: {
          background: `linear-gradient(135deg, ${theme.palette.premium[100]}, ${theme.palette.premium[200]})`,
          color: theme.palette.premium[800],
          borderColor: theme.palette.premium[300],
          fontWeight: 600,
        },
      },
      {
        props: { size: 'large' },
        style: {
          height: 36,
          fontSize: 14,
          '& .MuiChip-label': { padding: '0 12px' },
          '& .MuiChip-icon': { fontSize: 15, marginLeft: 8, marginRight: -4 },
        },
      },
    ],
  },

  // ------------------------------------------------------------------
  // Tabelas
  // ------------------------------------------------------------------
  MuiTable: {
    styleOverrides: { root: { borderCollapse: 'collapse' } },
  },
  MuiTableHead: {
    styleOverrides: {
      root: {
        '& .MuiTableCell-root': {
          ...theme.typography.overline,
          backgroundColor: theme.palette.surface.sunken,
          color: theme.palette.text.tertiary,
        },
      },
    },
  },
  MuiTableCell: {
    styleOverrides: {
      root: {
        borderBottom: `1px solid ${theme.palette.border.subtle}`,
        padding: '10px 16px',
        fontSize: 13,
      },
    },
  },
  MuiTableRow: {
    styleOverrides: {
      root: {
        '&:hover': { backgroundColor: theme.palette.surface.sunken },
        '&:last-of-type .MuiTableCell-root': { borderBottom: 0 },
      },
    },
  },

  // ------------------------------------------------------------------
  // Tabs (segmented)
  // ------------------------------------------------------------------
  MuiTabs: {
    styleOverrides: {
      root: { minHeight: 32 },
      indicator: {
        height: '100%',
        borderRadius: radius.sm,
        backgroundColor: theme.palette.surface.paper,
        boxShadow: theme.customShadows.xs,
        zIndex: 0,
      },
      flexContainer: {
        backgroundColor: theme.palette.surface.sunken,
        border: `none`,
        borderRadius: radius.control,
        padding: 3,
        gap: 2,
      },
    },
  },
  MuiTab: {
    styleOverrides: {
      root: {
        textTransform: 'none',
        minHeight: 24,
        padding: '0 10px',
        fontSize: 12,
        fontWeight: 500,
        color: theme.palette.text.secondary,
        zIndex: 1,
        borderRadius: radius.sm,
        '&.Mui-selected': { color: theme.palette.text.primary, bgcolor: theme.palette.primary.main },
      },
    },
  },

  // ------------------------------------------------------------------
  // Avatar / Badge
  // ------------------------------------------------------------------
  MuiAvatar: {
    styleOverrides: {
      root: {
        fontSize: 12,
        fontWeight: 600,
        backgroundColor: theme.palette.accent[600],
        color: theme.palette.secondary.contrastText,
      },
      rounded: { borderRadius: radius.sm },
    },
  },
  MuiAvatarGroup: {
    styleOverrides: {
      avatar: {
        width: 26, height: 26, fontSize: 11,
        borderColor: theme.palette.surface.paper,
      },
    },
  },
  MuiBadge: {
    styleOverrides: {
      dot: {
        minWidth: 7, height: 7,
        border: `2px solid ${theme.palette.surface.default}`,
      },
    },
  },

  // ------------------------------------------------------------------
  // Feedback
  // ------------------------------------------------------------------
  MuiLinearProgress: {
    styleOverrides: {
      root: { height: 6, borderRadius: 999, backgroundColor: theme.palette.surface.raised },
      bar: { borderRadius: 999, backgroundColor: theme.palette.accent[600] },
    },
  },
  MuiSwitch: {
    styleOverrides: {
      root: {
        width: 34,
        height: 20,
        padding: 0,
        display: 'flex',
        alignItems: 'center',
      },
      switchBase: {
        padding: 3,
        '&.Mui-checked': {
          transform: 'translateX(14px)',
          color: theme.palette.surface.paper,
          '& + .MuiSwitch-track': {
            backgroundColor: theme.palette.accent[600],
            opacity: 1,
          },
        },
      },
      thumb: {
        width: 14,
        height: 14,
        boxShadow: '0 1px 2px rgba(20,20,20,0.2)',
      },
      track: {
        borderRadius: 999,
        opacity: 1,
        backgroundColor: theme.palette.surface.raised,
      },
    },
  },
  MuiTooltip: {
    styleOverrides: {
      tooltip: {
        backgroundColor: theme.palette.text.primary,
        color: theme.palette.surface.paper,
        fontSize: 11.5,
        fontWeight: 500,
        padding: '6px 9px',
        borderRadius: radius.sm,
      },
      arrow: { color: theme.palette.text.primary },
    },
  },

  // ------------------------------------------------------------------
  // Menus / dropdowns
  // ------------------------------------------------------------------
  MuiMenu: {
    styleOverrides: {
      paper: {
        borderRadius: radius.lg,
        border: `1px solid ${theme.palette.border.subtle}`,
        boxShadow: theme.customShadows.xl,
        marginTop: 6,
      },
      list: { padding: 6 },
    },
  },
  MuiMenuItem: {
    styleOverrides: {
      root: {
        borderRadius: radius.sm,
        padding: '7px 10px',
        fontSize: 13,
        color: theme.palette.text.secondary,
        gap: 10,
        '&:hover': {
          backgroundColor: theme.palette.surface.sunken,
          color: theme.palette.text.primary,
        },
        '& > svg': { fontSize: 15, color: theme.palette.text.tertiary },
      },
    },
  },
  MuiDivider: {
    styleOverrides: { root: { borderColor: theme.palette.border.subtle } },
  },

  // ------------------------------------------------------------------
  // Dialog
  // ------------------------------------------------------------------
  MuiDialog: {
    styleOverrides: {
      paper: {
        borderRadius: radius.lg,
        boxShadow: theme.customShadows.xl,
      },
    },
  },
  MuiDialogTitle: {
    styleOverrides: {
      root: {
        fontSize: 16, fontWeight: 600,
        padding: '18px 22px 6px',
      },
    },
  },
  MuiDialogContent: { styleOverrides: { root: { padding: '6px 22px 18px' } } },
  MuiDialogActions: {
    styleOverrides: {
      root: {
        padding: '12px 22px',
        borderTop: `1px solid ${theme.palette.border.subtle}`,
        gap: 8,
      },
    },
  },

  // ------------------------------------------------------------------
  // Alert (banners)
  // ------------------------------------------------------------------
  MuiAlert: {
    styleOverrides: {
      root: { borderRadius: radius.md, fontSize: 13, padding: '10px 14px' },
      standardSuccess: {
        backgroundColor: theme.palette.success.soft,
        color: theme.palette.success.ink,
      },
      standardWarning: {
        backgroundColor: theme.palette.warning.soft,
        color: theme.palette.warning.ink,
      },
      standardError: {
        backgroundColor: theme.palette.error.soft,
        color: theme.palette.error.ink,
      },
      standardInfo: {
        backgroundColor: theme.palette.info.soft,
        color: theme.palette.info.ink,
      },
    },
  },

  // ------------------------------------------------------------------
  // Checkbox / Radio — apenas alinhar cor
  // ------------------------------------------------------------------
  MuiCheckbox: {
    styleOverrides: {
      root: {
        color: theme.palette.border.strong,
        '&.Mui-checked': { color: theme.palette.accent[600] },
      },
    },
  },
  MuiRadio: {
    styleOverrides: {
      root: {
        color: theme.palette.border.strong,
        '&.Mui-checked': { color: theme.palette.accent[600] },
      },
    },
  },
});
