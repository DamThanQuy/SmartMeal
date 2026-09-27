/**
 * Tên route dùng chung — không hard-code chuỗi route ở Screen/Navigator (CLAUDE.md mục 4).
 */
export const ROOT_ROUTES = {
  AUTH: 'Auth',
  MAIN: 'Main',
} as const;

export const AUTH_ROUTES = {
  LOGIN: 'Login',
  REGISTER: 'Register',
  OTP: 'Otp',
  FORGOT_PASSWORD: 'ForgotPassword',
  HEALTH_PROFILE_BASIC_INFO: 'HealthProfileBasicInfo',
  HEALTH_PROFILE_BODY: 'HealthProfileBody',
  HEALTH_PROFILE_GOAL: 'HealthProfileGoal',
  HEALTH_PROFILE_ACTIVITY: 'HealthProfileActivity',
  HEALTH_PROFILE_ALLERGY: 'HealthProfileAllergy',
  HEALTH_PROFILE_CONDITIONS: 'HealthProfileConditions',
  HEALTH_PROFILE_DIET: 'HealthProfileDiet',
  HEALTH_RESULT: 'HealthResult',
} as const;

export const MAIN_TAB_ROUTES = {
  HOME: 'Home',
  DISCOVER: 'Discover',
  DIARY: 'Diary',
  PLANNER: 'Planner',
  PROFILE: 'Profile',
} as const;
