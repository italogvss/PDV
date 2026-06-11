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

/** Tamanho base padrão do texto (px). Referência para o fator de escala. */
export const BASE_FONT_SIZE = 15;

/**
 * Constrói a tipografia escalando todos os tamanhos pelo fator `baseFontSize / 15`.
 * `baseFontSize` é o "Tamanho do texto" configurável pelo usuário (14–20).
 */
export function buildTypography(baseFontSize: number = BASE_FONT_SIZE): TypographyVariantsOptions {
  const scale = baseFontSize / BASE_FONT_SIZE;
  const rem = (value: number) => `${value * scale}rem`;

  return {
    fontFamily,
    fontSize: baseFontSize,
    htmlFontSize: 16,
    fontWeightLight: 300,
    fontWeightRegular: 400,
    fontWeightMedium: 500,
    fontWeightBold: 600,

    h1: { fontSize: rem(2),      fontWeight: 600, letterSpacing: '-0.025em', lineHeight: 1.2 },  // 32
    h2: { fontSize: rem(1.625),  fontWeight: 600, letterSpacing: '-0.02em',  lineHeight: 1.25 }, // 26
    h3: { fontSize: rem(1.25),   fontWeight: 600, letterSpacing: '-0.015em', lineHeight: 1.3 },  // 20
    h4: { fontSize: rem(1.125),  fontWeight: 600, letterSpacing: '-0.01em',  lineHeight: 1.35 }, // 18
    h5: { fontSize: rem(1),      fontWeight: 600, letterSpacing: '-0.01em',  lineHeight: 1.4 },  // 16
    h6: { fontSize: rem(0.9375), fontWeight: 600, letterSpacing: '-0.005em', lineHeight: 1.4 },  // 15

    subtitle1: { fontSize: rem(0.9375), fontWeight: 500, lineHeight: 1.45 },
    subtitle2: { fontSize: rem(0.875),  fontWeight: 500, lineHeight: 1.45, color: 'inherit' },

    body1: { fontSize: rem(0.9375), fontWeight: 400, lineHeight: 1.5 },
    body2: { fontSize: rem(0.875),  fontWeight: 400, lineHeight: 1.5 },

    button: { fontSize: rem(0.875),  fontWeight: 500, letterSpacing: 0, textTransform: 'none' },
    caption: { fontSize: rem(0.8125),fontWeight: 400, lineHeight: 1.4, letterSpacing: 0 },
    overline: {
      fontSize: rem(0.75),
      fontWeight: 500,
      letterSpacing: '0.06em',
      textTransform: 'uppercase',
      lineHeight: 1.4,
    },
  };
}

/** Tipografia padrão (tamanho base 15) — mantida para compatibilidade. */
export const typography: TypographyVariantsOptions = buildTypography();
