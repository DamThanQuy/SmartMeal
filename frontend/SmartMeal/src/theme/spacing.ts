import tokens from './tokens';

export interface AppSpacing {
  0: number;
  xxs: number;
  xs: number;
  sm: number;
  md: number;
  lg: number;
  xl: number;
  xxl: number;
  xxxl: number;
}

export const spacing: AppSpacing = tokens.spacing;
