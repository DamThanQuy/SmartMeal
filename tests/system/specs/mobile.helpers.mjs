import { randomUUID } from 'node:crypto';
import { test as base, expect } from '@playwright/test';

const apiUrl = (process.env.SMARTMEAL_E2E_API_URL ?? 'http://127.0.0.1:5001/api').replace(/\/$/, '');
export const password = 'Test@123456';

// Fixtures and persistence assertions go through the real, isolated QA API.
// Never put an access token into browser storage or intercept application requests.
export async function api(request, path, { token, method = 'GET', data } = {}) {
  const target = new URL(apiUrl);
  if (target.protocol !== 'http:' || !['127.0.0.1', 'localhost', '[::1]'].includes(target.hostname) || target.port !== '5001') {
    throw new Error('Mobile E2E fixtures require the isolated HTTP loopback QA API on port 5001.');
  }
  const response = await request.fetch(`${apiUrl}${path}`, {
    method,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    ...(data === undefined ? {} : { data }),
  });
  expect(response.ok(), `${method} ${path}: HTTP ${response.status()}`).toBeTruthy();
  const envelope = await response.json();
  expect(envelope.success, `${method} ${path}: ${envelope.message ?? 'API envelope'}`).toBe(true);
  return envelope.data;
}

export const test = base.extend({
  account: async ({ request }, use, testInfo) => {
    const suffix = randomUUID().replaceAll('-', '').slice(0, 16);
    const email = `mobile-${suffix}@smartmeal.test`;
    const fullName = `QA Mobile ${suffix}`;
    const auth = await api(request, '/auth/register', {
      method: 'POST', data: { email, password, fullName },
    });
    expect(auth.requiresEmailVerification, 'QA must not require SMTP/OTP verification').not.toBe(true);
    expect(auth.token).toBeTruthy();
    const profile = await api(request, '/healthprofile/survey', {
      token: auth.token,
      method: 'POST',
      data: {
        gender: 'Male', dateOfBirth: '2000-06-15', heightCm: 170,
        currentWeightKg: 65, targetWeightKg: 65, activityLevel: 'Light', goal: 'Maintain',
        allergyIds: [], medicalConditionIds: [], dietaryPreferenceIds: [], otherAllergies: '',
      },
    });
    expect(profile.dailyCaloriesTarget).toBeGreaterThan(0);
    testInfo.annotations.push({ type: 'QA account', description: email });
    await use({ email, fullName, password, token: auth.token, userId: auth.user.id, profile });
    // The disposable QA database retains records until orchestration cleanup, for audit evidence.
  },
});

export async function openLogin(page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Tôi đã có tài khoản', exact: true }).click();
  await expect(page.getByText('Chào mừng trở lại', { exact: true })).toBeVisible();
}

export async function login(page, account) {
  await openLogin(page);
  await page.getByLabel('Email', { exact: true }).fill(account.email);
  await page.getByPlaceholder('Nhập mật khẩu', { exact: true }).fill(account.password);
  const responsePromise = page.waitForResponse(response =>
    new URL(response.url()).pathname.endsWith('/auth/login') && response.request().method() === 'POST');
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  const response = await responsePromise;
  expect(response.status()).toBe(200);
  const envelope = await response.json();
  expect(envelope.data.user.id).toBe(account.userId);
  await expect(page.getByRole('button', { name: 'Ghi bữa ăn', exact: true })).toBeVisible();
}

export async function selectTab(page, title) {
  const tab = page.getByRole('tab', { name: new RegExp(title) });
  await tab.click();
  await expect(tab).toHaveAttribute('aria-selected', 'true');
}

export async function browserDate(page) {
  return page.evaluate(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  });
}

export async function openWater(page) {
  await selectTab(page, 'Cá nhân');
  await page.getByRole('button', { name: 'Linh vật & thử thách', exact: true }).click();
  await page.getByRole('button', { name: /Uống.*nước|nước.*ly/i }).click();
  await expect(page.getByRole('button', { name: '+ 200 ml', exact: true })).toBeVisible();
}

export async function evidence(page, testInfo, name) {
  const screenshotPath = testInfo.outputPath(`${name}.png`);
  await page.screenshot({ path: screenshotPath });
  await testInfo.attach(name, { path: screenshotPath, contentType: 'image/png' });
}

export { expect };
