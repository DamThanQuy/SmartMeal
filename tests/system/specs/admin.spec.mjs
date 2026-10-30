import { test, expect, API_URL, ADMIN_URL, ADMIN, assertQaUrls, unique, money, jsonResponse, waitApi, login, menu } from './admin.helpers.mjs';

test.beforeEach(() => assertQaUrls());

const userRow = (page, user) => page.getByRole('row').filter({ hasText: user.email });
const recipeCard = (page, title) => page.locator('.card').filter({ has: page.getByRole('heading', { name: title, exact: true }) });
const metric = (page, label) => page.locator('.stat-card').filter({ hasText: label }).locator('.stat-value');

async function findUser(page, user) {
  await menu(page, 'Quản Lý Người Dùng', '/admin/users');
  await page.getByPlaceholder('Tìm theo email, họ tên...').fill(user.email);
  await expect(userRow(page, user)).toHaveCount(1);
}

async function findRecipe(page, title) {
  await menu(page, 'Quản Lý Món Ăn', '/admin/recipes');
  await page.getByPlaceholder('Tìm theo tên món ăn, mô tả...').fill(title);
  await expect(recipeCard(page, title)).toHaveCount(1);
}

test('Admin rejects an incorrect password without storing a session', async ({ page }) => {
  await page.goto(ADMIN_URL);
  await page.locator('input[type="email"]').fill(ADMIN.email);
  await page.locator('input[type="password"]').fill('Incorrect-E2E-Password!');
  const response = waitApi(page, '/admin/auth/login', 'POST');
  await page.getByRole('button', { name: 'Đăng Nhập Quản Trị', exact: true }).click();
  expect((await response).status()).toBe(401);
  await expect(page.getByText('Email hoặc mật khẩu không chính xác.', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('smartmeal_admin_token'))).toBeNull();
});

test('Admin dashboard renders real API metrics, persists login, and logs out', async ({ page }, testInfo) => {
  const stats = await login(page);
  const formatted = await page.evaluate(value => value.toLocaleString(), stats.totalUsers);
  await expect(metric(page, 'Tổng Người Dùng')).toHaveText(formatted);
  await expect(metric(page, 'Doanh Thu Thành Viên')).toHaveText(money(stats.totalRevenueVnd));
  const reload = waitApi(page, '/admin/stats');
  await page.reload();
  await jsonResponse(await reload);
  await expect(page.getByRole('navigation')).toBeVisible();
  await expect(metric(page, 'Doanh Thu Thành Viên')).toHaveText(money(stats.totalRevenueVnd));
  const shot = testInfo.outputPath('admin-dashboard.png');
  await page.screenshot({ path: shot });
  await testInfo.attach('dashboard', { path: shot, contentType: 'image/png' });
  await page.getByRole('button', { name: 'Đăng xuất', exact: true }).click();
  await expect(page.locator('input[type="email"]')).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('smartmeal_admin_token'))).toBeNull();
});

test('Admin searches a new app user and opens their real profile', async ({ page, qa }) => {
  const user = await qa.user();
  await login(page);
  await findUser(page, user);
  const response = waitApi(page, `/admin/users/${user.id}`);
  await userRow(page, user).getByTitle('Xem chi tiết & Hồ sơ sức khỏe').click();
  const detail = await jsonResponse(await response);
  expect(detail.email).toBe(user.email);
  const modal = page.locator('.modal-content');
  await expect(modal.getByRole('heading', { name: `Hồ Sơ Chi Tiết: ${user.fullName}` })).toBeVisible();
  await expect(modal).toContainText(user.email);
  await expect(modal).toContainText('Người dùng chưa hoàn thiện hồ sơ sức khỏe.');
});

test('Admin changes a disposable user role and cancels destructive deletion', async ({ page, qa }) => {
  const user = await qa.user();
  await login(page);
  await findUser(page, user);
  await userRow(page, user).getByTitle('Bấm để đổi quyền').click();
  await expect(page.getByRole('alertdialog')).toContainText(user.fullName);
  const change = waitApi(page, `/admin/users/${user.id}/role`, 'PUT');
  await page.getByRole('alertdialog').getByRole('button', { name: 'Đổi thành Admin', exact: true }).click();
  await jsonResponse(await change);
  await expect(userRow(page, user).getByTitle('Bấm để đổi quyền')).toContainText('Admin');
  expect((await jsonResponse(await qa.call(`/admin/users/${user.id}`))).role).toBe('Admin');
  await userRow(page, user).getByTitle('Xóa người dùng', { exact: true }).click();
  const confirm = page.getByRole('alertdialog');
  await expect(confirm.getByRole('button', { name: 'Hủy', exact: true })).toBeFocused();
  await confirm.getByRole('button', { name: 'Hủy', exact: true }).click();
  await expect(confirm).toHaveCount(0);
  expect((await jsonResponse(await qa.call(`/admin/users/${user.id}`))).email).toBe(user.email);
  await expect(userRow(page, user)).toBeVisible();
});

test('Admin bans and unbans a QA user, changing actual mobile login access', async ({ page, qa, request }) => {
  const user = await qa.user();
  await login(page);
  await findUser(page, user);
  await userRow(page, user).getByTitle('Cấm tài khoản (Ban User)', { exact: true }).click();
  await page.locator('.modal-content textarea').fill('Disposable E2E account restriction');
  const ban = waitApi(page, `/admin/users/${user.id}/ban`, 'PUT');
  await page.getByRole('button', { name: 'Xác Nhận Ban Tài Khoản', exact: true }).click();
  await jsonResponse(await ban);
  await expect(userRow(page, user)).toContainText('Đang bị khóa');
  const credentials = { email: user.email, password: user.password };
  expect((await request.post(`${API_URL}/auth/login`, { data: credentials })).status()).toBe(423);
  await userRow(page, user).getByTitle('Quản lý cấm / Mở cấm (Unban)', { exact: true }).click();
  const unban = waitApi(page, `/admin/users/${user.id}/ban`, 'PUT');
  await page.getByRole('button', { name: 'Xác Nhận Mở Cấm (Unban)', exact: true }).click();
  await jsonResponse(await unban);
  await expect(userRow(page, user).getByTitle('Cấm tài khoản (Ban User)', { exact: true })).toBeVisible();
  const mobileSession = await jsonResponse(await request.post(`${API_URL}/auth/login`, { data: credentials }));
  expect(mobileSession.user.id).toBe(user.id);
});

test('Admin creates a recipe in UI and the mobile recipe API sees persisted ingredients', async ({ page, qa, request }) => {
  const user = await qa.user();
  const title = unique('UI recipe');
  await login(page);
  await menu(page, 'Quản Lý Món Ăn', '/admin/recipes');
  await page.getByRole('button', { name: 'Thêm Món Ăn Mới', exact: true }).click();
  await page.getByPlaceholder('VD: Salad ức gà sốt mè rang bơ sáp').fill(title);
  await page.getByPlaceholder('Giới thiệu hương vị, lợi ích sức khỏe và nguyên liệu chính...').fill('Created through actual Admin UI');
  await page.locator('.modal-content textarea').last().fill('1. Sơ chế sạch\n2. Nấu chín');
  const response = waitApi(page, '/admin/recipes', 'POST');
  await page.getByRole('button', { name: 'Tạo Món Ăn Mới', exact: true }).click();
  const created = await jsonResponse(await response);
  qa.track('/admin/recipes', created.id);
  await expect(page.locator('.modal-content')).toHaveCount(0);
  await page.getByPlaceholder('Tìm theo tên món ăn, mô tả...').fill(title);
  await expect(recipeCard(page, title)).toBeVisible();
  const detail = await jsonResponse(await request.get(`${API_URL}/recipes/${created.id}`, { headers: { Authorization: `Bearer ${user.token}` } }));
  expect(detail.title).toBe(title);
  expect(detail.ingredients).toEqual(expect.arrayContaining([expect.objectContaining({ name: 'Ức gà phi lê', amount: 150 })]));
  const reload = waitApi(page, '/admin/recipes');
  await page.reload();
  await jsonResponse(await reload);
  await page.getByPlaceholder('Tìm theo tên món ăn, mô tả...').fill(title);
  await expect(recipeCard(page, title)).toBeVisible();
});

test('Admin edits a recipe, cancels delete with Escape, then confirms deletion', async ({ page, qa }) => {
  const recipe = await qa.recipe();
  const updatedTitle = unique('Edited recipe');
  await login(page);
  await findRecipe(page, recipe.title);
  await recipeCard(page, recipe.title).getByRole('button', { name: 'Sửa', exact: true }).click();
  await page.getByPlaceholder('VD: Salad ức gà sốt mè rang bơ sáp').fill(updatedTitle);
  const save = waitApi(page, `/admin/recipes/${recipe.id}`, 'PUT');
  await page.getByRole('button', { name: 'Lưu Thay Đổi', exact: true }).click();
  await jsonResponse(await save);
  expect((await jsonResponse(await qa.call(`/admin/recipes/${recipe.id}`))).title).toBe(updatedTitle);
  await page.getByPlaceholder('Tìm theo tên món ăn, mô tả...').fill(updatedTitle);
  await recipeCard(page, updatedTitle).getByRole('button', { name: 'Xóa món ăn', exact: true }).click();
  await expect(page.getByRole('alertdialog')).toContainText(updatedTitle);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('alertdialog')).toHaveCount(0);
  expect((await qa.call(`/admin/recipes/${recipe.id}`)).ok()).toBeTruthy();
  await recipeCard(page, updatedTitle).getByRole('button', { name: 'Xóa món ăn', exact: true }).click();
  const removal = waitApi(page, `/admin/recipes/${recipe.id}`, 'DELETE');
  await page.getByRole('alertdialog').getByRole('button', { name: 'Xóa món', exact: true }).click();
  await jsonResponse(await removal);
  await expect(recipeCard(page, updatedTitle)).toHaveCount(0);
  expect((await qa.call(`/admin/recipes/${recipe.id}`)).status()).toBe(404);
});

test('Admin creates, updates, and deletes a disposable reward challenge', async ({ page, qa }) => {
  const title = unique('Challenge');
  await login(page);
  await menu(page, 'Hệ Thống Phần Thưởng', '/admin/rewards/challenges');
  await page.getByRole('button', { name: 'Thêm Thử Thách Mới', exact: true }).click();
  const titleInput = page.getByPlaceholder('VD: 7 Ngày Ăn Sạch Sống Xanh, 2 Lít Nước Mỗi Ngày...');
  await titleInput.fill(title);
  const create = waitApi(page, '/admin/rewards/challenges', 'POST');
  await page.getByRole('button', { name: 'Tạo Thử Thách', exact: true }).click();
  const challenge = await jsonResponse(await create);
  qa.track('/admin/rewards/challenges', challenge.id);
  const row = () => page.getByRole('row').filter({ hasText: title });
  await expect(row()).toBeVisible();
  await row().getByTitle('Chỉnh sửa thử thách').click();
  await titleInput.fill(`${title} edited`);
  const update = waitApi(page, `/admin/rewards/challenges/${challenge.id}`, 'PUT');
  await page.getByRole('button', { name: 'Lưu Cập Nhật', exact: true }).click();
  await jsonResponse(await update);
  await expect(row()).toContainText(`${title} edited`);
  const persisted = await jsonResponse(await qa.call('/admin/rewards/challenges'));
  expect(persisted.find(item => item.id === challenge.id).title).toBe(`${title} edited`);
  await row().getByTitle('Xóa thử thách').click();
  const removal = waitApi(page, `/admin/rewards/challenges/${challenge.id}`, 'DELETE');
  await page.getByRole('alertdialog').getByRole('button', { name: 'Xóa thử thách', exact: true }).click();
  await jsonResponse(await removal);
  await expect(row()).toHaveCount(0);
  expect((await jsonResponse(await qa.call('/admin/rewards/challenges'))).some(item => item.id === challenge.id)).toBe(false);
});

test('Subscription menu shows actual plans and transaction results', async ({ page }) => {
  await login(page);
  const transactionsResponse = waitApi(page, '/admin/transactions');
  const plans = await menu(page, 'Gói Member & Giao Dịch', '/admin/plans');
  const transactions = await jsonResponse(await transactionsResponse);
  expect(plans.map(plan => plan.id).sort()).toEqual(['PRO_MONTHLY', 'PRO_YEARLY']);
  for (const plan of plans) {
    const card = page.locator('.card').filter({ has: page.getByRole('heading', { name: plan.name, exact: true }) });
    await expect(card).toContainText(money(plan.priceVnd));
    await expect(card).toContainText(`${plan.durationDays} ngày`);
  }
  await expect(page.getByRole('heading', { name: 'Quản Lý Giao Dịch & Thanh Toán VietQR', exact: true })).toBeVisible();
  expect(Array.isArray(transactions)).toBe(true);
  await expect(page.locator('main')).not.toContainText('Đang tải');
  if (transactions.length === 0) {
    await expect(page.getByRole('cell', { name: 'Không tìm thấy giao dịch nào.', exact: true })).toBeVisible();
  } else {
    for (const transaction of transactions) {
      const row = page.getByRole('row').filter({ hasText: transaction.sessionId });
      await expect(row).toContainText(transaction.userEmail);
      await expect(row).toContainText(money(transaction.amountVnd));
    }
  }
});

test('Revenue menu renders API totals and applies a real date filter', async ({ page }) => {
  await login(page);
  const data = await menu(page, 'Báo Cáo Doanh Thu', '/admin/reports/revenue');
  await expect(metric(page, 'Tổng Doanh Thu Đã Thu')).toHaveText(money(data.totalRevenue));
  await expect(metric(page, 'Tỷ Lệ Thanh Toán Thành Công')).toHaveText(`${data.successRatePercentage || 0}%`);
  await page.locator('input[type="date"]').first().fill('2026-01-01');
  await page.locator('input[type="date"]').last().fill('2026-12-31');
  const filtered = waitApi(page, '/admin/reports/revenue');
  await page.getByRole('button', { name: /Lọc/ }).click();
  const response = await filtered;
  expect(new URL(response.url()).searchParams.get('startDate')).toBe('2026-01-01');
  const result = await jsonResponse(response);
  await expect(metric(page, 'Tổng Doanh Thu Đã Thu')).toHaveText(money(result.totalRevenue));
});

test('Engagement and system menus show real analytics and database health', async ({ page }) => {
  await login(page);
  const engagement = await menu(page, 'Phân Tích Tương Tác', '/admin/reports/engagement');
  await expect(metric(page, 'DAU (Hoạt Động Hằng Ngày)')).toHaveText(String(engagement.estimatedDau || 0));
  await expect(metric(page, 'MAU (Hoạt Động Hằng Tháng)')).toHaveText(String(engagement.estimatedMau || 0));
  const activity = await menu(page, 'Giám Sát Hệ Thống', '/admin/system/activity');
  expect(activity.databaseStatus).toBe('Healthy');
  await expect(metric(page, 'Cơ Sở Dữ Liệu PostgreSQL')).toHaveText(activity.databaseStatus);
  await expect(metric(page, 'Yêu Cầu AI Hôm Nay')).toHaveText(String(activity.totalAiRequestsToday || 0));
  const refresh = waitApi(page, '/admin/system/activity');
  await page.getByRole('button', { name: 'Làm mới dữ liệu', exact: true }).click();
  expect((await jsonResponse(await refresh)).databaseStatus).toBe(activity.databaseStatus);
});

test('Admin navigation survives F5, Back and Forward at a tablet viewport', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 900 });
  await login(page);
  await menu(page, 'Quản Lý Người Dùng', '/admin/users');
  await expect(page).toHaveURL(/#\/users$/);
  const reload = waitApi(page, '/admin/users');
  await page.reload();
  await jsonResponse(await reload);
  await expect(page.getByPlaceholder('Tìm theo email, họ tên...')).toBeVisible();
  await menu(page, 'Quản Lý Món Ăn', '/admin/recipes');
  await expect(page).toHaveURL(/#\/recipes$/);
  await page.goBack();
  await expect(page).toHaveURL(/#\/users$/);
  await expect(page.getByRole('navigation').getByRole('button', { name: 'Quản Lý Người Dùng', exact: true })).toHaveAttribute('aria-current', 'page');
  await page.goForward();
  await expect(page).toHaveURL(/#\/recipes$/);
  await expect(page.getByPlaceholder('Tìm theo tên món ăn, mô tả...')).toBeVisible();
});
