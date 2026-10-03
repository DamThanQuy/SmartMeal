/**
 * Live: nhật ký dinh dưỡng và thực phẩm với backend thật — ghi cả bữa trong MỘT request (nguyên tử),
 * sửa bằng PUT (giữ id, không tạo món trùng), xóa, tiến độ tuần kèm macro, tìm món theo scope
 * (tất cả/gần đây/yêu thích/của tôi), yêu thích, món tự nhập và cảnh báo dị ứng theo code của /meta.
 * Chỉ chạy khi có LIVE_API_URL (xem test-utils/live.ts).
 */
import { describeLive, installLiveBackend, uniqueEmail } from '../../test-utils/live';

type AuthModule = typeof import('@/features/auth/services/authService');
type HealthModule = typeof import('@/features/health/services/healthProfileService');
type NutritionModule = typeof import('@/features/nutrition/services/nutritionService');
type HealthTypesModule = typeof import('@/features/health/types/health.types');
type StoreModule = typeof import('@/state/auth/authStore');
type NewMealLogInput = import('@/features/nutrition/types/nutrition.types').NewMealLogInput;

describeLive('nhật ký dinh dưỡng và thực phẩm (backend thật)', () => {
  let authService: AuthModule['authService'];
  let healthProfileService: HealthModule['healthProfileService'];
  let nutritionService: NutritionModule['nutritionService'];
  let todayIso: NutritionModule['todayIso'];
  let healthTypes: HealthTypesModule;
  let useAuthStore: StoreModule['useAuthStore'];

  beforeAll(() => {
    installLiveBackend();
    ({ authService } = require('@/features/auth/services/authService') as AuthModule);
    ({ healthProfileService } = require('@/features/health/services/healthProfileService') as HealthModule);
    ({ nutritionService, todayIso } = require('@/features/nutrition/services/nutritionService') as NutritionModule);
    healthTypes = require('@/features/health/types/health.types') as HealthTypesModule;
    ({ useAuthStore } = require('@/state/auth/authStore') as StoreModule);
  });

  async function newUser() {
    const email = uniqueEmail('nutrition');
    const { user } = await authService.register({ fullName: 'Người Thử', email, password: 'Passw0rd!' });
    useAuthStore.setState({ pendingUser: user, user: null, isAuthenticated: false });
    return user;
  }

  function entry(
    foodName: string,
    grams: number,
    calories: number,
    extra: Partial<NewMealLogInput> = {},
  ): NewMealLogInput {
    return {
      foodName,
      servingLabel: `${grams} g`,
      grams,
      nutrition: { calories, proteinG: 10, carbsG: 20, fatG: 5 },
      source: 'manual',
      ...extra,
    };
  }

  async function findFood(query: string, name: string) {
    const food = (await nutritionService.searchFoods(query, 'all')).find(item => item.name === name);
    if (!food) throw new Error(`BE không có món "${name}" (seed món mẫu chưa chạy?)`);
    return food;
  }

  describe('nhật ký', () => {
    test('ghi cả bữa trong một request: đọc lại đúng bữa, đúng số, có giờ ghi do BE lưu', async () => {
      await newUser();
      const today = todayIso();

      const created = await nutritionService.addLogEntries(today, 'lunch', [
        entry('Cơm', 150, 195),
        entry('Gà kho', 120, 240),
        entry('Canh', 200, 60),
      ]);
      const diary = await nutritionService.getDiaryDay(today);

      expect(created).toHaveLength(3);
      expect(created.every(item => item.mealType === 'lunch')).toBe(true);
      expect(diary.entriesByMeal.lunch.map(item => item.foodName).sort()).toEqual(['Canh', 'Cơm', 'Gà kho']);
      expect(diary.entriesByMeal.breakfast).toEqual([]);
      expect(diary.entriesByMeal.snack).toEqual([]);

      const rice = diary.entriesByMeal.lunch.find(item => item.foodName === 'Cơm');
      expect(rice).toMatchObject({
        grams: 150,
        servingLabel: '150 g',
        nutrition: { calories: 195, proteinG: 10, carbsG: 20, fatG: 5 },
        source: 'manual',
      });
      // Giờ ghi do BE lưu (không còn để trống): gần thời điểm hiện tại.
      expect(Math.abs(Date.now() - Date.parse(rice?.loggedAt ?? ''))).toBeLessThan(5 * 60 * 1000);
    });

    test('một món sai → BE từ chối cả bữa bằng thông báo tiếng Việt, không món nào được lưu', async () => {
      await newUser();
      const today = todayIso();

      await expect(
        nutritionService.addLogEntries(today, 'dinner', [
          entry('Hợp lệ', 100, 100),
          entry('Vô lý', 100, 99999),
        ]),
      ).rejects.toMatchObject({ code: 'BUSINESS', message: expect.stringContaining('Calo') });

      expect((await nutritionService.getDiaryDay(today)).entriesByMeal.dinner).toEqual([]);
    });

    test('sửa khối lượng rồi đổi bữa bằng PUT: giữ nguyên id, tính lại dinh dưỡng, không tạo món trùng', async () => {
      await newUser();
      const today = todayIso();
      const [created] = await nutritionService.addLogEntries(today, 'lunch', [entry('Cá kho', 200, 300)]);

      const resized = await nutritionService.updateLogEntry(today, created.id, { grams: 100 });
      const moved = await nutritionService.updateLogEntry(today, created.id, { mealType: 'dinner' });
      const diary = await nutritionService.getDiaryDay(today);

      expect(resized).toMatchObject({ id: created.id, grams: 100, nutrition: { calories: 150 } });
      expect(moved).toMatchObject({ id: created.id, mealType: 'dinner', grams: 100 });
      expect(diary.entriesByMeal.lunch).toEqual([]);
      expect(diary.entriesByMeal.dinner).toHaveLength(1);
      expect(diary.entriesByMeal.dinner[0]).toMatchObject({
        id: created.id,
        grams: 100,
        nutrition: { calories: 150 },
      });
    });

    test('sửa món không tồn tại → lỗi, nhật ký không đổi', async () => {
      await newUser();
      const today = todayIso();
      await nutritionService.addLogEntries(today, 'lunch', [entry('Cá kho', 200, 300)]);

      await expect(
        nutritionService.updateLogEntry(today, '00000000-0000-0000-0000-000000000000', { grams: 50 }),
      ).rejects.toBeDefined();
      expect((await nutritionService.getDiaryDay(today)).entriesByMeal.lunch).toHaveLength(1);
    });

    test('xóa món; xóa lần nữa → NOT_FOUND', async () => {
      await newUser();
      const today = todayIso();
      const [created] = await nutritionService.addLogEntries(today, 'snack', [entry('Chuối', 100, 90)]);

      await nutritionService.deleteLogEntry(today, created.id);

      expect((await nutritionService.getDiaryDay(today)).entriesByMeal.snack).toEqual([]);
      await expect(nutritionService.deleteLogEntry(today, created.id)).rejects.toMatchObject({
        code: 'NOT_FOUND',
      });
    });

    test('mục tiêu calo/macro lấy từ hồ sơ sức khỏe; tiến độ tuần có macro trung bình', async () => {
      await newUser();
      const profile = await healthProfileService.submitHealthProfile({
        ...healthTypes.createEmptyHealthProfileFormData(),
        dateOfBirth: { day: '15', month: '6', year: '1995' },
        gender: 'male',
        heightCm: '175',
        weightKg: '70',
        goal: 'lose',
        goalWeightKg: '65',
        activityLevel: 'moderate',
      });
      const today = todayIso();
      await nutritionService.addLogEntries(today, 'lunch', [entry('Cơm gà', 300, 500)]);

      const diary = await nutritionService.getDiaryDay(today);
      const week = await nutritionService.getWeeklyProgress(today);

      expect(diary.calorieTarget).toBeCloseTo(profile.calorieTarget, 0);
      expect(diary.macroTargets.proteinG).toBeCloseTo(profile.macros.proteinG, 0);
      expect(week.days).toHaveLength(7);
      expect(week.days[6]).toMatchObject({ date: today, calories: 500, isToday: true });
      expect(week.days.slice(0, 6).every(day => day.calories === 0)).toBe(true);
      expect(week.calorieTarget).toBeCloseTo(profile.calorieTarget, 0);
      expect(week.averageMacros).toHaveLength(3);
      expect(week.averageMacros[0]).toMatchObject({ label: 'Protein', consumedG: 10 });
      expect(week.averageMacros[0].targetG).toBeCloseTo(profile.macros.proteinG, 0);
      expect(week.averageMacros[1]).toMatchObject({ label: 'Carbs', consumedG: 20 });
      expect(week.averageMacros[2]).toMatchObject({ label: 'Fat', consumedG: 5 });
    });
  });

  describe('thực phẩm', () => {
    test('tìm có dấu lẫn không dấu đều ra "Phở bò"; khẩu phần theo tô, dinh dưỡng nhân theo khẩu phần, chưa xác minh', async () => {
      await newUser();

      const withoutDiacritics = await nutritionService.searchFoods('pho bo', 'all');
      const withDiacritics = await nutritionService.searchFoods('phở bò', 'all');
      const pho = await findFood('pho bo', 'Phở bò');
      const detail = await nutritionService.getFoodById(pho.id);

      expect(withoutDiacritics.some(food => food.name === 'Phở bò')).toBe(true);
      expect(withDiacritics.some(food => food.name === 'Phở bò')).toBe(true);
      // Món mẫu là ước lượng, chưa chuyên gia rà soát nên không được gắn "đã xác minh" (BR-120/121).
      expect(pho.verified).toBe(false);
      expect(detail?.servingOptions.map(option => option.label)).toEqual(
        expect.arrayContaining(['1 tô nhỏ (400 g)', '1 tô vừa (500 g)', '1 tô lớn (650 g)']),
      );
      expect(detail?.servingOptions.find(option => option.id === detail.defaultServingId)?.label).toBe(
        '1 tô vừa (500 g)',
      );
      // 75 kcal/100 g × 500 g.
      expect(detail?.nutritionPerServing.calories).toBe(375);
    });

    test('món có chất gây dị ứng mang slug của giao diện (đổi theo code của /meta)', async () => {
      await newUser();

      const bunBoHue = await findFood('bun bo hue', 'Bún bò Huế');
      const banhMi = await findFood('banh mi', 'Bánh mì thịt');

      expect(bunBoHue.allergenIds).toContain('seafood');
      expect(banhMi.allergenIds).toContain('gluten');
    });

    test('yêu thích: bật/tắt, bấm lặp không lỗi, tab "Yêu thích" và chi tiết khớp', async () => {
      await newUser();
      const pho = await findFood('pho bo', 'Phở bò');
      expect(pho.isFavorite).toBe(false);

      await expect(nutritionService.setFoodFavorite(pho.id, true)).resolves.toBe(true);
      await expect(nutritionService.setFoodFavorite(pho.id, true)).resolves.toBe(true);

      expect((await nutritionService.searchFoods('', 'favorite')).map(food => food.id)).toEqual([pho.id]);
      expect((await nutritionService.getFoodById(pho.id))?.isFavorite).toBe(true);

      await expect(nutritionService.setFoodFavorite(pho.id, false)).resolves.toBe(false);
      await expect(nutritionService.searchFoods('', 'favorite')).resolves.toEqual([]);
    });

    test('"Gần đây": món ghi kèm id thực phẩm xuất hiện; món ghi tay không có id thì không', async () => {
      await newUser();
      const pho = await findFood('pho bo', 'Phở bò');
      expect(await nutritionService.searchFoods('', 'recent')).toEqual([]);

      await nutritionService.addLogEntries(todayIso(), 'lunch', [
        entry('Phở bò', 500, 375, { ingredientId: pho.id, source: 'database' }),
        entry('Món vô danh', 100, 100),
      ]);

      expect((await nutritionService.searchFoods('', 'recent')).map(food => food.id)).toEqual([pho.id]);
    });

    test('món tự nhập: lưu trên server, hiện ở "Món của tôi", chưa xác minh, trùng tên bị từ chối', async () => {
      await newUser();
      const input = {
        name: 'Bánh quy yến mạch',
        amount: 50,
        unit: 'g' as const,
        nutrition: { calories: 250, proteinG: 5, carbsG: 30, fatG: 12, sugarG: 10 },
      };

      const created = await nutritionService.createFood(input);

      expect(created).toMatchObject({ name: 'Bánh quy yến mạch', verified: false, isUserCreated: true });
      expect(created.servingOptions).toEqual([{ id: expect.any(String), label: '50 g', grams: 50 }]);
      // Số liệu quy về trên 100 g rồi nhân lại đúng khẩu phần = đúng số người dùng đã nhập.
      expect(created.nutritionPerServing).toMatchObject({
        calories: 250,
        proteinG: 5,
        carbsG: 30,
        fatG: 12,
        sugarG: 10,
      });
      expect((await nutritionService.searchFoods('', 'mine')).map(food => food.name)).toEqual([
        'Bánh quy yến mạch',
      ]);
      await expect(nutritionService.createFood(input)).rejects.toMatchObject({ code: 'CONFLICT' });
    });

    test('món tự nhập chỉ chủ sở hữu thấy', async () => {
      await newUser();
      await nutritionService.createFood({
        name: 'Món bí mật của tôi',
        amount: 100,
        unit: 'g',
        nutrition: { calories: 100, proteinG: 5, carbsG: 10, fatG: 3 },
      });

      await newUser();

      expect(await nutritionService.searchFoods('bi mat', 'all')).toEqual([]);
      expect(await nutritionService.searchFoods('', 'mine')).toEqual([]);
    });

    test('"phần" lớn (130 g đa lượng/phần) vẫn lưu được và ghi vào nhật ký đúng số đã nhập', async () => {
      await newUser();
      const nutrition = { calories: 650, proteinG: 40, carbsG: 70, fatG: 20 };

      const created = await nutritionService.createFood({
        name: 'Cơm gà xối mỡ',
        amount: 1,
        unit: 'phần',
        nutrition,
      });
      const serving = created.servingOptions[0];
      const [logged] = await nutritionService.addLogEntries(todayIso(), 'dinner', [
        {
          foodName: created.name,
          ingredientId: created.id,
          servingLabel: serving.label,
          grams: serving.grams,
          nutrition,
          source: 'manual',
        },
      ]);

      expect(serving.grams).toBe(130);
      expect(created.nutritionPerServing).toMatchObject(nutrition);
      expect(logged).toMatchObject({ grams: 130, nutrition: { calories: 650, proteinG: 40 } });
    });

    test('số liệu vô lý (500 kcal trong 10 g) → BE từ chối bằng thông báo tiếng Việt', async () => {
      await newUser();

      await expect(
        nutritionService.createFood({
          name: 'Món vô lý',
          amount: 10,
          unit: 'g',
          nutrition: { calories: 500, proteinG: 1, carbsG: 1, fatG: 1 },
        }),
      ).rejects.toMatchObject({ code: 'BUSINESS', message: expect.stringContaining('kcal') });
    });
  });
});
