import { test, expect, api, login, openLogin, selectTab, openWater, browserDate, evidence } from './mobile.helpers.mjs';

// Browser E2E of the React Native web app, on Chromium and WebKit mobile viewports.
// Camera, microphone, native notifications and avatar multipart upload are not asserted here.
// Those need device/native coverage; no browser test is labelled as physical iPhone coverage.
test.describe('Mobile web · real QA API', () => {
  test('auth: invalid email and short password block login without a network request', async ({ page, account }) => {
    await openLogin(page);
    const attempts = [];
    page.on('request', request => {
      if (new URL(request.url()).pathname.endsWith('/auth/login') && request.method() === 'POST') attempts.push(request);
    });
    await page.getByLabel('Email', { exact: true }).fill('invalid-email');
    await page.getByPlaceholder('Nhập mật khẩu', { exact: true }).fill('123');
    await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
    await expect(page.getByText('Email không hợp lệ', { exact: true })).toBeVisible();
    await expect(page.getByText('Mật khẩu tối thiểu 8 ký tự', { exact: true })).toBeVisible();
    expect(attempts).toHaveLength(0);
    expect(account.email).toMatch(/@smartmeal\.test$/);
  });

  test('auth: backend rejects a wrong password, then the same account can log in', async ({ page, account }, testInfo) => {
    await openLogin(page);
    await page.getByLabel('Email', { exact: true }).fill(account.email);
    await page.getByPlaceholder('Nhập mật khẩu', { exact: true }).fill('Incorrect@123456');
    const rejected = page.waitForResponse(response =>
      new URL(response.url()).pathname.endsWith('/auth/login') && response.request().method() === 'POST');
    await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
    const response = await rejected;
    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body.success).toBe(false);
    await expect(page.getByText(body.message, { exact: true })).toBeVisible();
    await evidence(page, testInfo, 'wrong-password-error');
    await page.getByPlaceholder('Nhập mật khẩu', { exact: true }).fill(account.password);
    await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Ghi bữa ăn', exact: true })).toBeVisible();
    await selectTab(page, 'Cá nhân');
    await expect(page.getByText(account.fullName, { exact: true })).toBeVisible();
  });

  test('auth: session survives reload; logout removes it across another reload', async ({ page, account }) => {
    await login(page, account);
    await page.reload();
    await expect(page.getByRole('button', { name: 'Ghi bữa ăn', exact: true })).toBeVisible();
    await selectTab(page, 'Cá nhân');
    await page.getByRole('button', { name: 'Đăng xuất', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Tôi đã có tài khoản', exact: true })).toBeVisible();
    await page.reload();
    await expect(page.getByRole('button', { name: 'Tôi đã có tài khoản', exact: true })).toBeVisible();
    await expect(page.getByRole('tab', { name: /Nhật ký/ })).toHaveCount(0);
  });

  test('dashboard: real calorie target and all five main tabs render their own content', async ({ page, account }) => {
    await login(page, account);
    const target = Math.round(account.profile.dailyCaloriesTarget).toLocaleString('vi-VN');
    await expect(page.getByRole('button', { name: `Năng lượng hôm nay: 0 trên ${target} kcal. Xem nhật ký`, exact: true })).toBeVisible();
    await expect(page.getByText('Bữa ăn hôm nay', { exact: true })).toBeVisible();
    await selectTab(page, 'Thực đơn');
    await expect(page.getByRole('button', { name: 'Tạo danh sách đi chợ', exact: true })).toBeVisible();
    await selectTab(page, 'Khám phá');
    await expect(page.getByPlaceholder('Tìm món, nguyên liệu…', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Công thức đã lưu', exact: true })).toBeVisible();
    await selectTab(page, 'Nhật ký');
    await expect(page.getByRole('button', { name: 'Biểu đồ tiến độ', exact: true })).toBeVisible();
    await selectTab(page, 'Cá nhân');
    await expect(page.getByText(account.fullName, { exact: true })).toBeVisible();
    await selectTab(page, 'Trang chủ');
    await expect(page.getByRole('button', { name: 'Tìm món', exact: true })).toBeVisible();
  });

  test('diary: search a real food, change meal, double serving and persist exact nutrition', async ({ page, request, account }, testInfo) => {
    const foodName = `QA Cơm ${account.userId.slice(0, 8)}`;
    const food = await api(request, '/foods', {
      token: account.token, method: 'POST',
      data: {
        name: foodName, category: 'Dish', caloriesPer100g: 150, carbsPer100g: 25,
        fatPer100g: 2, proteinPer100g: 8, fiberPer100g: 1, sugarPer100g: 0, sodiumMgPer100g: 10,
        servings: [{ label: '1 phần QA', grams: 100, isDefault: true }],
      },
    });
    await login(page, account);
    const date = await browserDate(page);
    await page.getByRole('button', { name: 'Tìm món', exact: true }).click();
    await page.getByPlaceholder('Tìm món ăn...', { exact: true }).fill(foodName);
    await page.getByRole('button', { name: `Thêm ${foodName}`, exact: true }).click();
    await expect(page.getByText('Chi tiết món', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Trưa', exact: true }).click();
    // RN Web does not expose aria-selected for a button-role chip. Assert the resulting meal action;
    // the persisted Lunch group below also verifies that this selection changed application state.
    await expect(page.getByRole('button', { name: /^Thêm vào Bữa trưa ·/ })).toBeVisible();
    await page.getByRole('button', { name: '1 phần QA (100 g)', exact: true }).click();
    await page.getByRole('button', { name: 'Tăng', exact: true }).click();
    await evidence(page, testInfo, 'diary-selected-meal-and-serving');
    await page.getByRole('button', { name: 'Thêm vào Bữa trưa · 300 kcal', exact: true }).click();
    await expect(page.getByRole('button', { name: `Sửa ${foodName}`, exact: true })).toBeVisible();
    await expect.poll(async () => {
      const diary = await api(request, `/nutritiondiary/daily?date=${date}`, { token: account.token });
      return diary.meals.flatMap(meal => meal.items).find(item => item.ingredientId === food.id);
    }).toMatchObject({ foodName, mealType: 'Lunch', calories: 300, carbsGrams: 50, fatGrams: 4, proteinGrams: 16 });
    await page.reload();
    await expect(page.getByRole('button', { name: 'Ghi bữa ăn', exact: true })).toBeVisible();
    await selectTab(page, 'Nhật ký');
    await expect(page.getByRole('button', { name: `Sửa ${foodName}`, exact: true })).toBeVisible();
  });

  test('water: add a cup, verify server record, undo and verify the record is removed', async ({ page, request, account }, testInfo) => {
    await login(page, account);
    const date = await browserDate(page);
    await openWater(page);
    const waterPath = `/nutritiondiary/water?date=${date}&days=1`;
    const before = await api(request, waterPath, { token: account.token });
    expect(before.days[0].totalMl).toBe(0);
    await page.getByRole('button', { name: '+ 200 ml', exact: true }).click();
    await expect(page.getByText('200 ml', { exact: true })).toBeVisible();
    await expect.poll(async () => (await api(request, waterPath, { token: account.token })).days[0].totalMl).toBe(200);
    const saved = await api(request, waterPath, { token: account.token });
    expect(saved.days[0].entries).toHaveLength(1);
    expect(saved.days[0].entries[0].amountMl).toBe(200);
    await evidence(page, testInfo, 'water-200ml-saved');
    await page.getByRole('button', { name: 'Hoàn tác', exact: true }).click();
    await expect(page.getByText('Chưa ghi lần uống nước nào hôm nay.', { exact: true })).toBeVisible();
    await expect.poll(async () => (await api(request, waterPath, { token: account.token })).days[0].entries).toHaveLength(0);
  });

  test('recipes: open ingredients and instructions, favorite and find the saved recipe after reload', async ({ page, request, account }, testInfo) => {
    const recipes = await api(request, '/recipes', { token: account.token });
    const recipe = recipes.find(item => !item.isPremium && item.ingredients.length > 0);
    expect(recipe, 'QA seed must contain a free recipe with ingredients').toBeTruthy();
    await login(page, account);
    await selectTab(page, 'Khám phá');
    await page.getByPlaceholder('Tìm món, nguyên liệu…', { exact: true }).fill(recipe.title);
    await page.getByRole('button', { name: recipe.title, exact: true }).click();
    await expect(page.getByText(recipe.title, { exact: true }).filter({ visible: true })).toBeVisible();
    await expect(page.getByText(recipe.ingredients[0].name, { exact: true })).toBeVisible();
    await expect(page.getByText('Cách làm', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Yêu thích', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Bỏ yêu thích', exact: true })).toBeVisible();
    await expect.poll(async () => (await api(request, '/recipes/favorites', { token: account.token })).map(item => item.id)).toContain(recipe.id);
    await evidence(page, testInfo, 'recipe-detail-favorited');
    await page.reload();
    await expect(page.getByRole('button', { name: 'Ghi bữa ăn', exact: true })).toBeVisible();
    await selectTab(page, 'Khám phá');
    await page.getByRole('button', { name: 'Công thức đã lưu', exact: true }).click();
    await page.getByRole('button', { name: 'Yêu thích (1)', exact: true }).click();
    await expect(page.getByRole('button', { name: recipe.title, exact: true })).toBeVisible();
  });

  test('profile: edited name persists in API and after a browser reload', async ({ page, request, account }, testInfo) => {
    await login(page, account);
    await selectTab(page, 'Cá nhân');
    await page.getByRole('button', { name: 'Cài đặt', exact: true }).click();
    await page.getByRole('button', { name: 'Chỉnh sửa hồ sơ', exact: true }).click();
    const updatedName = `QA Đã Sửa ${account.userId.slice(0, 8)}`;
    await page.getByLabel('Họ tên', { exact: true }).fill(updatedName);
    await page.getByRole('button', { name: 'Lưu thay đổi', exact: true }).click();
    await expect(page.getByText(updatedName, { exact: true }).filter({ visible: true })).toBeVisible();
    await expect.poll(async () => (await api(request, '/auth/me', { token: account.token })).fullName).toBe(updatedName);
    await evidence(page, testInfo, 'profile-name-saved');
    await page.reload();
    await expect(page.getByRole('button', { name: 'Ghi bữa ăn', exact: true })).toBeVisible();
    await selectTab(page, 'Cá nhân');
    await expect(page.getByText(updatedName, { exact: true })).toBeVisible();
  });
});
