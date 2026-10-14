/**
 * Live: công thức, yêu thích, bộ sưu tập với backend thật — lọc dị ứng hai lớp (BE + FE), chi tiết có
 * dị ứng theo nguyên liệu, tim lưu trên server, bộ sưu tập tạo/đổi tên/thêm-bớt món/chia sẻ/xóa và quyền
 * chủ sở hữu (BR-101/102, BR-150→152). Chỉ chạy khi có LIVE_API_URL (xem test-utils/live.ts).
 */
import { describeLive, installLiveBackend, uniqueEmail } from '../../test-utils/live';

type AuthModule = typeof import('@/features/auth/services/authService');
type HealthModule = typeof import('@/features/health/services/healthProfileService');
type HealthTypesModule = typeof import('@/features/health/types/health.types');
type RecipeModule = typeof import('@/features/recipes/services/recipeService');
type AuthStoreModule = typeof import('@/state/auth/authStore');
type ProfileStoreModule = typeof import('@/state/user/userProfileStore');

describeLive('công thức & bộ sưu tập (backend thật)', () => {
  let authService: AuthModule['authService'];
  let healthProfileService: HealthModule['healthProfileService'];
  let healthTypes: HealthTypesModule;
  let recipeService: RecipeModule['recipeService'];
  let useAuthStore: AuthStoreModule['useAuthStore'];
  let useUserProfileStore: ProfileStoreModule['useUserProfileStore'];

  beforeAll(() => {
    installLiveBackend();
    ({ authService } = require('@/features/auth/services/authService') as AuthModule);
    ({ healthProfileService } = require('@/features/health/services/healthProfileService') as HealthModule);
    healthTypes = require('@/features/health/types/health.types') as HealthTypesModule;
    ({ recipeService } = require('@/features/recipes/services/recipeService') as RecipeModule);
    ({ useAuthStore } = require('@/state/auth/authStore') as AuthStoreModule);
    ({ useUserProfileStore } = require('@/state/user/userProfileStore') as ProfileStoreModule);
  });

  /** Đăng ký + khảo sát rồi nạp hồ sơ vào store như app làm sau khi đăng nhập. */
  async function signInWith(allergyIds: string[]) {
    const { user } = await authService.register({ fullName: 'Người Thử', email: uniqueEmail('recipes'), password: 'Passw0rd!' });
    useAuthStore.setState({ pendingUser: user, user: null, isAuthenticated: false });
    await healthProfileService.submitHealthProfile({
      ...healthTypes.createEmptyHealthProfileFormData(),
      dateOfBirth: { day: '15', month: '6', year: '1995' },
      gender: 'male',
      heightCm: '175',
      weightKg: '70',
      goal: 'lose',
      goalWeightKg: '65',
      activityLevel: 'moderate',
      allergyIds,
    });
    const profile = await healthProfileService.getHealthProfile(user.id);
    if (!profile) throw new Error('Không đọc lại được hồ sơ vừa tạo');
    useUserProfileStore.getState().hydrateFromServer(profile.snapshot, profile.extras);
    useAuthStore.setState({ pendingUser: null, user, isAuthenticated: true });
    return user;
  }

  test('người dị ứng hải sản không thấy món cá hồi; chi tiết món vẫn ghi rõ nguyên liệu gây dị ứng', async () => {
    await signInWith([]);
    const all = await recipeService.getRecommended({});
    const salmon = all.recipes.find(recipe => recipe.name.includes('Cá hồi'));
    expect(salmon).toBeDefined();
    expect(all.excludedAllergenIds).toEqual([]);

    await signInWith(['seafood']);
    const safe = await recipeService.getRecommended({});
    expect(safe.recipes.length).toBeGreaterThan(0);
    expect(safe.recipes.some(recipe => recipe.allergenIds.includes('seafood'))).toBe(false);
    expect(safe.excludedAllergenIds).toEqual(['seafood']);

    const detail = await recipeService.getRecipeById(salmon!.id);
    expect(detail?.allergenIds).toContain('seafood');
    expect(detail?.ingredients.some(ingredient => ingredient.allergenIds.includes('seafood'))).toBe(true);

    expect(await recipeService.getRecipeById('00000000-0000-0000-0000-000000000000')).toBeUndefined();
  });

  test('lọc theo bữa và thời gian nấu chạy ở server', async () => {
    await signInWith([]);
    const quick = await recipeService.getRecommended({ cookTime: '15' });
    expect(quick.recipes.every(recipe => recipe.durationMinutes <= 15)).toBe(true);

    const breakfast = await recipeService.getRecommended({ mealType: 'breakfast' });
    expect(breakfast.recipes.length).toBeGreaterThan(0);
    expect(
      breakfast.recipes.every(recipe => recipe.mealTypes.length === 0 || recipe.mealTypes.includes('breakfast')),
    ).toBe(true);
  });

  test('tim lưu trên server; bộ sưu tập: tạo, thêm/bỏ món, đổi tên, chia sẻ, xóa', async () => {
    await signInWith([]);
    const [first, second] = (await recipeService.getRecommended({})).recipes;

    expect((await recipeService.toggleFavorite(first.id)).isFavorite).toBe(true);
    expect((await recipeService.getFavoriteRecipes()).map(recipe => recipe.id)).toEqual([first.id]);
    expect((await recipeService.toggleFavorite(first.id)).isFavorite).toBe(false);
    expect(await recipeService.getFavoriteRecipes()).toEqual([]);

    const created = await recipeService.createCollection({ name: '  Bữa sáng nhanh  ', isPublic: false });
    expect(created).toMatchObject({ name: 'Bữa sáng nhanh', isOwner: true, isPublic: false, recipes: [] });

    await recipeService.addRecipeToCollection(created.id, first.id);
    await recipeService.addRecipeToCollection(created.id, second.id);
    await recipeService.removeRecipeFromCollection(created.id, first.id);
    const renamed = await recipeService.updateCollection(created.id, { name: 'Món tuần này', isPublic: true });
    expect(renamed.name).toBe('Món tuần này');
    expect(renamed.isPublic).toBe(true);
    expect(renamed.recipes.map(recipe => recipe.id)).toEqual([second.id]);

    const listed = await recipeService.getCollections();
    expect(listed.find(collection => collection.id === created.id)?.recipes).toHaveLength(1);

    await recipeService.deleteCollection(created.id);
    expect(await recipeService.getCollection(created.id)).toBeUndefined();
  });

  test('bộ sưu tập công khai của người khác chỉ xem; riêng tư thì không thấy', async () => {
    await signInWith([]);
    const recipe = (await recipeService.getRecommended({})).recipes[0];
    const shared = await recipeService.createCollection({ name: 'Chia sẻ', isPublic: true });
    const hidden = await recipeService.createCollection({ name: 'Riêng tư', isPublic: false });
    await recipeService.addRecipeToCollection(shared.id, recipe.id);

    await signInWith([]);
    const seen = await recipeService.getCollection(shared.id);
    expect(seen).toMatchObject({ isOwner: false, isPublic: true });
    expect(seen?.recipes.map(item => item.id)).toEqual([recipe.id]);
    expect(await recipeService.getCollection(hidden.id)).toBeUndefined();
    await expect(recipeService.updateCollection(shared.id, { name: 'Của tôi' })).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  test('liên kết chia sẻ: người khác xem được bộ sưu tập riêng tư (chỉ đọc); tắt liên kết thì hết hiệu lực', async () => {
    const owner = await signInWith([]);
    const recipe = (await recipeService.getRecommended({})).recipes[0];
    const mine = await recipeService.createCollection({ name: 'Bữa tối gia đình', isPublic: false });
    await recipeService.addRecipeToCollection(mine.id, recipe.id);

    const link = await recipeService.createCollectionShareLink(mine.id);
    expect(link.shareToken).toMatch(/^[A-Za-z0-9_-]{32}$/);
    expect((await recipeService.createCollectionShareLink(mine.id)).shareToken).toBe(link.shareToken);
    expect((await recipeService.getCollection(mine.id))?.shareToken).toBe(link.shareToken);

    await signInWith([]);
    const viewed = await recipeService.getSharedCollection(link.shareToken);
    expect(viewed).toMatchObject({ id: mine.id, isOwner: false, isPublic: false, shareToken: null });
    expect(viewed?.recipes.map(item => item.id)).toEqual([recipe.id]);
    // Không có liên kết thì vẫn không thấy (bộ sưu tập riêng tư), và không tắt hộ được.
    expect(await recipeService.getCollection(mine.id)).toBeUndefined();
    await expect(recipeService.revokeCollectionShareLink(mine.id)).rejects.toMatchObject({ code: 'NOT_FOUND' });

    // Chủ sở hữu tắt liên kết → người giữ liên kết không mở được nữa.
    const { user } = await authService.login({ email: owner.email, password: 'Passw0rd!' });
    useAuthStore.setState({ pendingUser: null, user, isAuthenticated: true });
    await recipeService.revokeCollectionShareLink(mine.id);
    expect((await recipeService.getCollection(mine.id))?.shareToken).toBeNull();
    expect(await recipeService.getSharedCollection(link.shareToken)).toBeUndefined();
  });

  test('gợi ý theo tủ lạnh tính số nguyên liệu khớp, không phân biệt dấu', async () => {
    await signInWith([]);
    const matches = await recipeService.getRecipesForIngredients(['uc ga', 'Cà chua']);

    expect(matches.length).toBeGreaterThan(0);
    expect(matches[0].matchedCount).toBeGreaterThan(0);
    expect(matches.every(match => match.matchedCount <= match.totalIngredients)).toBe(true);
  });
});
