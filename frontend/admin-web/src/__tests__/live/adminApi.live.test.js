/**
 * Live test: chạy services/api.js THẬT của Admin Web với backend ASP.NET đang chạy (Docker), không mock.
 * Bật bằng: LIVE_API_URL=http://127.0.0.1:5000/api npx vitest run src/__tests__/live
 * Backend cần chạy ở chế độ live-test (tắt rate limit, tắt SMTP, không bắt xác minh email) như bộ live test mobile.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { api, authStorage } from '../../services/api'

const LIVE_API_URL = process.env.LIVE_API_URL
const describeLive = LIVE_API_URL ? describe : describe.skip

// Tài khoản và form mặc định đúng như LoginView / RecipesView / RewardsView đang dùng.
const ADMIN_EMAIL = 'admin@smartmeal.com'
const ADMIN_PASSWORD = 'Admin@123456'
const WEB_TAG_CODES = ['eatClean', 'keto', 'vegan', 'highProtein', 'quick', 'budget', 'lowCarb', 'vegetarian']

const realFetch = globalThis.fetch
const base = (LIVE_API_URL ?? '').replace(/\/$/, '')
const created = { users: [], recipes: [], challenges: [] }

/** api.js gọi đường dẫn tương đối /api/... (qua proxy Vite / nginx) → chuyển thành URL backend thật. */
function liveFetch(url, init) {
  const target = url.startsWith('/api') ? base + url.slice(4) : url
  return realFetch(target, init)
}

async function raw(path, { method = 'GET', body, token } = {}) {
  const response = await realFetch(base + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const json = await response.json().catch(() => null)
  return { status: response.status, json }
}

async function registerAppUser(label) {
  const email = `admin-live-${label}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`
  const password = 'Passw0rd!'
  const res = await raw('/auth/register', { method: 'POST', body: { email, password, fullName: `Live ${label}` } })
  expect(res.status).toBe(200)
  const user = { id: res.json.data.user.id, email, password, token: res.json.data.token }
  created.users.push(user.id)
  return user
}

const today = () => new Date().toISOString().slice(0, 10)

function recipeForm(title) {
  // = initialFormData của RecipesView + mealTypes đã join như handleSubmit.
  return {
    title, description: 'Món tạo từ live test Admin Web', imageUrl: '', instructions: '1. Sơ chế\n2. Nấu',
    prepTimeMinutes: 10, cookTimeMinutes: 15, servings: 1, difficulty: 'Easy', isPremium: false, mealTypes: 'Lunch,Dinner',
    caloriesPerServing: 350, proteinPerServing: 25, carbsPerServing: 30, fatPerServing: 10, tagCodes: ['eatClean'],
    ingredients: [{ name: 'Ức gà phi lê', category: 'Meat', unit: 'g', amount: 150, caloriesPer100g: 165, proteinPer100g: 31, carbsPer100g: 0, fatPer100g: 3.6, estimatedPriceVnd: 20000 }],
  }
}

describeLive('Admin Web ↔ backend thật (services/api.js)', () => {
  beforeAll(async () => {
    vi.stubGlobal('fetch', liveFetch)
    await api.login(ADMIN_EMAIL, ADMIN_PASSWORD)
  })

  afterAll(async () => {
    for (const id of created.recipes) await api.deleteRecipe(id).catch(() => {})
    for (const id of created.challenges) await api.deleteChallenge(id).catch(() => {})
    for (const id of created.users) await api.deleteUser(id).catch(() => {})
    vi.unstubAllGlobals()
  })

  // Thiết lập toàn cục của test (setup.js) xóa localStorage và stub sau mỗi test → nạp lại phiên admin.
  const ensureSession = async () => {
    vi.stubGlobal('fetch', liveFetch)
    if (!authStorage.getToken()) await api.login(ADMIN_EMAIL, ADMIN_PASSWORD)
  }

  describe('Đăng nhập', () => {
    it('đăng nhập bằng tài khoản admin lưu token + hồ sơ quyền Admin', async () => {
      vi.stubGlobal('fetch', liveFetch)
      const data = await api.login(ADMIN_EMAIL, ADMIN_PASSWORD)

      expect(data.token).toEqual(expect.any(String))
      expect(data.user.role).toBe('Admin')
      expect(authStorage.getToken()).toBe(data.token)
      expect(authStorage.getUser().email).toBe(ADMIN_EMAIL)
    })

    it('sai mật khẩu → lỗi tiếng Việt từ backend', async () => {
      vi.stubGlobal('fetch', liveFetch)

      await expect(api.login(ADMIN_EMAIL, 'Sai-mat-khau-1')).rejects.toThrow('Email hoặc mật khẩu không chính xác.')
    })

    it('tài khoản người dùng thường bị từ chối ở cổng Admin', async () => {
      vi.stubGlobal('fetch', liveFetch)
      const appUser = await registerAppUser('plain')

      await expect(api.login(appUser.email, appUser.password)).rejects.toThrow('Tài khoản của bạn không có quyền Quản trị viên (Admin).')
    })

    it('token không hợp lệ → 401, api.js xóa phiên và phát sự kiện hết phiên', async () => {
      vi.stubGlobal('fetch', liveFetch)
      authStorage.setToken('token-gia')
      const listener = vi.fn()
      window.addEventListener('smartmeal_admin_unauthorized', listener)

      await expect(api.getStats()).rejects.toThrow()

      expect(listener).toHaveBeenCalledTimes(1)
      expect(authStorage.getToken()).toBeNull()
      window.removeEventListener('smartmeal_admin_unauthorized', listener)
    })
  })

  describe('Bảng điều khiển & người dùng', () => {
    it('thống kê tổng quan nhất quán (hoạt động + bị khóa = tổng; đủ 4 bữa; 2 gói)', async () => {
      await ensureSession()
      const stats = await api.getStats()

      expect(stats.activeUsers + stats.lockedUsers).toBe(stats.totalUsers)
      expect(stats.proUsers + stats.freeUsers).toBe(stats.totalUsers)
      expect(Object.keys(stats.recipesByMealType).sort()).toEqual(['Breakfast', 'Dinner', 'Lunch', 'Snack'])
      expect(stats.popularPlans.map((p) => p.id).sort()).toEqual(['PRO_MONTHLY', 'PRO_YEARLY'])
      expect(stats.totalRecipes).toBeGreaterThan(0)
    })

    it('tìm người dùng vừa đăng ký trên app và xem chi tiết', async () => {
      await ensureSession()
      const appUser = await registerAppUser('detail')

      const found = await api.getUsers({ page: 1, pageSize: 15, search: appUser.email, role: '', status: '', subscription: '' })
      const detail = await api.getUserDetail(appUser.id)

      expect(found.items.map((u) => u.id)).toEqual([appUser.id])
      expect(found.total).toBe(1)
      expect(detail.email).toBe(appUser.email)
      expect(detail.healthProfile).toBeNull()
      expect(detail.diariesCount).toBe(0)
    })

    it('UC1: cấm 7 ngày chặn đăng nhập app (423), gỡ cấm thì đăng nhập lại được', async () => {
      await ensureSession()
      const appUser = await registerAppUser('ban')

      await api.banUser(appUser.id, true, 'Spam', 7)
      const banned = await raw('/auth/login', { method: 'POST', body: { email: appUser.email, password: appUser.password } })
      const listed = await api.getUsers({ search: appUser.email, status: 'locked' })
      await api.banUser(appUser.id, false)
      const unbanned = await raw('/auth/login', { method: 'POST', body: { email: appUser.email, password: appUser.password } })

      expect(banned.status).toBe(423)
      expect(listed.items.map((u) => u.id)).toEqual([appUser.id])
      expect(unbanned.status).toBe(200)
    })

    it('UC1: người đang đăng nhập bị cấm thì token và refresh token mất hiệu lực ngay', async () => {
      await ensureSession()
      const appUser = await registerAppUser('ban-session')
      const login = await raw('/auth/login', { method: 'POST', body: { email: appUser.email, password: appUser.password } })
      expect((await raw('/auth/me', { token: login.json.data.token })).status).toBe(200)

      await api.banUser(appUser.id, true, 'Spam', 1)

      expect((await raw('/auth/me', { token: login.json.data.token })).status).toBe(401)
      expect((await raw('/auth/refresh', { method: 'POST', body: { refreshToken: login.json.data.refreshToken } })).status).toBe(401)
    })

    it('UC2: kiểm duyệt đổi tên + đặt lại mật khẩu, người dùng đăng nhập bằng mật khẩu mới', async () => {
      await ensureSession()
      const appUser = await registerAppUser('moderate')

      await api.moderateAccount(appUser.id, { fullName: 'Tên Đã Kiểm Duyệt', isEmailVerified: true, clearLockout: true, role: 'User', resetPassword: 'NewPassw0rd!' })
      const detail = await api.getUserDetail(appUser.id)
      const login = await raw('/auth/login', { method: 'POST', body: { email: appUser.email, password: 'NewPassw0rd!' } })

      expect(detail.fullName).toBe('Tên Đã Kiểm Duyệt')
      expect(login.status).toBe(200)
    })

    it('cấp gói Pro năm rồi hủy — app thấy đúng trạng thái gói', async () => {
      await ensureSession()
      const appUser = await registerAppUser('pro')

      await api.updateUserSubscription(appUser.id, true, 'PRO_YEARLY', 365)
      const granted = await raw('/subscription/status', { token: appUser.token })
      await api.updateUserSubscription(appUser.id, false)
      const revoked = await raw('/subscription/status', { token: appUser.token })

      expect(granted.json.data).toMatchObject({ isPro: true, planId: 'PRO_YEARLY' })
      expect(revoked.json.data).toMatchObject({ isPro: false, status: 'Free' })
    })

    it('xóa người dùng → tài khoản biến mất, token cũ bị từ chối', async () => {
      await ensureSession()
      const appUser = await registerAppUser('delete')

      await api.deleteUser(appUser.id)

      await expect(api.getUserDetail(appUser.id)).rejects.toThrow('Không tìm thấy người dùng.')
      expect((await raw('/auth/me', { token: appUser.token })).status).toBe(401)
      created.users = created.users.filter((id) => id !== appUser.id)
    })
  })

  describe('Món ăn', () => {
    it('vòng đời món ăn từ form Admin: tạo → app thấy → sửa → xóa', async () => {
      await ensureSession()
      const appUser = await registerAppUser('recipe')
      const title = `Live Admin ${Date.now()}`

      const recipe = await api.createRecipe(recipeForm(title))
      created.recipes.push(recipe.id)
      const detail = await api.getRecipeDetail(recipe.id)
      const inApp = await raw(`/recipes/${recipe.id}`, { token: appUser.token })
      await api.updateRecipe(recipe.id, { ...recipeForm(`${title} (sửa)`), difficulty: 'Hard', mealTypes: 'Dinner' })
      const edited = await api.getRecipeDetail(recipe.id)
      await api.deleteRecipe(recipe.id)
      created.recipes = created.recipes.filter((id) => id !== recipe.id)

      expect(detail).toMatchObject({ title, mealTypes: 'Lunch,Dinner', tagCodes: ['eatClean'], totalTimeMinutes: 25 })
      expect(inApp.status).toBe(200)
      expect(inApp.json.data.mealTypes.sort()).toEqual(['Dinner', 'Lunch'])
      expect(edited).toMatchObject({ title: `${title} (sửa)`, difficulty: 'Hard', mealTypes: 'Dinner' })
      await expect(api.getRecipeDetail(recipe.id)).rejects.toThrow('Không tìm thấy món ăn.')
    })

    it('mọi tag trên form Admin đều tồn tại ở backend', async () => {
      await ensureSession()
      // Tag quick chỉ nhận món ≤ 15 phút: 5 phút chuẩn bị + 10 phút nấu.
      const recipe = await api.createRecipe({ ...recipeForm(`Live Tags ${Date.now()}`), prepTimeMinutes: 5, cookTimeMinutes: 10, tagCodes: WEB_TAG_CODES })
      created.recipes.push(recipe.id)

      expect([...recipe.tagCodes].sort()).toEqual([...WEB_TAG_CODES].sort())
    })

    it('gắn tag "Nhanh Gọn" cho món nấu quá 15 phút → backend từ chối kèm lý do', async () => {
      await ensureSession()

      await expect(api.createRecipe({ ...recipeForm(`Live Slow ${Date.now()}`), tagCodes: ['quick'] }))
        .rejects.toThrow(/Nhanh Gọn.*15 phút/)
    })

    it('trùng tên món → thông báo lỗi của backend hiển thị nguyên văn', async () => {
      await ensureSession()
      const recipe = await api.createRecipe(recipeForm(`Live Dup ${Date.now()}`))
      created.recipes.push(recipe.id)

      await expect(api.createRecipe(recipeForm(recipe.title))).rejects.toThrow('Tên món ăn này đã tồn tại trong hệ thống.')
    })

    it('bộ lọc của lưới món ăn (bữa / độ khó / tìm kiếm) trả đúng món', async () => {
      await ensureSession()
      const tag = `LiveFilter${Date.now()}`
      const recipe = await api.createRecipe({ ...recipeForm(tag), difficulty: 'Medium', mealTypes: 'Snack' })
      created.recipes.push(recipe.id)

      const hit = await api.getRecipes({ page: 1, pageSize: 16, search: tag, mealType: 'Snack', difficulty: 'Medium' })
      const miss = await api.getRecipes({ page: 1, pageSize: 16, search: tag, mealType: 'Breakfast', difficulty: '' })

      expect(hit.items.map((r) => r.id)).toEqual([recipe.id])
      expect(miss).toEqual({ items: [], total: 0 })
    })
  })

  describe('Gói, giao dịch, phần thưởng, báo cáo', () => {
    it('gói hội viên trên web trùng giá với gói app bán', async () => {
      await ensureSession()
      const webPlans = await api.getPlans()
      const appPlans = await raw('/subscription/plans')

      const pick = (list) => list.map((p) => [p.id, p.priceVnd]).sort()
      expect(pick(webPlans)).toEqual(pick(appPlans.json.data))
    })

    it('duyệt đơn chuyển khoản SePay đang chờ → người dùng thành Pro', async () => {
      await ensureSession()
      const appUser = await registerAppUser('approve')
      const checkout = await raw('/subscription/create-checkout-session', { method: 'POST', token: appUser.token, body: { planId: 'PRO_MONTHLY', paymentMethod: 'SEPAY' } })
      expect(checkout.status).toBe(200)

      const pending = await api.getTransactions({ page: 1, pageSize: 20, status: 'Pending', search: appUser.email })
      expect(pending.items).toHaveLength(1)
      await api.approveTransaction(pending.items[0].id)
      const status = await raw('/subscription/status', { token: appUser.token })
      const paid = await api.getTransactions({ status: 'Paid', search: appUser.email })

      expect(status.json.data).toMatchObject({ isPro: true, planId: 'PRO_MONTHLY' })
      expect(paid.items.map((t) => t.id)).toEqual([pending.items[0].id])
      await expect(api.approveTransaction(pending.items[0].id)).rejects.toThrow('Giao dịch đã được thanh toán trước đó, không thể duyệt lại.')
    })

    it('thử thách: tạo từ form mặc định → sửa → xóa, app thấy thử thách khi đang mở', async () => {
      await ensureSession()
      const appUser = await registerAppUser('challenge')
      const form = { title: `Live Challenge ${Date.now()}`, description: '', category: 'DrinkWater', durationDays: 7, targetValuePerDay: 2000, rewardExp: 150, rewardBadge: 'Clean Eater', isActive: true }

      const challenge = await api.createChallenge(form)
      created.challenges.push(challenge.id)
      const inApp = await raw(`/gamification/challenges?date=${today()}`, { token: appUser.token })
      await api.updateChallenge(challenge.id, { ...form, title: `${form.title} v2`, isActive: false })
      const list = await api.getChallenges()
      await api.deleteChallenge(challenge.id)
      created.challenges = created.challenges.filter((id) => id !== challenge.id)

      expect(inApp.json.data.map((c) => c.id)).toContain(challenge.id)
      expect(list.find((c) => c.id === challenge.id)).toMatchObject({ title: `${form.title} v2`, isActive: false })
      expect((await api.getChallenges()).map((c) => c.id)).not.toContain(challenge.id)
    })

    it('tặng 600 XP → pet của người dùng lên cấp 2 và có trong nhật ký XP', async () => {
      await ensureSession()
      const appUser = await registerAppUser('xp')

      await api.grantXp(appUser.id, 600, 'Live test')
      const pet = await raw(`/gamification/pet?date=${today()}`, { token: appUser.token })
      const events = await api.getXpEvents()

      expect(pet.json.data).toMatchObject({ totalXp: 600, level: 2 })
      expect(events.some((e) => e.userId === appUser.id && e.xp === 600 && e.kind === 'AdminReward')).toBe(true)
    })

    it('giám sát hệ thống & tương tác thấy bữa ăn người dùng vừa ghi', async () => {
      await ensureSession()
      const appUser = await registerAppUser('activity')
      const log = await raw('/nutritiondiary/log', {
        method: 'POST', token: appUser.token,
        body: { logDate: today(), mealType: 'Dinner', foodName: 'Cá kho', servingSize: 1, unit: 'phần', calories: 333, carbsGrams: 5, fatGrams: 12, proteinGrams: 30, logMethod: 'Manual' },
      })
      expect(log.status).toBe(200)

      const activity = await api.getSystemActivity()
      const engagement = await api.getEngagementAnalytics()

      expect(activity.recentDiaryLogs.some((d) => d.userFullName === 'Live activity' && Math.round(d.calories) === 333)).toBe(true)
      expect(engagement.estimatedDau).toBeGreaterThanOrEqual(1)
      expect(engagement.estimatedMau).toBeGreaterThanOrEqual(engagement.estimatedDau)
    })

    it('báo cáo doanh thu có 7 mốc ngày và tỷ lệ thành công trong 0–100%', async () => {
      await ensureSession()
      const report = await api.getRevenueReport()

      expect(report.revenueByPeriod).toHaveLength(7)
      expect(report.successRatePercentage).toBeGreaterThanOrEqual(0)
      expect(report.successRatePercentage).toBeLessThanOrEqual(100)
      expect(report.successfulTransactions).toBeLessThanOrEqual(report.totalTransactions)
    })

    it('lọc doanh thu theo khoảng ngày trước khi có dữ liệu → 0đ, biểu đồ đủ từng ngày', async () => {
      await ensureSession()
      const report = await api.getRevenueReport('2020-01-01', '2020-01-31')

      expect(report.totalRevenue).toBe(0)
      expect(report.totalTransactions).toBe(0)
      expect(report.revenueByPeriod).toHaveLength(31)
    })

    it('giám sát hệ thống báo trạng thái DB thật và uptime của tiến trình API', async () => {
      await ensureSession()
      const activity = await api.getSystemActivity()

      expect(activity.databaseStatus).toBe('Healthy')
      expect(activity.databaseLatencyMs).toBeGreaterThanOrEqual(0)
      expect(activity.serverUptimeHours).toBeGreaterThanOrEqual(0)
      expect(activity.serverUptimeHours).toBeLessThan(24 * 365)
    })
  })
})
