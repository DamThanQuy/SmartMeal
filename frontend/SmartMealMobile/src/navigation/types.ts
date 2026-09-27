import type { NavigatorScreenParams } from '@react-navigation/native';

export type OtpPurpose = 'register' | 'reset-password';

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  Otp: { email: string; purpose: OtpPurpose };
  ForgotPassword: undefined;
  HealthProfileBasicInfo: undefined;
  HealthProfileBody: undefined;
  HealthProfileGoal: undefined;
  HealthProfileActivity: undefined;
  HealthProfileAllergy: undefined;
  HealthProfileConditions: undefined;
  HealthProfileDiet: undefined;
  HealthResult: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Discover: undefined;
  Diary: undefined;
  Planner: undefined;
  Profile: undefined;
};

export type RootStackParamList = {
  Auth: NavigatorScreenParams<AuthStackParamList>;
  Main: NavigatorScreenParams<MainTabParamList>;
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
