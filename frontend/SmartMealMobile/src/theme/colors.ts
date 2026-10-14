import tokens from './tokens';

export interface AppColorTokens {
  primary: string;
  primaryPressed: string;
  primarySoft: string;
  onPrimary: string;
  onPrimarySoft: string;

  energyStart: string;
  energyEnd: string;
  onEnergy: string;
  energyTrack: string;
  energyFill: string;

  background: string;
  surface: string;
  surfaceElevated: string;
  surfaceSubtle: string;

  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textInverse: string;

  border: string;
  borderStrong: string;
  borderFocus: string;

  success: string;
  successSoft: string;
  successText: string;

  warning: string;
  warningSoft: string;
  warningText: string;

  error: string;
  errorSoft: string;
  errorText: string;

  info: string;
  infoSoft: string;
  infoText: string;

  overlay: string;
  skeleton: string;
}

export const lightColors: AppColorTokens = tokens.lightColors;
export const darkColors: AppColorTokens = tokens.darkColors;
