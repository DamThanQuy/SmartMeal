import tokens from './tokens';

export interface AppRadius {
  none: number;
  sm: number;
  md: number;
  card: number;
  lg: number;
  sheet: number;
  pill: number;
}

export const radius: AppRadius = tokens.radius;
