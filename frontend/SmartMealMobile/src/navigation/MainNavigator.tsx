import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import {
  AICameraScreen,
  AIAnalyzingScreen,
  AISnapResultScreen,
  StateAIFailedScreen,
  StateAILimitScreen,
  VoiceLogScreen,
} from '@/features/ai';
import { QuickLogScreen } from '@/features/dashboard';
import {
  DeleteConfirmScreen,
  EditMealLogScreen,
  FoodDetailScreen,
  FoodSearchScreen,
  ProgressChartScreen,
} from '@/features/nutrition';
import {
  FavoritesScreen,
  FilterSheetScreen,
  RecipeDetailScreen,
} from '@/features/recipes';
import {
  BarcodeScreen,
  FridgeScreen,
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
      <Stack.Screen name={MAIN_STACK_ROUTES.STATE_AI_FAILED} component={StateAIFailedScreen} />
      <Stack.Screen name={MAIN_STACK_ROUTES.FOOD_SEARCH} component={FoodSearchScreen} />
      <Stack.Screen name={MAIN_STACK_ROUTES.FOOD_DETAIL} component={FoodDetailScreen} />
      <Stack.Screen name={MAIN_STACK_ROUTES.EDIT_MEAL_LOG} component={EditMealLogScreen} />
      <Stack.Screen name={MAIN_STACK_ROUTES.PROGRESS_CHART} component={ProgressChartScreen} />

      {/* Đợt 4 — scanner. */}
      <Stack.Screen name={MAIN_STACK_ROUTES.BARCODE} component={BarcodeScreen} />
      <Stack.Screen name={MAIN_STACK_ROUTES.PRODUCT_NOT_FOUND} component={ProductNotFoundScreen} />
      <Stack.Screen name={MAIN_STACK_ROUTES.OCR_REVIEW} component={OCRReviewScreen} />
      <Stack.Screen name={MAIN_STACK_ROUTES.FRIDGE} component={FridgeScreen} />
      <Stack.Screen name={MAIN_STACK_ROUTES.STATE_PERMISSION} component={StatePermissionScreen} />

      {/* Đợt 5 — recipes. */}
      <Stack.Screen name={MAIN_STACK_ROUTES.RECIPE_DETAIL} component={RecipeDetailScreen} />
      <Stack.Screen name={MAIN_STACK_ROUTES.FAVORITES} component={FavoritesScreen} />

      {/* Bottom sheet / dialog — CLAUDE.md mục 10: QuickLog, StateAILimit, DeleteConfirm,
          FilterSheet. */}
      <Stack.Group screenOptions={{ presentation: 'transparentModal', animation: 'fade' }}>
        <Stack.Screen name={MAIN_STACK_ROUTES.QUICK_LOG} component={QuickLogScreen} />
        <Stack.Screen name={MAIN_STACK_ROUTES.STATE_AI_LIMIT} component={StateAILimitScreen} />
        <Stack.Screen name={MAIN_STACK_ROUTES.DELETE_CONFIRM} component={DeleteConfirmScreen} />
        <Stack.Screen name={MAIN_STACK_ROUTES.FILTER_SHEET} component={FilterSheetScreen} />
      </Stack.Group>
    </Stack.Navigator>
  );
}
