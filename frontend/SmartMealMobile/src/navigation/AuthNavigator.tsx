import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { AUTH_ROUTES } from '@/constants/routes';
import {
  ForgotPasswordScreen,
  LoginScreen,
  OtpScreen,
  RegisterScreen,
} from '@/features/auth';
import {
  HealthProfileActivityScreen,
  HealthProfileAllergyScreen,
  HealthProfileBasicInfoScreen,
  HealthProfileBodyScreen,
  HealthProfileConditionsScreen,
  HealthProfileDietScreen,
  HealthProfileGoalScreen,
  HealthResultScreen,
} from '@/features/health';
import type { AuthStackParamList } from './types';

const Stack = createNativeStackNavigator<AuthStackParamList>();

// Toàn bộ header dùng ScreenHeader tự dựng trong từng Screen (đúng design), nên tắt header
// mặc định của React Navigation ở mọi route.
export function AuthNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name={AUTH_ROUTES.LOGIN} component={LoginScreen} />
      <Stack.Screen name={AUTH_ROUTES.REGISTER} component={RegisterScreen} />
      <Stack.Screen name={AUTH_ROUTES.OTP} component={OtpScreen} />
      <Stack.Screen
        name={AUTH_ROUTES.FORGOT_PASSWORD}
        component={ForgotPasswordScreen}
      />
      <Stack.Screen
        name={AUTH_ROUTES.HEALTH_PROFILE_BASIC_INFO}
        component={HealthProfileBasicInfoScreen}
      />
      <Stack.Screen
        name={AUTH_ROUTES.HEALTH_PROFILE_BODY}
        component={HealthProfileBodyScreen}
      />
      <Stack.Screen
        name={AUTH_ROUTES.HEALTH_PROFILE_GOAL}
        component={HealthProfileGoalScreen}
      />
      <Stack.Screen
        name={AUTH_ROUTES.HEALTH_PROFILE_ACTIVITY}
        component={HealthProfileActivityScreen}
      />
      <Stack.Screen
        name={AUTH_ROUTES.HEALTH_PROFILE_ALLERGY}
        component={HealthProfileAllergyScreen}
      />
      <Stack.Screen
        name={AUTH_ROUTES.HEALTH_PROFILE_CONDITIONS}
        component={HealthProfileConditionsScreen}
      />
      <Stack.Screen
        name={AUTH_ROUTES.HEALTH_PROFILE_DIET}
        component={HealthProfileDietScreen}
      />
      <Stack.Screen
        name={AUTH_ROUTES.HEALTH_RESULT}
        component={HealthResultScreen}
      />
    </Stack.Navigator>
  );
}
