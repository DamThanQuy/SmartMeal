import type { NavigatorScreenParams } from '@react-navigation/native';
import type { AIAnalysisResult } from '@/features/ai';
import type { CheckoutResult, PaymentMethodId } from '@/features/premium';
import type { RecipeFilters } from '@/features/recipes';
import type { BillingPlanId } from '@/state/premium/premiumStore';
import type { MealType } from '@/types/meal.types';

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
  /** `filters` — set lại từ FilterSheet khi quay về (nằm ngoài MainTabParamList). */
  Discover: { filters?: RecipeFilters } | undefined;
  /** `toast` — thông báo hiển thị 1 lần khi quay lại từ EditMealLog/DeleteConfirm/FoodSearch. */
  Diary: { toast?: string } | undefined;
  Planner: undefined;
  Profile: undefined;
};

// Đợt 2/3 — Dashboard + Ghi bữa ăn (AI/Voice) + Nhật ký dinh dưỡng. Các màn này không thuộc
// riêng 1 tab (QuickLog/AISnap/FoodSearch... mở được từ cả Dashboard lẫn Diary) nên đặt làm
// sibling của MainTabs trong 1 Stack Navigator chung (MainNavigator), không lồng riêng theo tab.
export type MainStackParamList = {
  MainTabs: NavigatorScreenParams<MainTabParamList>;
  QuickLog: { mealType?: MealType } | undefined;
  AICamera: { mealType: MealType };
  AIAnalyzing: { mealType: MealType };
  AISnapResult: { mealType: MealType; result: AIAnalysisResult };
  VoiceLog: { mealType: MealType };
  /** `source` đổi copy/CTA cho đúng luồng thất bại (Chụp lại vs Nói lại). */
  StateAIFailed: { mealType: MealType; source: 'photo' | 'voice' };
  StateAILimit: { mealType?: MealType } | undefined;
  FoodSearch: { mealType: MealType };
  FoodDetail: { foodId: string; mealType: MealType };
  EditMealLog: { logId: string };
  DeleteConfirm: { logId: string };
  ProgressChart: undefined;

  // Đợt 4 — Scanner (BR-080, BR-120, BR-130, BR-140).
  Barcode: { mealType: MealType };
  ProductNotFound: { barcode: string; mealType: MealType };
  OCRReview: { mealType: MealType };
  Fridge: undefined;
  /** `returnTo` — biết quay lại camera nào sau khi "Cho phép camera". */
  StatePermission: { mealType?: MealType; returnTo: 'Barcode' | 'Fridge' };

  // Đợt 5 — Recipes (BR-090→BR-102).
  FilterSheet: { filters: RecipeFilters } | undefined;
  RecipeDetail: { recipeId: string };
  Favorites: undefined;

  // Đợt 6 — Meal Planner + Grocery (BR-160→BR-174). Không có bottom nav nên đặt sibling của
  // MainTabs giống RecipeDetail/Favorites, không lồng trong tab Planner.
  SlotPicker: { weekStartIso: string; dateIso: string; mealType: MealType };

  // Đợt 7 — Profile (BR-001→BR-003). Không có bottom nav, sibling của MainTabs.
  HealthSettings: undefined;
  WeightHistory: undefined;
  HealthConnect: undefined;
  Reminders: undefined;
  Notifications: undefined;
  Dev: undefined;

  // Đợt 8 — Gamification + Premium (BR-200→BR-242). Không có bottom nav, sibling của MainTabs.
  Pet: undefined;
  Premium: undefined;
  PaymentPending: { planId: BillingPlanId; paymentMethodId: PaymentMethodId };
  PaymentSuccess: { result: CheckoutResult };
};

export type RootStackParamList = {
  Auth: NavigatorScreenParams<AuthStackParamList>;
  Main: NavigatorScreenParams<MainStackParamList>;
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
