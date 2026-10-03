/**
 * Tên route dùng chung — không hard-code chuỗi route ở Screen/Navigator (CLAUDE.md mục 4).
 */
export const ROOT_ROUTES = {
  AUTH: 'Auth',
  MAIN: 'Main',
} as const;

export const AUTH_ROUTES = {
  WELCOME: 'Welcome',
  LOGIN: 'Login',
  REGISTER: 'Register',
  OTP: 'Otp',
  FORGOT_PASSWORD: 'ForgotPassword',
  RESET_PASSWORD: 'ResetPassword',
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

// Đợt 2/3 — sibling của MainTabs trong MainNavigator (Stack), xem src/navigation/types.ts.
export const MAIN_STACK_ROUTES = {
  MAIN_TABS: 'MainTabs',
  QUICK_LOG: 'QuickLog',
  AI_CAMERA: 'AICamera',
  AI_ANALYZING: 'AIAnalyzing',
  AI_SNAP_RESULT: 'AISnapResult',
  VOICE_LOG: 'VoiceLog',
  STATE_AI_FAILED: 'StateAIFailed',
  STATE_AI_LIMIT: 'StateAILimit',
  FOOD_SEARCH: 'FoodSearch',
  FOOD_DETAIL: 'FoodDetail',
  EDIT_MEAL_LOG: 'EditMealLog',
  DELETE_CONFIRM: 'DeleteConfirm',
  PROGRESS_CHART: 'ProgressChart',
  // Đợt 4 — scanner.
  BARCODE: 'Barcode',
  PRODUCT_NOT_FOUND: 'ProductNotFound',
  OCR_REVIEW: 'OCRReview',
  FRIDGE: 'Fridge',
  STATE_PERMISSION: 'StatePermission',
  // Đợt 5 — recipes.
  FILTER_SHEET: 'FilterSheet',
  RECIPE_DETAIL: 'RecipeDetail',
  FAVORITES: 'Favorites',
  // Đợt 6 — meal-planner + grocery.
  SLOT_PICKER: 'SlotPicker',
  // Đợt 7 — profile.
  HEALTH_SETTINGS: 'HealthSettings',
  WEIGHT_HISTORY: 'WeightHistory',
  HEALTH_CONNECT: 'HealthConnect',
  REMINDERS: 'Reminders',
  NOTIFICATIONS: 'Notifications',
  /** Màn Dev/ThemePreview (CLAUDE.md mục 11 Đợt 0) — vào từ mục Dev trong SettingsScreen (Đợt 9,
   * trước đó là icon "Cài đặt" trên ProfileScreen trực tiếp, Đợt 7). */
  DEV: 'Dev',
  // Đợt 8 — gamification + premium.
  PET: 'Pet',
  PREMIUM: 'Premium',
  PAYMENT_PENDING: 'PaymentPending',
  PAYMENT_SUCCESS: 'PaymentSuccess',
  // Đợt 9 — auth/profile (design v2). GuestPrompt/StateSession thuộc feature auth nhưng render
  // trong MainNavigator (Guest và phiên hết hạn đều đang ở "trong" MainNavigator lúc trigger —
  // xem src/state/auth/authStore.ts).
  GUEST_PROMPT: 'GuestPrompt',
  STATE_SESSION: 'StateSession',
  SETTINGS: 'Settings',
  EDIT_PROFILE: 'EditProfile',
  DELETE_DATA: 'DeleteData',
  /** SettingsScreen "Đổi mật khẩu" (sửa lệch sau Đợt 9) — ForgotPasswordScreen/OtpScreen dùng
   * chung với AuthNavigator, đăng ký thêm ở đây để mở được từ Main (xem MainNavigator.tsx). */
  FORGOT_PASSWORD: 'ForgotPassword',
  OTP: 'Otp',
  RESET_PASSWORD: 'ResetPassword',
  // Đợt 10 — ai/scanner (design v2).
  FRIDGE_CAMERA: 'FridgeCamera',
  OCR_CAMERA: 'OCRCamera',
  VOICE_PERMISSION: 'VoicePermission',
  CREATE_FOOD: 'CreateFood',
  /** Bottom sheet chọn ngày/bữa để thêm 1 công thức vào MealPlanner — RecipeDetailScreen "Thêm
   * vào thực đơn" (TODO cũ từ Đợt 5, nối lại ở Đợt 10). Không có artboard riêng trong design/. */
  ADD_TO_MEAL_PLAN: 'AddToMealPlan',
  // Đợt 11 — planner/grocery (design v2, BR-040→042, BR-160→174, BR-260→262). Grocery bản thân
  // (nội dung chính, giữ bottom tab) nay ở PLANNER_STACK_ROUTES bên dưới — các màn ở đây là
  // dialog/bottom-sheet sibling của MainTabs, giống AddToMealPlan/DeleteConfirm.
  GROCERY_ADD: 'GroceryAdd',
  GROCERY_DONE: 'GroceryDone',
  PLANNER_REGENERATE: 'PlannerRegenerate',
  CALORIE_BUDGET: 'CalorieBudget',
  // Đợt 12 — gamification (design v2, BR-031, BR-150→152, BR-200→212, BR-221).
  WATER_LOG: 'WaterLog',
  CHALLENGES: 'Challenges',
  CHALLENGE_COMPLETE: 'ChallengeComplete',
  BADGES: 'Badges',
  COLLECTION_DETAIL: 'CollectionDetail',
  CREATE_COLLECTION: 'CreateCollection',
  // Đợt 13 — premium (design v2, BR-230→233, BR-240→242).
  SUBSCRIPTION: 'Subscription',
  PAYMENT_METHOD: 'PaymentMethod',
} as const;

/** Nested Stack của tab Thực đơn (MAIN_TAB_ROUTES.PLANNER) — Grocery tách route riêng (Đợt 11,
 * sửa lệch: trước là toggle cục bộ trong MainTabNavigator) nhưng vẫn cần giữ bottom tab bar hiển
 * thị, nên lồng trong Stack riêng của tab này thay vì đặt ở MAIN_STACK_ROUTES (các route đó đều
 * che tab bar — xem src/navigation/PlannerStackNavigator.tsx). */
export const PLANNER_STACK_ROUTES = {
  MEAL_PLANNER: 'MealPlanner',
  GROCERY: 'Grocery',
} as const;
