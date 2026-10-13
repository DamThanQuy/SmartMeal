/**
 * Live: thực đơn tuần và danh sách đi chợ với backend thật — xếp/xóa món, đánh dấu đã nấu, server từ chối
 * món chứa dị ứng (BR-102/162), tạo tuần tự động giữ món đã chọn (BR-163), danh sách đi chợ tự tạo từ
 * thực đơn, tick theo trạng thái đích, món tự thêm, "Hoàn tất mua sắm" lưu chi phí thực tế và giữ món
 * chưa mua sang tuần sau (BR-170→174). Chỉ chạy khi có LIVE_API_URL (xem test-utils/live.ts).
 */
import { describeLive, installLiveBackend, uniqueEmail } from '../../test-utils/live';

type AuthModule = typeof import('@/features/auth/services/authService');
type HealthModule = typeof import('@/features/health/services/healthProfileService');
type HealthTypesModule = typeof import('@/features/health/types/health.types');
type RecipeModule = typeof import('@/features/recipes/services/recipeService');
type PlannerModule = typeof import('@/features/meal-planner/services/mealPlannerService');
type GroceryModule = typeof import('@/features/grocery/services/groceryService');
type AuthStoreModule = typeof import('@/state/auth/authStore');
type ProfileStoreModule = typeof import('@/state/user/userProfileStore');

// Tuần cố định trong quá khứ gần (BE chỉ chặn ngày > hôm nay + 1) để mỗi người dùng mới bắt đầu từ trống.
const WEEK = '2026-09-07';
const NEXT_WEEK = '2026-09-14';

describeLive('thực đơn & đi chợ (backend thật)', () => {
  let authService: AuthModule['authService'];
  let healthProfileService: HealthModule['healthProfileService'];
  let healthTypes: HealthTypesModule;
  let recipeService: RecipeModule['recipeService'];
  let mealPlannerService: PlannerModule['mealPlannerService'];
  let groceryService: GroceryModule['groceryService'];
  let useAuthStore: AuthStoreModule['useAuthStore'];
  let useUserProfileStore: ProfileStoreModule['useUserProfileStore'];

  beforeAll(() => {
    installLiveBackend();
    ({ authService } = require('@/features/auth/services/authService') as AuthModule);
    ({ healthProfileService } = require('@/features/health/services/healthProfileService') as HealthModule);
    healthTypes = require('@/features/health/types/health.types') as HealthTypesModule;
    ({ recipeService } = require('@/features/recipes/services/recipeService') as RecipeModule);
    ({ mealPlannerService } = require('@/features/meal-planner/services/mealPlannerService') as PlannerModule);
    ({ groceryService } = require('@/features/grocery/services/groceryService') as GroceryModule);
    ({ useAuthStore } = require('@/state/auth/authStore') as AuthStoreModule);
    ({ useUserProfileStore } = require('@/state/user/userProfileStore') as ProfileStoreModule);
  });

  async function signInWith(allergyIds: string[] = []) {
    const { user } = await authService.register({ fullName: 'Người Thử', email: uniqueEmail('planner'), password: 'Passw0rd!' });
    useAuthStore.setState({ pendingUser: user, user: null, isAuthenticated: false });
    await healthProfileService.submitHealthProfile({
      ...healthTypes.createEmptyHealthProfileFormData(),
      dateOfBirth: { day: '15', month: '6', year: '1995' },
      gender: 'female',
      heightCm: '160',
      weightKg: '55',
      goal: 'maintain',
      goalWeightKg: '55',
      activityLevel: 'moderate',
      allergyIds,
    });
    const profile = await healthProfileService.getHealthProfile(user.id);
    if (!profile) throw new Error('Không đọc lại được hồ sơ vừa tạo');
    useUserProfileStore.getState().hydrateFromServer(profile.snapshot, profile.extras);
    useAuthStore.setState({ pendingUser: null, user, isAuthenticated: true });
  }

  test('xếp, đánh dấu đã nấu và xóa một món; server từ chối món chứa dị ứng', async () => {
    await signInWith(['seafood']);
    const safe = (await recipeService.getRecommended({ mealType: 'lunch' })).recipes[0];

    const slot = await mealPlannerService.setSlot(WEEK, WEEK, 'lunch', safe.id);
    expect(slot).toMatchObject({ recipeId: safe.id, isCompleted: false });
    await mealPlannerService.setCompleted(slot.mealPlanId, true);
    let plan = await mealPlannerService.getWeekPlan(WEEK);
    expect(plan.days[0].meals.lunch?.isCompleted).toBe(true);

    await mealPlannerService.clearSlot(slot.mealPlanId);
    plan = await mealPlannerService.getWeekPlan(WEEK);
    expect(plan.days[0].meals.lunch).toBeNull();

    // Tạo lại cả tuần cho người dị ứng hải sản: không ô nào có món chứa hải sản.
    const { plan: generated } = await mealPlannerService.regenerateWeek(WEEK);
    const recipeIds = generated.days.flatMap(day => Object.values(day.meals)).flatMap(meal => (meal ? [meal.recipeId] : []));
    expect(recipeIds.length).toBeGreaterThan(0);
    for (const recipeId of new Set(recipeIds)) {
      expect((await recipeService.getRecipeById(recipeId))?.allergenIds).not.toContain('seafood');
    }
  });

  test('server từ chối xếp món chứa dị ứng kể cả khi gọi thẳng', async () => {
    await signInWith([]);
    const salmon = (await recipeService.getRecommended({})).recipes.find(recipe => recipe.allergenIds.includes('seafood'));
    expect(salmon).toBeDefined();

    await signInWith(['seafood']);
    await expect(mealPlannerService.setSlot(WEEK, WEEK, 'dinner', salmon!.id)).rejects.toMatchObject({
      code: 'BUSINESS',
      details: expect.arrayContaining(['allergen_conflict']),
    });
  });

  test('tạo tuần tự động giữ món đã chọn và trả ghi chú; gợi ý ô theo bữa', async () => {
    await signInWith([]);
    const breakfast = (await mealPlannerService.getSlotSuggestions('breakfast')).options[0];
    const chosen = await mealPlannerService.setSlot(WEEK, WEEK, 'breakfast', breakfast.recipeId);

    const result = await mealPlannerService.autoFillWeek(WEEK, 1800);
    expect(result.note).toContain('1800');
    expect(result.plan.days[0].meals.breakfast?.mealPlanId).toBe(chosen.mealPlanId);
    expect(result.plan.days.every(day => day.meals.lunch && day.meals.dinner)).toBe(true);
  });

  test('đi chợ: tự tạo từ thực đơn, tick, món tự thêm, hoàn tất giữ món chưa mua sang tuần sau', async () => {
    await signInWith([]);
    const recipes = (await recipeService.getRecommended({})).recipes;
    await mealPlannerService.setSlot(WEEK, WEEK, 'lunch', recipes[0].id);
    await mealPlannerService.setSlot(NEXT_WEEK, NEXT_WEEK, 'dinner', recipes[1].id);

    const list = await groceryService.getGroceryList(WEEK);
    expect(list.periodStartIso).toBe(WEEK);
    expect(list.totalItems).toBeGreaterThan(0);
    const items = list.groups.flatMap(group => group.items);
    expect(items.every(item => !item.isManual)).toBe(true);

    await groceryService.toggleItemStatus(WEEK, items[0].id, 'purchased');
    await groceryService.toggleItemStatus(WEEK, items[0].id, 'purchased'); // trạng thái đích: gửi lại không đảo ngược
    const manual = await groceryService.addManualItem(WEEK, {
      name: 'Giấy bạc',
      quantity: 1,
      unit: 'cuộn',
      category: 'Đồ khô',
      estimatedPriceVnd: 25000,
    });
    expect(manual).toMatchObject({ isManual: true, category: 'Đồ khô', estimatedCostVnd: 25000 });

    const after = await groceryService.getGroceryList(WEEK);
    expect(after.purchasedItems).toBe(1);

    const { list: next, note } = await groceryService.completeShopping(WEEK, {
      markAllPurchased: false,
      keepPending: true,
      actualCostVnd: 120000,
    });
    expect(note).toContain('kỳ tiếp theo');
    expect(next.periodStartIso).toBe(NEXT_WEEK);
    expect(next.lastTrip).toMatchObject({ purchasedItems: 1, actualCostVnd: 120000 });
    const nextItems = next.groups.flatMap(group => group.items);
    expect(nextItems.some(item => item.id === items[0].id)).toBe(false);
    expect(nextItems.some(item => item.name === 'Giấy bạc')).toBe(true);
  });
});
