import type { NavigatorScreenParams } from '@react-navigation/native';
import type { AIAnalysisResult, VoiceLogResult } from '@/features/ai';
import type { CheckoutResult, PaymentMethodId } from '@/features/premium';
import type { RecipeFilters } from '@/features/recipes';
import type { BillingPlanId } from '@/state/premium/premiumStore';
import type { MealType } from '@/types/meal.types';

export type OtpPurpose = 'register' | 'reset-password';

/**
 * ForgotPasswordScreen/OtpScreen được đăng ký ở cả AuthNavigator (quên mật khẩu trước đăng nhập)
 * và MainNavigator (SettingsScreen "Đổi mật khẩu" — sửa lệch sau Đợt 9). `returnTo` cho 2 màn này
 * biết quay lại Login (mặc định, luồng Auth) hay Settings (luồng đổi mật khẩu khi đã đăng nhập)
 * sau khi xác thực OTP xong — xem ForgotPasswordScreen.tsx/OtpScreen.tsx.
 */
export type ForgotPasswordReturnTo = 'Login' | 'Settings';

export type AuthStackParamList = {
  Welcome: undefined;
  Login: undefined;
  Register: undefined;
  Otp: { email: string; purpose: OtpPurpose; returnTo?: ForgotPasswordReturnTo };
  ForgotPassword: { returnTo?: ForgotPasswordReturnTo } | undefined;
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
  /** Đợt 11 — nested Stack (MealPlanner/Grocery), thay `undefined` cũ (toggle cục bộ) để
   * Notifications/deep-link khác điều hướng thẳng được vào Grocery (giữ bottom tab bar). */
  Planner: NavigatorScreenParams<PlannerStackParamList>;
  Profile: undefined;
};

/** Nested Stack của tab Thực đơn — xem PLANNER_STACK_ROUTES (constants/routes.ts) và
 * src/navigation/PlannerStackNavigator.tsx. `weekStartIso` truyền qua route.params để 2 màn giữ
 * đúng tuần đang xem khi điều hướng qua lại (không lift state lên ngoài Tab nữa vì mỗi màn giờ
 * là 1 Stack.Screen độc lập, không cùng render 1 lúc như toggle cục bộ cũ). */
export type PlannerStackParamList = {
  MealPlanner: { weekStartIso?: string } | undefined;
  Grocery: { weekStartIso?: string } | undefined;
};

// Đợt 2/3 — Dashboard + Ghi bữa ăn (AI/Voice) + Nhật ký dinh dưỡng. Các màn này không thuộc
// riêng 1 tab (QuickLog/AISnap/FoodSearch... mở được từ cả Dashboard lẫn Diary) nên đặt làm
// sibling của MainTabs trong 1 Stack Navigator chung (MainNavigator), không lồng riêng theo tab.
export type MainStackParamList = {
  MainTabs: NavigatorScreenParams<MainTabParamList>;
  QuickLog: { mealType?: MealType } | undefined;
  AICamera: { mealType: MealType };
  AIAnalyzing: { mealType: MealType; photoUri?: string };
  AISnapResult: { mealType: MealType; result: AIAnalysisResult };
  /** `initialResult` — set khi đến từ VoicePermission "Hoặc gõ bữa ăn của bạn" (BR-252): bỏ qua
   * bước ghi âm, vào thẳng phase reviewing với kết quả đã có. */
  VoiceLog: { mealType: MealType; initialResult?: VoiceLogResult };
  /** `source` đổi copy/CTA cho đúng luồng thất bại (Chụp lại vs Nói lại). */
  StateAIFailed: { mealType: MealType; source: 'photo' | 'voice' };
  StateAILimit: { mealType?: MealType } | undefined;
  FoodSearch: { mealType: MealType };
  FoodDetail: { foodId: string; mealType: MealType };
  /** `dateIso` — ngày của nhật ký chứa bản ghi (mặc định hôm nay); cần khi sửa/xóa món của ngày khác. */
  EditMealLog: { logId: string; dateIso?: string };
  DeleteConfirm: { logId: string; dateIso?: string };
  ProgressChart: undefined;

  // Đợt 4 — Scanner (BR-080, BR-120, BR-130, BR-140).
  Barcode: { mealType: MealType };
  ProductNotFound: { barcode: string; mealType: MealType };
  OCRReview: { mealType: MealType };
  Fridge: undefined;
  /** `returnTo` — biết quay lại camera nào sau khi "Cho phép camera". */
  StatePermission: { mealType?: MealType; returnTo: 'Barcode' | 'Fridge' | 'AICamera' };

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

  // Đợt 9 — auth/profile (design v2, BR-001→003, BR-010→014, BR-270/271).
  GuestPrompt: undefined;
  StateSession: { variant: 'expired' | 'locked' };
  Settings: undefined;
  EditProfile: undefined;
  DeleteData: undefined;
  /** "Đổi mật khẩu" ở Settings (sửa lệch sau Đợt 9) — cùng shape với AuthStackParamList. */
  ForgotPassword: { returnTo?: ForgotPasswordReturnTo } | undefined;
  Otp: { email: string; purpose: OtpPurpose; returnTo?: ForgotPasswordReturnTo };

  // Đợt 10 — ai/scanner (design v2, BR-072, BR-080→083, BR-121, BR-130→132, BR-162, BR-252,
  // BR-290/291). Không có bottom nav, sibling của MainTabs.
  /** Fridge Scanner chỉ Pro — Free bị chặn ở Discovery trước khi vào màn này (Premium upsell). */
  FridgeCamera: undefined;
  OCRCamera: { mealType: MealType };
  VoicePermission: { mealType: MealType };
  CreateFood: { mealType: MealType };
  AddToMealPlan: { recipeId: string };

  // Đợt 11 — planner/grocery (design v2, BR-040→042, BR-160→174, BR-260→262).
  GroceryAdd: { weekStartIso: string };
  GroceryDone: { weekStartIso: string };
  PlannerRegenerate: { weekStartIso: string };
  CalorieBudget: undefined;

  // Đợt 12 — gamification (design v2, BR-031, BR-150→152, BR-200→212, BR-221).
  WaterLog: undefined;
  Challenges: undefined;
  ChallengeComplete: { challengeId: string };
  Badges: undefined;
  CollectionDetail: { collectionId: string };
  CreateCollection: undefined;

  // Đợt 13 — premium (design v2, BR-230→233, BR-240→242).
  Subscription: undefined;
  PaymentMethod: { planId: BillingPlanId };
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
