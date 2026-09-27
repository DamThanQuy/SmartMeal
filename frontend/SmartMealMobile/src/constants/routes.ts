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
} as const;
