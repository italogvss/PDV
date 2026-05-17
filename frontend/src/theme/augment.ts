/**
 * Module augmentation — registra os tokens customizados na tipagem do MUI.
 * Importar este arquivo uma única vez (já é feito por `theme/index.ts`).
 */

import type { CustomShadows } from './shape';
import type { AppColors } from './palette';

declare module '@mui/material/styles' {
  interface Palette {
    neutral: AppColors['neutral'];
    accent: AppColors['accent'];
    premium: AppColors['premium'];
    surface: AppColors['surface'];
    border: AppColors['border'];
    data: AppColors['data'];
  }
  interface PaletteOptions {
    neutral?: AppColors['neutral'];
    accent?: AppColors['accent'];
    premium?: AppColors['premium'];
    surface?: AppColors['surface'];
    border?: AppColors['border'];
    data?: AppColors['data'];
  }

  // Tons soft/ink em cima dos status semânticos
  interface PaletteColor {
    soft?: string;
    ink?: string;
  }
  interface SimplePaletteColorOptions {
    soft?: string;
    ink?: string;
  }

  interface TypeText {
    tertiary: string;
  }

  interface Theme {
    customShadows: CustomShadows;
  }
  interface ThemeOptions {
    customShadows?: CustomShadows;
  }
}

// Tag customizada no Chip + variant "green" no Button
declare module '@mui/material/Chip' {
  interface ChipPropsColorOverrides {
    neutral: true;
    accent: true;
    premium: true;
  }
}
declare module '@mui/material/Button' {
  interface ButtonPropsVariantOverrides {
    soft: true;     // fundo claro + texto da cor
    ghost: true;    // transparente, vira "filled" no hover
  }
  interface ButtonPropsColorOverrides {
    neutral: true;
    accent: true;
  }
}
declare module '@mui/material/IconButton' {
  interface IconButtonPropsColorOverrides {
    neutral: true;
    accent: true;
  }
}

export {};
