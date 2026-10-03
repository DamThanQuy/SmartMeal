/**
 * Danh sách endpoint của backend — không hard-code chuỗi URL ở nơi khác (.claude/rules/
 * no-hardcode.md mục 2). Đường dẫn tương đối so với `baseURL` (đã gồm `/api`). Khai báo ĐỦ 50
 * endpoint ngay từ PR nền tảng để Phần 1/Phần 2 chỉ import, không sửa chung 1 file
 * (docs/fetch-api/part1 §2, §4.3). ASP.NET không phân biệt hoa/thường trong route.
 */
export const ENDPOINTS = {
  auth: {
    register: '/auth/register',
    login: '/auth/login',
    google: '/auth/google',
    me: '/auth/me',
    profile: '/auth/profile',
  },
  healthProfile: {
    base: '/healthprofile',
    survey: '/healthprofile/survey',
    weightLog: '/healthprofile/weight-log',
    weightHistory: '/healthprofile/weight-history',
  },
  meta: {
    allergies: '/meta/allergies',
    medicalConditions: '/meta/medical-conditions',
    tags: '/meta/tags',
  },
  nutritionDiary: {
    log: '/nutritiondiary/log',
    daily: '/nutritiondiary/daily',
    weeklyProgress: '/nutritiondiary/weekly-progress',
    item: (id: string) => `/nutritiondiary/items/${id}`,
    water: '/nutritiondiary/water',
  },
  foods: {
    list: '/foods',
    byId: (id: string) => `/foods/${id}`,
  },
  healthSync: {
    stepsAndCalories: '/health-sync/steps-and-calories',
    dailySummary: '/health-sync/daily-summary',
  },
  recipes: {
    list: '/recipes',
    byId: (id: string) => `/recipes/${id}`,
    suggestByPantry: '/recipes/suggest-by-pantry',
    favorite: (id: string) => `/recipes/${id}/favorite`,
    favorites: '/recipes/favorites',
    collections: '/recipes/collections',
    collectionItems: (id: string) => `/recipes/collections/${id}/items`,
  },
  mealPlanner: {
    week: '/mealplanner/week',
    assign: '/mealplanner/assign',
    byId: (id: string) => `/mealplanner/${id}`,
    autoGenerate: '/mealplanner/auto-generate',
  },
  grocery: {
    list: '/grocery',
    generateFromPlan: '/grocery/generate-from-plan',
    items: '/grocery/items',
    itemCheck: (id: string) => `/grocery/items/${id}/check`,
    item: (id: string) => `/grocery/items/${id}`,
    clearChecked: '/grocery/clear-checked',
  },
  ai: {
    snapAndTrack: '/ai/snap-and-track',
    fridgeScanner: '/ai/fridge-scanner',
    voiceLog: '/ai/voice-log',
    checkSafety: '/ai/check-safety',
  },
  gamification: {
    pet: '/gamification/pet',
    streak: '/gamification/streak',
    challenges: '/gamification/challenges',
    joinChallenge: (id: string) => `/gamification/challenges/${id}/join`,
  },
  subscription: {
    plans: '/subscription/plans',
    createCheckoutSession: '/subscription/create-checkout-session',
    activateMock: '/subscription/activate-mock',
  },
} as const;
