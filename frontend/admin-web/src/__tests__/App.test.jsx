import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../App'
import { api, authStorage } from '../services/api'
import { adminUser, setupApi } from '../test/fixtures'

vi.mock('../services/api', async (importOriginal) => (await import('../test/mockApi.js')).mockApiModule(importOriginal))

const pageTitle = () => screen.getByRole('heading', { level: 2, name: (_, el) => el.classList.contains('page-title') })

// Trang đăng nhập không còn điền sẵn tài khoản: nhập email / mật khẩu rồi bấm đăng nhập.
async function submitLogin(user, email = 'boss@smartmeal.vn', password = 'S3cret-Pass!') {
  await user.type(screen.getByPlaceholderText('admin@smartmeal.com'), email)
  await user.type(screen.getByPlaceholderText('••••••••'), password)
  await user.click(screen.getByRole('button', { name: /Đăng Nhập Quản Trị/ }))
}

function loginAsStoredAdmin() {
  authStorage.setToken('jwt-stored')
  authStorage.setUser(adminUser)
}

beforeEach(() => {
  setupApi(api)
  vi.spyOn(window, 'confirm').mockReturnValue(true)
})

describe('App — đăng nhập / đăng xuất', () => {
  it('chưa đăng nhập thì chỉ hiện trang đăng nhập, không gọi API thống kê', () => {
    render(<App />)

    expect(screen.getByRole('button', { name: /Đăng Nhập Quản Trị/ })).toBeInTheDocument()
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument()
    expect(api.getStats).not.toHaveBeenCalled()
  })

  it('đăng nhập thành công → vào Bảng điều khiển, chào admin và nạp thống kê', async () => {
    const user = userEvent.setup()
    render(<App />)

    await submitLogin(user)

    expect(await screen.findByText(`Chào mừng Quản trị viên ${adminUser.fullName}!`)).toBeInTheDocument()
    expect(pageTitle()).toHaveTextContent('Bảng Điều Khiển Tổng Quan')
    await waitFor(() => expect(api.getStats).toHaveBeenCalled())
    expect(await screen.findByText('38 đang hoạt động')).toBeInTheDocument()
  })

  it('đã có phiên trong localStorage → vào thẳng Bảng điều khiển với tên admin', async () => {
    loginAsStoredAdmin()
    render(<App />)

    expect(pageTitle()).toHaveTextContent('Bảng Điều Khiển Tổng Quan')
    expect(within(screen.getByRole('complementary')).getByText(adminUser.fullName)).toBeInTheDocument()
    expect(await screen.findByText('38 đang hoạt động')).toBeInTheDocument()
  })

  it('đăng xuất xóa phiên, quay về trang đăng nhập và báo đã đăng xuất', async () => {
    loginAsStoredAdmin()
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByTitle('Đăng xuất'))

    expect(screen.getByRole('button', { name: /Đăng Nhập Quản Trị/ })).toBeInTheDocument()
    expect(screen.getByText('Đã đăng xuất khỏi hệ thống quản trị.')).toBeInTheDocument()
    expect(authStorage.getToken()).toBeNull()
  })

  it('phiên hết hạn (sự kiện 401 từ api) → quay về trang đăng nhập kèm thông báo', async () => {
    loginAsStoredAdmin()
    render(<App />)
    await screen.findByText('38 đang hoạt động')

    act(() => { window.dispatchEvent(new Event('smartmeal_admin_unauthorized')) })

    expect(screen.getByRole('button', { name: /Đăng Nhập Quản Trị/ })).toBeInTheDocument()
    expect(screen.getByText('Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại.')).toBeInTheDocument()
  })

  it('nhập sai mật khẩu chỉ báo lỗi đăng nhập, không báo "Phiên làm việc đã hết hạn"', async () => {
    // Dùng api.login thật + backend trả 401 như khi sai mật khẩu (xem AdminController.AdminLogin).
    const { api: realApi } = await vi.importActual('../services/api')
    api.login.mockImplementation(realApi.login)
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: false, status: 401, json: async () => ({ success: false, message: 'Email hoặc mật khẩu không chính xác.' }),
    })))
    const user = userEvent.setup()
    render(<App />)

    await submitLogin(user)

    expect(await screen.findByText('Email hoặc mật khẩu không chính xác.')).toBeInTheDocument()
    expect(screen.queryByText('Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại.')).not.toBeInTheDocument()
    vi.unstubAllGlobals()
  })
})

describe('App — điều hướng & thông báo', () => {
  it.each([
    ['Quản Lý Người Dùng', 'Quản Lý Người Dùng & Kiểm Duyệt Tài Khoản', 'getUsers'],
    ['Quản Lý Món Ăn', 'Quản Lý Thực Đơn & Món Ăn', 'getRecipes'],
    ['Hệ Thống Phần Thưởng', 'Quản Lý Hệ Thống Phần Thưởng (Rewards)', 'getChallenges'],
    ['Giám Sát Hệ Thống', 'Giám Sát Hoạt Động Hệ Thống (System Activity)', 'getSystemActivity'],
    ['Báo Cáo Doanh Thu', 'Báo Cáo Doanh Thu Tài Chính (Revenue Report)', 'getRevenueReport'],
    ['Phân Tích Tương Tác', 'Phân Tích Mức Độ Tương Tác (Engagement Analytics)', 'getEngagementAnalytics'],
    ['Gói Member & Giao Dịch', 'Quản Lý Gói Hội Viên & Giao Dịch', 'getTransactions'],
  ])('menu "%s" mở trang "%s" và nạp dữ liệu', async (menu, title, apiFn) => {
    loginAsStoredAdmin()
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: menu }))

    expect(pageTitle()).toHaveTextContent(title)
    await waitFor(() => expect(api[apiFn]).toHaveBeenCalled())
  })

  it('nút "Thêm Món Ăn" trên thanh trên mở tab Món ăn với form thêm món', async () => {
    loginAsStoredAdmin()
    const user = userEvent.setup()
    render(<App />)

    await user.click(within(screen.getByRole('banner')).getByRole('button', { name: /Thêm Món Ăn/ }))

    expect(pageTitle()).toHaveTextContent('Quản Lý Thực Đơn & Món Ăn')
    expect(await screen.findByText('Thêm Món Ăn Mới Vào Cơ Sở Dữ Liệu')).toBeInTheDocument()
  })

  it('nút "Làm mới" nạp lại thống kê', async () => {
    loginAsStoredAdmin()
    const user = userEvent.setup()
    render(<App />)
    await waitFor(() => expect(api.getStats).toHaveBeenCalledTimes(1))

    await user.click(screen.getByRole('button', { name: /Làm mới/ }))

    await waitFor(() => expect(api.getStats).toHaveBeenCalledTimes(2))
  })

  it('lỗi nạp thống kê hiện toast lỗi', async () => {
    api.getStats.mockRejectedValue(new Error('Mất kết nối'))
    loginAsStoredAdmin()
    render(<App />)

    expect(await screen.findByText('Lỗi nạp thống kê: Mất kết nối')).toBeInTheDocument()
    expect(screen.getByText('Lỗi nạp thống kê: Mất kết nối').closest('.toast')).toHaveClass('toast-error')
  })

  it('toast tự ẩn sau 4 giây', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    loginAsStoredAdmin()
    render(<App />)
    act(() => { window.dispatchEvent(new Event('smartmeal_admin_unauthorized')) })
    expect(screen.getByText('Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại.')).toBeInTheDocument()

    act(() => { vi.advanceTimersByTime(4100) })

    expect(screen.queryByText('Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại.')).not.toBeInTheDocument()
  })
})
