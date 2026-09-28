import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import {
  AICameraScreen,
  AIAnalyzingScreen,
  AISnapResultScreen,
  StateAIFailedScreen,
  StateAILimitScreen,
  VoiceLogScreen,
  VoicePermissionScreen,
} from '@/features/ai';
import {
  ForgotPasswordScreen,
  GuestPromptScreen,
  OtpScreen,
  StateSessionScreen,
} from '@/features/auth';
import { CalorieBudgetScreen, QuickLogScreen } from '@/features/dashboard';
import { ThemePreviewScreen } from '@/features/dev';
import {
  BadgesScreen,
  ChallengeCompleteScreen,
  ChallengesScreen,
  PetScreen,
  WaterLogScreen,
} from '@/features/gamification';
import { GroceryAddScreen, GroceryDoneScreen } from '@/features/grocery';
import {
  AddToMealPlanScreen,
  PlannerRegenerateScreen,
  SlotPickerScreen,
} from '@/features/meal-planner';
import {
  CreateFoodScreen,
  DeleteConfirmScreen,
  EditMealLogScreen,
  FoodDetailScreen,
  FoodSearchScreen,
  ProgressChartScreen,
} from '@/features/nutrition';
import {
  DeleteDataScreen,
  EditProfileScreen,
  HealthConnectScreen,
  HealthSettingsScreen,
  NotificationsScreen,
  RemindersScreen,
  SettingsScreen,
  WeightHistoryScreen,
} from '@/features/profile';
import {
  PaymentMethodScreen,
  PaymentPendingScreen,
  PaymentSuccessScreen,
  PremiumScreen,
  SubscriptionScreen,
} from '@/features/premium';
import {
  CollectionDetailScreen,
  CreateCollectionScreen,
  FavoritesScreen,
  FilterSheetScreen,
  RecipeDetailScreen,
} from '@/features/recipes';
import {
  BarcodeScreen,
  FridgeCameraScreen,
  FridgeScreen,
  OCRCameraScreen,
  OCRReviewScreen,
  ProductNotFoundScreen,
  StatePermissionScreen,
} from '@/features/scanner';
import { MAIN_STACK_ROUTES } from '@/constants/routes';
import { MainTabNavigator } from './MainTabNavigator';
import type { MainStackParamList } from './types';

const Stack = createNativeStackNavigator<MainStackParamList>();

// Đợt 2/3 — QuickLog/AISnap/VoiceLog/FoodSearch... không thuộc riêng 1 tab (mở được từ cả
// Dashboard lẫn Diary) nên đặt làm sibling của MainTabs trong Stack này thay vì lồng theo tab
// (xem src/navigation/types.ts). Toàn bộ header dùng ScreenHeader tự dựng trong từng Screen.
export function MainNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name={MAIN_STACK_ROUTES.MAIN_TABS} component={MainTabNavigator} />

      <Stack.Screen name={MAIN_STACK_ROUTES.AI_CAMERA} component={AICameraScreen} />
      <Stack.Screen name={MAIN_STACK_ROUTES.AI_ANALYZING} component={AIAnalyzingScreen} />
      <Stack.Screen name={MAIN_STACK_ROUTES.AI_SNAP_RESULT} component={AISnapResultScreen} />
      <Stack.Screen name={MAIN_STACK_ROUTES.VOICE_LOG} component={VoiceLogScreen} />
      <Stack.Screen name={MAIN_STACK_ROUTES.VOICE_PERMISSION} component={VoicePermissionScreen} />
      <Stack.Screen name={MAIN_STACK_ROUTES.STATE_AI_FAILED} component={StateAIFailedScreen} />
      <Stack.Screen name={MAIN_STACK_ROUTES.FOOD_SEARCH} component={FoodSearchScreen} />
      <Stack.Screen name={MAIN_STACK_ROUTES.FOOD_DETAIL} component={FoodDetailScreen} />
      <Stack.Screen name={MAIN_STACK_ROUTES.CREATE_FOOD} component={CreateFoodScreen} />
      <Stack.Screen name={MAIN_STACK_ROUTES.EDIT_MEAL_LOG} component={EditMealLogScreen} />
      <Stack.Screen name={MAIN_STACK_ROUTES.PROGRESS_CHART} component={ProgressChartScreen} />

      {/* Đợt 4 — scanner. Đợt 10 — FridgeCamera/OCRCamera đứng trước Fridge/OCRReview. */}
      <Stack.Screen name={MAIN_STACK_ROUTES.BARCODE} component={BarcodeScreen} />
      <Stack.Screen name={MAIN_STACK_ROUTES.PRODUCT_NOT_FOUND} component={ProductNotFoundScreen} />
      <Stack.Screen name={MAIN_STACK_ROUTES.OCR_CAMERA} component={OCRCameraScreen} />
      <Stack.Screen name={MAIN_STACK_ROUTES.OCR_REVIEW} component={OCRReviewScreen} />
      <Stack.Screen name={MAIN_STACK_ROUTES.FRIDGE_CAMERA} component={FridgeCameraScreen} />
      <Stack.Screen name={MAIN_STACK_ROUTES.FRIDGE} component={FridgeScreen} />
      <Stack.Screen name={MAIN_STACK_ROUTES.STATE_PERMISSION} component={StatePermissionScreen} />

      {/* Đợt 5 — recipes. Đợt 12 — CollectionDetail đứng cạnh Favorites. */}
      <Stack.Screen name={MAIN_STACK_ROUTES.RECIPE_DETAIL} component={RecipeDetailScreen} />
      <Stack.Screen name={MAIN_STACK_ROUTES.FAVORITES} component={FavoritesScreen} />
      <Stack.Screen name={MAIN_STACK_ROUTES.COLLECTION_DETAIL} component={CollectionDetailScreen} />

      {/* Đợt 6 — meal-planner + grocery. */}
      <Stack.Screen name={MAIN_STACK_ROUTES.SLOT_PICKER} component={SlotPickerScreen} />

      {/* Đợt 11 — planner/grocery (design v2). Grocery bản thân ở PlannerStackNavigator (giữ
          bottom tab) — các màn dưới đây là dialog sibling của MainTabs. */}
      <Stack.Screen name={MAIN_STACK_ROUTES.CALORIE_BUDGET} component={CalorieBudgetScreen} />

      {/* Đợt 7 — profile. */}
      <Stack.Screen name={MAIN_STACK_ROUTES.HEALTH_SETTINGS} component={HealthSettingsScreen} />
      <Stack.Screen name={MAIN_STACK_ROUTES.WEIGHT_HISTORY} component={WeightHistoryScreen} />
      <Stack.Screen name={MAIN_STACK_ROUTES.HEALTH_CONNECT} component={HealthConnectScreen} />
      <Stack.Screen name={MAIN_STACK_ROUTES.REMINDERS} component={RemindersScreen} />
      <Stack.Screen name={MAIN_STACK_ROUTES.NOTIFICATIONS} component={NotificationsScreen} />
      <Stack.Screen name={MAIN_STACK_ROUTES.DEV} component={ThemePreviewScreen} />

      {/* Đợt 8 — gamification + premium. Đợt 12 — WaterLog/Challenges/Badges cạnh Pet. Đợt 13 —
          Subscription/PaymentMethod cạnh Premium. */}
      <Stack.Screen name={MAIN_STACK_ROUTES.PET} component={PetScreen} />
      <Stack.Screen name={MAIN_STACK_ROUTES.WATER_LOG} component={WaterLogScreen} />
      <Stack.Screen name={MAIN_STACK_ROUTES.CHALLENGES} component={ChallengesScreen} />
      <Stack.Screen name={MAIN_STACK_ROUTES.BADGES} component={BadgesScreen} />
      <Stack.Screen name={MAIN_STACK_ROUTES.PREMIUM} component={PremiumScreen} />
      <Stack.Screen name={MAIN_STACK_ROUTES.SUBSCRIPTION} component={SubscriptionScreen} />
      <Stack.Screen name={MAIN_STACK_ROUTES.PAYMENT_METHOD} component={PaymentMethodScreen} />
      <Stack.Screen name={MAIN_STACK_ROUTES.PAYMENT_PENDING} component={PaymentPendingScreen} />
      <Stack.Screen name={MAIN_STACK_ROUTES.PAYMENT_SUCCESS} component={PaymentSuccessScreen} />

      {/* Đợt 9 — auth/profile (design v2). */}
      <Stack.Screen name={MAIN_STACK_ROUTES.STATE_SESSION} component={StateSessionScreen} />
      <Stack.Screen name={MAIN_STACK_ROUTES.SETTINGS} component={SettingsScreen} />
      <Stack.Screen name={MAIN_STACK_ROUTES.EDIT_PROFILE} component={EditProfileScreen} />
      <Stack.Screen name={MAIN_STACK_ROUTES.DELETE_DATA} component={DeleteDataScreen} />
      {/* SettingsScreen "Đổi mật khẩu" (sửa lệch sau Đợt 9) — dùng chung ForgotPasswordScreen/
          OtpScreen với AuthNavigator, quay lại Settings khi xong (route.params.returnTo). */}
      <Stack.Screen name={MAIN_STACK_ROUTES.FORGOT_PASSWORD} component={ForgotPasswordScreen} />
      <Stack.Screen name={MAIN_STACK_ROUTES.OTP} component={OtpScreen} />

      {/* Bottom sheet / dialog — CLAUDE.md mục 10: QuickLog, StateAILimit, DeleteConfirm,
          FilterSheet, GuestPrompt (Đợt 9), AddToMealPlan (Đợt 10), GroceryAdd/GroceryDone/
          PlannerRegenerate (Đợt 11), ChallengeComplete/CreateCollection (Đợt 12). */}
      <Stack.Group screenOptions={{ presentation: 'transparentModal', animation: 'fade' }}>
        <Stack.Screen name={MAIN_STACK_ROUTES.QUICK_LOG} component={QuickLogScreen} />
        <Stack.Screen name={MAIN_STACK_ROUTES.STATE_AI_LIMIT} component={StateAILimitScreen} />
        <Stack.Screen name={MAIN_STACK_ROUTES.DELETE_CONFIRM} component={DeleteConfirmScreen} />
        <Stack.Screen name={MAIN_STACK_ROUTES.FILTER_SHEET} component={FilterSheetScreen} />
        <Stack.Screen name={MAIN_STACK_ROUTES.GUEST_PROMPT} component={GuestPromptScreen} />
        <Stack.Screen name={MAIN_STACK_ROUTES.ADD_TO_MEAL_PLAN} component={AddToMealPlanScreen} />
        <Stack.Screen name={MAIN_STACK_ROUTES.GROCERY_ADD} component={GroceryAddScreen} />
        <Stack.Screen name={MAIN_STACK_ROUTES.GROCERY_DONE} component={GroceryDoneScreen} />
        <Stack.Screen
          name={MAIN_STACK_ROUTES.PLANNER_REGENERATE}
          component={PlannerRegenerateScreen}
        />
        <Stack.Screen
          name={MAIN_STACK_ROUTES.CHALLENGE_COMPLETE}
          component={ChallengeCompleteScreen}
        />
        <Stack.Screen
          name={MAIN_STACK_ROUTES.CREATE_COLLECTION}
          component={CreateCollectionScreen}
        />
      </Stack.Group>
    </Stack.Navigator>
  );
}
