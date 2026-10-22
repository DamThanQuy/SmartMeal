// Dữ liệu mẫu theo đúng hình dạng JSON mà /api/admin/* trả về (camelCase).

export const adminUser = { id: 'admin-1', email: 'admin@smartmeal.com', fullName: 'Quản Trị Viên', role: 'Admin' }

export const stats = {
  totalUsers: 40,
  activeUsers: 38,
  lockedUsers: 2,
  proUsers: 10,
  freeUsers: 30,
  totalRecipes: 40,
  totalTransactions: 6,
  totalRevenueVnd: 1250000,
  monthlyRevenueVnd: 158000,
  recipesByMealType: { Breakfast: 10, Lunch: 20, Dinner: 8, Snack: 2 },
  popularPlans: [
    { id: 'PRO_MONTHLY', name: 'Gói Tháng (Pro Monthly)', priceVnd: 79000, durationDays: 30, isPopular: false, activeSubscribers: 7, totalRevenueVnd: 553000 },
    { id: 'PRO_YEARLY', name: 'Gói Năm (Pro Yearly - Tiết kiệm 25%)', priceVnd: 699000, durationDays: 365, isPopular: true, activeSubscribers: 3, totalRevenueVnd: 699000 },
  ],
  recentTransactions: [
    { id: 't1', userFullName: 'Lan Anh', userEmail: 'lan@example.com', planName: 'Gói Tháng (Pro Monthly)', amountVnd: 79000, status: 'Paid' },
    { id: 't2', userFullName: 'Minh', userEmail: 'minh@example.com', planName: 'Gói Năm (Pro Yearly)', amountVnd: 699000, status: 'Pending' },
    { id: 't3', userFullName: 'Hùng', userEmail: 'hung@example.com', planName: 'Gói Tháng (Pro Monthly)', amountVnd: 79000, status: 'Failed' },
  ],
  recentUsers: [
    { id: 'u1', fullName: 'Lan Anh', email: 'lan@example.com', role: 'User', isPro: true, createdAt: '2026-10-20T08:30:00Z' },
    { id: 'u2', fullName: '', email: 'boss@example.com', role: 'Admin', isPro: false, createdAt: '2026-10-19T01:00:00Z' },
  ],
}

export const users = [
  { id: 'u1', fullName: 'Lan Anh', email: 'lan@example.com', role: 'User', isPro: true, proExpiresAt: '2026-11-20T00:00:00Z', isLocked: false },
  { id: 'u2', fullName: 'Minh Trần', email: 'minh@example.com', role: 'Admin', isPro: false, proExpiresAt: null, isLocked: false },
  { id: 'u3', fullName: 'Spam Bot', email: 'bot@example.com', role: 'User', isPro: false, proExpiresAt: null, isLocked: true },
]

export const userDetail = {
  ...users[0],
  createdAt: '2026-09-01T00:00:00Z',
  favoritesCount: 4,
  diariesCount: 12,
  mealPlansCount: 3,
  healthProfile: {
    gender: 'Female', age: 28, heightCm: 160, currentWeightKg: 58, targetWeightKg: 52, targetCalories: 1650.4,
    goal: 'LoseWeight', activityLevel: 'Moderate',
  },
}

export const recipes = [
  {
    id: 'r1', title: 'Salad ức gà', description: 'Ít calo', imageUrl: '', difficulty: 'Easy', isPremium: true,
    caloriesPerServing: 349.6, totalTimeMinutes: 15, proteinPerServing: 32, tags: ['Eat Clean', 'Keto', 'Low-Carb', 'Tiết Kiệm'],
  },
  {
    id: 'r2', title: 'Bò kho', description: '', imageUrl: 'https://img.example.com/bo.jpg', difficulty: 'Hard', isPremium: false,
    caloriesPerServing: 520, totalTimeMinutes: 90, proteinPerServing: 40, tags: [],
  },
]

export const recipeDetail = {
  id: 'r1', title: 'Salad ức gà', description: 'Ít calo', imageUrl: '', instructions: '1. Trộn đều', prepTimeMinutes: 5,
  cookTimeMinutes: 10, servings: 2, difficulty: 'Easy', isPremium: true, mealTypes: 'Breakfast, Lunch', caloriesPerServing: 350,
  proteinPerServing: 32, carbsPerServing: 12, fatPerServing: 9, tagCodes: ['eatClean'],
  ingredients: [{ name: 'Ức gà phi lê', category: 'Meat', unit: 'g', amount: 150, caloriesPer100g: 165, proteinPer100g: 31, carbsPer100g: 0, fatPer100g: 3.6, estimatedPriceVnd: 18000 }],
}

export const plans = [
  { id: 'PRO_MONTHLY', name: 'Gói Tháng (Pro Monthly)', priceVnd: 79000, billingCycle: 'Monthly', durationDays: 30, isPopular: false, features: ['AI không giới hạn'], activeSubscribers: 7, totalRevenueVnd: 553000 },
  { id: 'PRO_YEARLY', name: 'Gói Năm (Pro Yearly)', priceVnd: 699000, billingCycle: 'Yearly', durationDays: 365, isPopular: true, features: ['Tiết kiệm 25%'], activeSubscribers: 3, totalRevenueVnd: 699000 },
]

export const transactions = [
  { id: 't1', orderCode: 123456, sessionId: 'sess-paid-0001', userFullName: 'Lan Anh', userEmail: 'lan@example.com', planName: 'Gói Tháng (Pro Monthly)', amountVnd: 79000, paymentMethod: 'PAYOS', status: 'Paid', createdAt: '2026-10-20T08:00:00Z', paidAt: '2026-10-20T08:05:00Z' },
  { id: 't2', orderCode: null, sessionId: 'sess-pending-abcdefghijkl', userFullName: 'Minh', userEmail: 'minh@example.com', planName: 'Gói Năm (Pro Yearly)', amountVnd: 699000, paymentMethod: 'SEPAY', status: 'Pending', createdAt: '2026-10-21T08:00:00Z', paidAt: null },
  { id: 't3', orderCode: 777, sessionId: 'sess-failed', userFullName: 'Hùng', userEmail: 'hung@example.com', planName: 'Gói Tháng (Pro Monthly)', amountVnd: 79000, paymentMethod: 'PAYOS', status: 'Failed', createdAt: '2026-10-21T09:00:00Z', paidAt: null },
]

export const challenges = [
  { id: 'c1', title: '7 Ngày Uống Đủ 2L Nước', description: 'Uống nước', category: 'DrinkWater', durationDays: 7, targetValuePerDay: 2000, rewardExp: 150, rewardBadge: 'Water Champion', isActive: true, participantCount: 12, completedCount: 4 },
  { id: 'c2', title: 'Eat Clean 14 Ngày', description: '', category: 'EatClean', durationDays: 14, targetValuePerDay: 3, rewardExp: 300, rewardBadge: '', isActive: false, participantCount: 0, completedCount: 0 },
]

export const badges = [
  { badgeId: 'first-log', name: 'Khởi đầu', description: 'Ghi bữa đầu tiên', category: 'Nutrition', unlockedCount: 25 },
  { badgeId: 'hydrated', name: 'Đủ nước', description: 'Uống đủ nước', category: '', unlockedCount: 9 },
]

export const xpEvents = [
  { id: 'x1', userFullName: 'Lan Anh', userEmail: 'lan@example.com', kind: 'AdminReward', xp: 100, createdAt: '2026-10-21T10:00:00Z' },
]

export const activity = {
  serverUptimeHours: 31.5,
  serverTimeUtc: '2026-10-22T03:00:00Z',
  databaseStatus: 'Healthy',
  databaseLatencyMs: 3.2,
  totalAiRequestsToday: 17,
  recentAiLogs: [{ id: 'a1', userFullName: 'Lan Anh', userEmail: 'lan@example.com', kind: 'snap', createdAt: '2026-10-22T02:00:00Z' }],
  recentDiaryLogs: [{ id: 'd1', userFullName: 'Minh', mealType: 'Lunch', calories: 512.7, date: '2026-10-22T02:30:00Z' }],
  recentSecurityEvents: [
    { eventType: 'AccountLocked', targetUser: 'Spam Bot (bot@example.com)', details: 'Tài khoản bị khóa đến 01/11/2026 10:00', timestamp: '2026-10-22T01:00:00Z' },
    { eventType: 'FailedAttempts', targetUser: 'Hùng (hung@example.com)', details: 'Nhập sai mật khẩu 3 lần liên tiếp', timestamp: '2026-10-22T00:30:00Z' },
  ],
}

export const revenue = {
  totalRevenue: 1250000,
  monthlyRevenue: 158000,
  yearlyRevenue: 1250000,
  averageRevenuePerPayingUser: 312500,
  totalTransactions: 8,
  successfulTransactions: 6,
  successRatePercentage: 75,
  revenueByPeriod: [
    { periodLabel: '20/10', amountVnd: 0, transactionCount: 0 },
    { periodLabel: '21/10', amountVnd: 79000, transactionCount: 1 },
    { periodLabel: '22/10', amountVnd: 158000, transactionCount: 2 },
  ],
  revenueByMethod: { PAYOS: 778000, SEPAY: 472000 },
  revenueByPlan: { 'Gói Tháng (Pro Monthly)': 551000, 'Gói Năm (Pro Yearly)': 699000 },
}

export const engagement = {
  estimatedDau: 12,
  estimatedWau: 30,
  estimatedMau: 41,
  challengeCompletionRate: 33.3,
  totalDiariesLogged: 1520,
  totalWaterLogs: 830,
  totalStepsSynced: 125000,
  averagePetLevel: 3.4,
  topEngagedUsers: [
    { userId: 'u1', fullName: 'Lan Anh', email: 'lan@example.com', diariesCount: 80, petLevel: 6, totalXp: 2600, lastActiveAt: '2026-10-21T00:00:00Z' },
    { userId: 'u2', fullName: '', email: 'minh@example.com', diariesCount: 40, petLevel: 3, totalXp: 1100, lastActiveAt: null },
  ],
}

/** Gán dữ liệu mẫu mặc định cho mọi hàm của api đã được vi.mock. */
export function setupApi(api) {
  api.login.mockResolvedValue({ token: 'jwt', user: adminUser })
  api.getStats.mockResolvedValue(stats)
  api.getUsers.mockResolvedValue({ items: users, total: users.length })
  api.getUserDetail.mockResolvedValue(userDetail)
  api.updateUserStatus.mockResolvedValue({ success: true })
  api.updateUserRole.mockResolvedValue({ success: true })
  api.updateUserSubscription.mockResolvedValue({ success: true })
  api.deleteUser.mockResolvedValue({ success: true })
  api.banUser.mockResolvedValue({ success: true })
  api.moderateAccount.mockResolvedValue({ success: true })
  api.getRecipes.mockResolvedValue({ items: recipes, total: recipes.length })
  api.getRecipeDetail.mockResolvedValue(recipeDetail)
  api.createRecipe.mockResolvedValue({ id: 'r-new' })
  api.updateRecipe.mockResolvedValue({ id: 'r1' })
  api.deleteRecipe.mockResolvedValue({ success: true })
  api.getPlans.mockResolvedValue(plans)
  api.getTransactions.mockResolvedValue({ items: transactions, total: transactions.length })
  api.approveTransaction.mockResolvedValue({ success: true })
  api.getChallenges.mockResolvedValue(challenges)
  api.createChallenge.mockResolvedValue({ id: 'c-new' })
  api.updateChallenge.mockResolvedValue({ id: 'c1' })
  api.deleteChallenge.mockResolvedValue({ success: true })
  api.getBadges.mockResolvedValue(badges)
  api.getXpEvents.mockResolvedValue(xpEvents)
  api.grantXp.mockResolvedValue({ success: true })
  api.getSystemActivity.mockResolvedValue(activity)
  api.getRevenueReport.mockResolvedValue(revenue)
  api.getEngagementAnalytics.mockResolvedValue(engagement)
}

/** Một trang của danh sách phân trang, đúng hình dạng api.getUsers / getRecipes / getTransactions trả về. */
export const listPage = (items, total = items.length) => ({ items, total })

/** Tạo n bản ghi để kiểm tra phân trang. */
export function manyUsers(n) {
  return Array.from({ length: n }, (_, i) => ({ id: `bulk-${i}`, fullName: `Người dùng ${i}`, email: `user${i}@example.com`, role: 'User', isPro: false, isLocked: false }))
}
