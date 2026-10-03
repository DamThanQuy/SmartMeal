export const ENDPOINTS = {
  healthProfile: {
    survey: '/healthprofile/survey',
    profile: '/healthprofile',
  },
  recipes: {
    list: '/recipes',
    detail: (id: string) => `/recipes/${id}`,
    suggestByPantry: '/recipes/suggest-by-pantry',
    favorites: '/recipes/favorites',
    favorite: (id: string) => `/recipes/${id}/favorite`,
    collections: '/recipes/collections',
    collectionItems: (collectionId: string) => `/recipes/collections/${collectionId}/items`,
  },
  foods: '/foods',
  mealPlanner: {
    week: '/mealplanner/week',
    assign: '/mealplanner/assign',
    autoGenerate: '/mealplanner/auto-generate',
    delete: (id: string) => `/mealplanner/${id}`,
  },
  grocery: {
    list: '/grocery',
    generateFromPlan: '/grocery/generate-from-plan',
    items: '/grocery/items',
    check: (id: string) => `/grocery/items/${id}/check`,
    delete: (id: string) => `/grocery/items/${id}`,
    clearChecked: '/grocery/clear-checked',
  },
  subscription: {
    plans: '/subscription/plans',
    checkout: '/subscription/create-checkout-session',
    activateMock: '/subscription/activate-mock',
  },
  ai: {
    snapAndTrack: '/ai/snap-and-track',
    fridgeScanner: '/ai/fridge-scanner',
    voiceLog: '/ai/voice-log',
    checkSafety: '/ai/check-safety',
  },
} as const;