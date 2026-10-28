import { randomUUID } from 'node:crypto';
import { test as base, expect } from '@playwright/test';

export const API_URL = (process.env.SMARTMEAL_E2E_API_URL || 'http://127.0.0.1:5001/api').replace(/\/$/, '');
export const ADMIN_URL = process.env.SMARTMEAL_E2E_ADMIN_URL || 'http://127.0.0.1:3001';
export const ADMIN = { email: 'admin@smartmeal.com', password: 'Admin@123456' };
export const unique = label => `QA-${label}-${randomUUID()}`;
export const money = value => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value || 0);

// This suite creates and deletes disposable fixtures. Never point it at demo/production.
export function assertQaUrls() {
  for (const address of [API_URL, ADMIN_URL]) {
    const url = new URL(address);
    if (!['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) || ['3000', '5000', '8081', ''].includes(url.port)) {
      throw new Error(`Admin E2E requires a dedicated local QA port: ${address}`);
    }
  }
}

export async function jsonResponse(response) {
  if (!response.ok()) throw new Error(`${response.url()}: ${response.status()} ${await response.text()}`);
  return (await response.json()).data;
}

export function waitApi(page, path, method = 'GET') {
  return page.waitForResponse(response => new URL(response.url()).pathname === `/api${path}` && response.request().method() === method);
}

export async function login(page, credentials = ADMIN) {
  await page.goto(ADMIN_URL);
  await page.locator('input[type="email"]').fill(credentials.email);
  await page.locator('input[type="password"]').fill(credentials.password);
  const stats = waitApi(page, '/admin/stats');
  await page.getByRole('button', { name: 'Đăng Nhập Quản Trị', exact: true }).click();
  const result = await jsonResponse(await stats);
  await expect(page.getByRole('navigation', { name: 'Điều hướng quản trị' })).toBeVisible();
  return result;
}

export async function menu(page, label, path) {
  const response = path ? waitApi(page, path) : null;
  await page.getByRole('navigation').getByRole('button', { name: label, exact: true }).click();
  return response ? jsonResponse(await response) : undefined;
}

export const recipeForm = title => ({
  title, description: 'Disposable system E2E recipe', imageUrl: '', instructions: '1. Sơ chế\n2. Nấu chín',
  prepTimeMinutes: 10, cookTimeMinutes: 15, servings: 1, difficulty: 'Easy', isPremium: false, mealTypes: 'Lunch',
  caloriesPerServing: 350, proteinPerServing: 25, carbsPerServing: 30, fatPerServing: 10, tagCodes: ['eatClean'],
  ingredients: [{ name: 'Ức gà phi lê', category: 'Meat', unit: 'g', amount: 150, caloriesPer100g: 165, proteinPer100g: 31, carbsPer100g: 0, fatPer100g: 3.6, estimatedPriceVnd: 20000 }],
});

export const test = base.extend({
  qa: async ({ request }, use) => {
    assertQaUrls();
    const auth = await request.post(`${API_URL}/admin/auth/login`, { data: ADMIN });
    const session = await jsonResponse(auth);
    const headers = { Authorization: `Bearer ${session.token}` };
    const created = [];
    const call = (path, options = {}) => request.fetch(`${API_URL}${path}`, { ...options, headers: { ...headers, ...options.headers } });
    const qa = {
      call,
      track: (path, id) => { expect(id).toBeTruthy(); created.push(`${path}/${id}`); return id; },
      async user() {
        const email = `${unique('admin-user').toLowerCase()}@example.com`;
        const password = 'Passw0rd!';
        const fullName = unique('Admin fixture');
        const data = await jsonResponse(await request.post(`${API_URL}/auth/register`, { data: { email, password, fullName } }));
        this.track('/admin/users', data.user.id);
        return { ...data.user, token: data.token, email, password, fullName };
      },
      async recipe() {
        const form = recipeForm(unique('Recipe'));
        const data = await jsonResponse(await call('/admin/recipes', { method: 'POST', data: form }));
        this.track('/admin/recipes', data.id);
        return { ...data, title: form.title };
      },
    };
    try {
      await use(qa);
    } finally {
      const failures = [];
      for (const path of created.reverse()) {
        try {
          const response = await call(path, { method: 'DELETE' });
          if (!response.ok() && response.status() !== 404) failures.push(`${path}: ${response.status()} ${await response.text()}`);
        } catch (error) { failures.push(`${path}: ${error.message}`); }
      }
      expect(failures, 'All disposable Admin E2E fixtures must be cleaned up').toEqual([]);
    }
  },
});

export { expect };
