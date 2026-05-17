/**
 * Forma e elevação — sombras suaves estilo Linear/Notion
 * (preferimos borda fina + sombra leve a sombras pesadas).
 */

import type { Shadows } from '@mui/material/styles';

export const radius = {
  xs: 4,
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
  pill: 999,
} as const;

const sh = {
  none:  'none',
  xs:    '0 1px 0 rgba(20,20,20,0.03), 0 1px 2px rgba(20,20,20,0.04)',
  sm:    '0 1px 0 rgba(20,20,20,0.03), 0 2px 4px rgba(20,20,20,0.05)',
  md:    '0 4px 14px rgba(20,20,20,0.06)',
  lg:    '0 10px 28px -8px rgba(20,20,20,0.12)',
  xl:    '0 24px 48px -16px rgba(20,20,20,0.18)',
  ring:  '0 0 0 3px var(--mui-palette-accent-soft, rgba(34,197,94,0.18))',
} as const;

/**
 * MUI exige array de 25 entradas. Usamos as 6 primeiras como nossa escala
 * "ds" (xs/sm/md/lg/xl/ring) e replicamos a maior para os índices restantes.
 */
export const shadows: Shadows = [
  'none',
  sh.xs, sh.sm, sh.md, sh.lg, sh.xl,
  ...Array(25 - 6).fill(sh.xl),
] as Shadows;

export const customShadows = sh;
export type CustomShadows = typeof sh;
