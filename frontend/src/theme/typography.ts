/**
 * Tipografia — Geist (com tabular-nums para números financeiros).
 * Os tamanhos seguem o sistema do produto: base 15px, 15px em campos de input,
 * 32px em headings de página (h1).
 */

import type { TypographyVariantsOptions } from '@mui/material/styles';

export const fontFamily = [
  'Geist',
  'Geist Sans',
  'ui-sans-serif',
  '-apple-system',
  'BlinkMacSystemFont',
  'Segoe UI',
  'Roboto',
  'sans-serif',
].join(',');

export const fontFamilyMono = [
  'Geist Mono',
  'ui-monospace',
  'SFMono-Regular',
  'Menlo',
  'Consolas',
  'monospace',
].join(',');

/** Carrega Geist + Geist Mono via Google Fonts (idempotente). */
export function loadGeistFont() {
  if (typeof document === 'undefined') return;
  const id = 'zelo-geist-font';
  if (document.getElementById(id)) return;
  const link = document.createElement('link');
  link.id = id;
  link.rel = 'stylesheet';
  link.href =
    'https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600&family=Geist+Mono:wght@400;500&display=swap';
  document.head.appendChild(link);
}

export const typography: TypographyVariantsOptions = {
  fontFamily,
  fontSize: 15,
  htmlFontSize: 16,
  fontWeightLight: 300,
  fontWeightRegular: 400,
  fontWeightMedium: 500,
  fontWeightBold: 600,

  h1: { fontSize: '2rem',     fontWeight: 600, letterSpacing: '-0.025em', lineHeight: 1.2 },  // 32
  h2: { fontSize: '1.625rem', fontWeight: 600, letterSpacing: '-0.02em',  lineHeight: 1.25 }, // 26
  h3: { fontSize: '1.25rem',  fontWeight: 600, letterSpacing: '-0.015em', lineHeight: 1.3 },  // 20
  h4: { fontSize: '1.125rem', fontWeight: 600, letterSpacing: '-0.01em',  lineHeight: 1.35 }, // 18
  h5: { fontSize: '1rem',     fontWeight: 600, letterSpacing: '-0.01em',  lineHeight: 1.4 },  // 16
  h6: { fontSize: '0.9375rem',fontWeight: 600, letterSpacing: '-0.005em', lineHeight: 1.4 },  // 15

  subtitle1: { fontSize: '0.9375rem', fontWeight: 500, lineHeight: 1.45 },
  subtitle2: { fontSize: '0.875rem',  fontWeight: 500, lineHeight: 1.45, color: 'inherit' },

  body1: { fontSize: '0.9375rem', fontWeight: 400, lineHeight: 1.5 },
  body2: { fontSize: '0.875rem',  fontWeight: 400, lineHeight: 1.5 },

  button: { fontSize: '0.875rem',  fontWeight: 500, letterSpacing: 0, textTransform: 'none' },
  caption: { fontSize: '0.8125rem',fontWeight: 400, lineHeight: 1.4, letterSpacing: 0 },
  overline: {
    fontSize: '0.75rem',
    fontWeight: 500,
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    lineHeight: 1.4,
  },
};
