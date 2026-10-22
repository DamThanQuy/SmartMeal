import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api, authStorage } from '../../services/api'

function jsonResponse(body, status = 200, headers = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers(headers),
    json: async () => body,
  }
}

function brokenJsonResponse(status) {
  return {
    ok: false,
    status,
    json: async () => {
      throw new SyntaxError('Unexpected token <')
    },
  }
}

let fetchMock

beforeEach(() => {
  fetchMock = vi.fn(async () => jsonResponse({ success: true, data: { ok: true } }))
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

const lastCall = () => fetchMock.mock.calls.at(-1)
const lastUrl = () => lastCall()[0]
const lastInit = () => lastCall()[1]
const lastBody = () => JSON.parse(lastInit().body)

describe('authStorage', () => {
  it('lưu và đọc token, thông tin admin', () => {
    authStorage.setToken('tok-1')
    authStorage.setUser({ id: 'u1', fullName: 'Admin' })

    expect(authStorage.getToken()).toBe('tok-1')
    expect(authStorage.getUser()).toEqual({ id: 'u1', fullName: 'Admin' })
  })

  it('trả null khi chưa đăng nhập hoặc dữ liệu user bị hỏng', () => {
    expect(authStorage.getUser()).toBeNull()

    localStorage.setItem('smartmeal_admin_user', '{không phải json')
    expect(authStorage.getUser()).toBeNull()
  })

  it('clear() xóa cả token lẫn user', () => {
    authStorage.setToken('tok')
    authStorage.setUser({ id: 'u' })

    authStorage.clear()

    expect(authStorage.getToken()).toBeNull()
    expect(authStorage.getUser()).toBeNull()
  })
})

describe('request — header, lỗi và phiên hết hạn', () => {
  it('gửi JSON và gắn Bearer token khi đã đăng nhập', async () => {
    authStorage.setToken('abc')

    await api.getStats()

    expect(lastUrl()).toBe('/api/admin/stats')
    expect(lastInit().headers).toMatchObject({ 'Content-Type': 'application/json', Authorization: 'Bearer abc' })
  })

  it('không gửi header Authorization khi chưa có token', async () => {
    await api.getStats()

    expect(lastInit().headers.Authorization).toBeUndefined()
  })

  it('ném lỗi với message của backend', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ success: false, message: 'Tên món ăn này đã tồn tại trong hệ thống.' }, 400))

    await expect(api.createRecipe({ title: 'Phở' })).rejects.toThrow('Tên món ăn này đã tồn tại trong hệ thống.')
  })

  it('ghép danh sách errors khi backend không có message', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ success: false, errors: ['Title: bắt buộc', 'Servings: > 0'] }, 400))

    await expect(api.createRecipe({})).rejects.toThrow('Title: bắt buộc, Servings: > 0')
  })

  it('dùng thông báo mặc định kèm mã HTTP khi body không phải JSON', async () => {
    fetchMock.mockResolvedValueOnce(brokenJsonResponse(502))

    await expect(api.getUsers()).rejects.toThrow('Lỗi yêu cầu (502)')
  })

  it('401: xóa phiên đăng nhập và phát sự kiện smartmeal_admin_unauthorized', async () => {
    authStorage.setToken('expired')
    authStorage.setUser({ id: 'u' })
    const listener = vi.fn()
    window.addEventListener('smartmeal_admin_unauthorized', listener)
    fetchMock.mockResolvedValueOnce(jsonResponse({ success: false, message: 'Phiên đăng nhập đã hết hạn.' }, 401))

    await expect(api.getStats()).rejects.toThrow('Phiên đăng nhập đã hết hạn.')

    expect(authStorage.getToken()).toBeNull()
    expect(authStorage.getUser()).toBeNull()
    expect(listener).toHaveBeenCalledTimes(1)
    window.removeEventListener('smartmeal_admin_unauthorized', listener)
  })

  it('403 không xóa phiên đăng nhập', async () => {
    authStorage.setToken('tok')
    fetchMock.mockResolvedValueOnce(jsonResponse({ success: false, message: 'Bạn không có quyền.' }, 403))

    await expect(api.getStats()).rejects.toThrow('Bạn không có quyền.')
    expect(authStorage.getToken()).toBe('tok')
  })
})

describe('api.login', () => {
  it('lưu token + user khi đăng nhập thành công và trả data', async () => {
    const data = { token: 'jwt-1', user: { id: 'a1', fullName: 'Admin', role: 'Admin' } }
    fetchMock.mockResolvedValueOnce(jsonResponse({ success: true, data }))

    const result = await api.login('admin@smartmeal.com', 'Secret@123')

    expect(lastUrl()).toBe('/api/admin/auth/login')
    expect(lastInit().method).toBe('POST')
    expect(lastBody()).toEqual({ email: 'admin@smartmeal.com', password: 'Secret@123' })
    expect(result).toEqual(data)
    expect(authStorage.getToken()).toBe('jwt-1')
    expect(authStorage.getUser()).toEqual(data.user)
  })

  it('không lưu gì khi backend không trả token', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ success: true, data: null }))

    await api.login('a@b.c', 'x')

    expect(authStorage.getToken()).toBeNull()
  })

  it('không gửi token cũ khi đăng nhập', async () => {
    authStorage.setToken('stale-token')

    await api.login('admin@smartmeal.com', 'Secret@123')

    expect(lastInit().headers.Authorization).toBeUndefined()
  })

  it('sai mật khẩu (401) chỉ ném lỗi đăng nhập, không phát sự kiện hết phiên', async () => {
    const listener = vi.fn()
    window.addEventListener('smartmeal_admin_unauthorized', listener)
    fetchMock.mockResolvedValueOnce(jsonResponse({ success: false, message: 'Email hoặc mật khẩu không chính xác.' }, 401))

    await expect(api.login('admin@smartmeal.com', 'sai')).rejects.toThrow('Email hoặc mật khẩu không chính xác.')

    expect(listener).not.toHaveBeenCalled()
    window.removeEventListener('smartmeal_admin_unauthorized', listener)
  })
})

describe('danh sách phân trang (getUsers / getRecipes / getTransactions)', () => {
  it.each(['getUsers', 'getRecipes', 'getTransactions'])('%s trả { items, total } với total từ header X-Total-Count', async (fn) => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ success: true, data: [{ id: 'a' }, { id: 'b' }] }, 200, { 'X-Total-Count': '56' }))

    await expect(api[fn]({ page: 1, pageSize: 2 })).resolves.toEqual({ items: [{ id: 'a' }, { id: 'b' }], total: 56 })
  })

  it('thiếu header tổng số thì total = số bản ghi đã nhận; không có data thì danh sách rỗng', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ success: true, data: [{ id: 'a' }] }))
    await expect(api.getUsers()).resolves.toEqual({ items: [{ id: 'a' }], total: 1 })

    fetchMock.mockResolvedValueOnce(jsonResponse({ success: true, data: null }, 200, { 'X-Total-Count': '0' }))
    await expect(api.getRecipes()).resolves.toEqual({ items: [], total: 0 })
  })
})

describe('api — URL, phương thức và payload của từng chức năng', () => {
  it.each([
    ['getStats', 'GET', '/api/admin/stats', []],
    ['getUserDetail', 'GET', '/api/admin/users/u1', ['u1']],
    ['deleteUser', 'DELETE', '/api/admin/users/u1', ['u1']],
    ['getRecipeDetail', 'GET', '/api/admin/recipes/r1', ['r1']],
    ['deleteRecipe', 'DELETE', '/api/admin/recipes/r1', ['r1']],
    ['getPlans', 'GET', '/api/admin/plans', []],
    ['approveTransaction', 'PUT', '/api/admin/transactions/t1/approve', ['t1']],
    ['getChallenges', 'GET', '/api/admin/rewards/challenges', []],
    ['deleteChallenge', 'DELETE', '/api/admin/rewards/challenges/c1', ['c1']],
    ['getBadges', 'GET', '/api/admin/rewards/badges', []],
    ['getXpEvents', 'GET', '/api/admin/rewards/xp-events', []],
    ['getSystemActivity', 'GET', '/api/admin/system/activity', []],
    ['getEngagementAnalytics', 'GET', '/api/admin/reports/engagement', []],
  ])('%s gọi %s %s', async (fn, method, url, args) => {
    await api[fn](...args)

    expect(lastUrl()).toBe(url)
    expect(lastInit().method ?? 'GET').toBe(method)
  })

  it('getUsers / getRecipes / getTransactions chuyển params thành query string', async () => {
    await api.getUsers({ page: 2, pageSize: 15, search: 'an', role: 'Admin' })
    expect(lastUrl()).toBe('/api/admin/users?page=2&pageSize=15&search=an&role=Admin')

    await api.getRecipes({ mealType: 'Dinner', difficulty: '' })
    expect(lastUrl()).toBe('/api/admin/recipes?mealType=Dinner&difficulty=')

    await api.getTransactions({ status: 'Pending' })
    expect(lastUrl()).toBe('/api/admin/transactions?status=Pending')
  })

  it('các hàm danh sách trả mảng rỗng khi backend không có data', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ success: true, data: null }))

    for (const fn of ['getPlans', 'getChallenges', 'getBadges', 'getXpEvents']) {
      await expect(api[fn]()).resolves.toEqual([])
    }
  })

  it('updateUserStatus / updateUserRole gửi đúng body', async () => {
    await api.updateUserStatus('u1', true, 'Spam')
    expect(lastInit().method).toBe('PUT')
    expect(lastUrl()).toBe('/api/admin/users/u1/status')
    expect(lastBody()).toEqual({ isLocked: true, reason: 'Spam' })

    await api.updateUserRole('u1', 'Admin')
    expect(lastUrl()).toBe('/api/admin/users/u1/role')
    expect(lastBody()).toEqual({ role: 'Admin' })
  })

  it('updateUserSubscription: cấp Pro (mặc định gói tháng 30 ngày) và hủy Pro', async () => {
    await api.updateUserSubscription('u1', true)
    expect(lastBody()).toEqual({ isPro: true, planId: 'PRO_MONTHLY', durationDays: 30, status: 'Premium' })

    await api.updateUserSubscription('u1', true, 'PRO_YEARLY', 365)
    expect(lastBody()).toEqual({ isPro: true, planId: 'PRO_YEARLY', durationDays: 365, status: 'Premium' })

    await api.updateUserSubscription('u1', false)
    expect(lastBody()).toMatchObject({ isPro: false, status: 'Free' })
  })

  it('banUser: cấm vĩnh viễn gửi durationDays = null, gỡ cấm gửi isBanned = false', async () => {
    await api.banUser('u1', true, 'Gian lận')
    expect(lastUrl()).toBe('/api/admin/users/u1/ban')
    expect(lastBody()).toEqual({ isBanned: true, reason: 'Gian lận', durationDays: null })

    await api.banUser('u1', true, 'Spam', 7)
    expect(lastBody()).toEqual({ isBanned: true, reason: 'Spam', durationDays: 7 })

    await api.banUser('u1', false)
    expect(lastBody()).toEqual({ isBanned: false, reason: '', durationDays: null })
  })

  it('moderateAccount gửi nguyên payload kiểm duyệt', async () => {
    const payload = { fullName: 'An', isEmailVerified: true, clearLockout: true, role: 'User', resetPassword: null }

    await api.moderateAccount('u1', payload)

    expect(lastUrl()).toBe('/api/admin/users/u1/moderate')
    expect(lastInit().method).toBe('PUT')
    expect(lastBody()).toEqual(payload)
  })

  it('createRecipe / updateRecipe trả data của món', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ success: true, data: { id: 'r9', title: 'Phở' } }))

    await expect(api.createRecipe({ title: 'Phở' })).resolves.toEqual({ id: 'r9', title: 'Phở' })
    expect(lastInit().method).toBe('POST')
    expect(lastUrl()).toBe('/api/admin/recipes')

    await api.updateRecipe('r9', { title: 'Phở bò' })
    expect(lastInit().method).toBe('PUT')
    expect(lastUrl()).toBe('/api/admin/recipes/r9')
    expect(lastBody()).toEqual({ title: 'Phở bò' })
  })

  it('createChallenge / updateChallenge / grantXp gửi đúng endpoint', async () => {
    await api.createChallenge({ title: 'Uống nước' })
    expect([lastInit().method, lastUrl()]).toEqual(['POST', '/api/admin/rewards/challenges'])

    await api.updateChallenge('c1', { title: 'Uống nước 2' })
    expect([lastInit().method, lastUrl()]).toEqual(['PUT', '/api/admin/rewards/challenges/c1'])

    await api.grantXp('u1', 250)
    expect(lastUrl()).toBe('/api/admin/rewards/grant-xp')
    expect(lastBody()).toEqual({ userId: 'u1', xp: 250, reason: 'Admin thưởng điểm chuyên cần' })
  })

  it('getRevenueReport chỉ thêm query khi có chọn ngày', async () => {
    await api.getRevenueReport()
    expect(lastUrl()).toBe('/api/admin/reports/revenue')

    await api.getRevenueReport('2026-10-01', null)
    expect(lastUrl()).toBe('/api/admin/reports/revenue?startDate=2026-10-01')

    await api.getRevenueReport('2026-10-01', '2026-10-31')
    expect(lastUrl()).toBe('/api/admin/reports/revenue?startDate=2026-10-01&endDate=2026-10-31')
  })
})
