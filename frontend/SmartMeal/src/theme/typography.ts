import tokens from './tokens';

export interface AppFontSizeToken {
  size: number;
  lineHeight: number;
  weight: '400' | '600' | '700';
}

export type AppTextVariant =
  | 'display'
  | 'h1'
  | 'h2'
  | 'h3'
  | 'bodyLg'
  | 'body'
  | 'bodyMedium'
  | 'caption'
  | 'button';

export const fontSize = tokens.fontSize as Record<
  AppTextVariant,
  AppFontSizeToken
>;
export const fontFamily: {
  sans: string;
  sansSemibold: string;
  sansBold: string;
} = tokens.fontFamily;
