import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import LoginView from '../../components/LoginView'
import { api } from '../../services/api'
import { adminUser } from '../../test/fixtures'

vi.mock('../../services/api', async (importOriginal) => (await import('../../test/mockApi.js')).mockApiModule(importOriginal))

const emailInput = () => screen.getByPlaceholderText('admin@smartmeal.com')
const passwordInput = () => screen.getByPlaceholderText('••••••••')
const submitButton = () => screen.getByRole('button', { name: /Đăng Nhập Quản Trị|Đang xác thực/ })

async function typeCredentials(user, email, password) {
  await user.clear(emailInput())
  await user.type(emailInput(), email)
  await user.clear(passwordInput())
  await user.type(passwordInput(), password)
}

beforeEach(() => {
  api.login.mockResolvedValue({ token: 'jwt', user: adminUser })
})

describe('LoginView', () => {
  it('đăng nhập bằng email/mật khẩu đã nhập và báo user cho App', async () => {
    const user = userEvent.setup()
    const onLoginSuccess = vi.fn()
    render(<LoginView onLoginSuccess={onLoginSuccess} />)

    await typeCredentials(user, 'boss@smartmeal.vn', 'S3cret-Pass!')
    await user.click(submitButton())

    expect(api.login).toHaveBeenCalledWith('boss@smartmeal.vn', 'S3cret-Pass!')
    await waitFor(() => expect(onLoginSuccess).toHaveBeenCalledWith(adminUser))
  })

  it('khóa nút và hiện "Đang xác thực..." trong lúc chờ backend', async () => {
    let resolveLogin
    api.login.mockReturnValue(new Promise((resolve) => { resolveLogin = resolve }))
    const user = userEvent.setup()
    render(<LoginView onLoginSuccess={vi.fn()} />)

    await typeCredentials(user, 'boss@smartmeal.vn', 'S3cret-Pass!')
    await user.click(submitButton())

    expect(submitButton()).toBeDisabled()
    expect(submitButton()).toHaveTextContent('Đang xác thực...')
    resolveLogin({ user: adminUser })
    await waitFor(() => expect(submitButton()).toBeEnabled())
  })

  it('hiện thông báo lỗi của backend và không chuyển trang khi sai mật khẩu', async () => {
    api.login.mockRejectedValue(new Error('Email hoặc mật khẩu không chính xác.'))
    const user = userEvent.setup()
    const onLoginSuccess = vi.fn()
    render(<LoginView onLoginSuccess={onLoginSuccess} />)

    await typeCredentials(user, 'boss@smartmeal.vn', 'wrong-pass')
    await user.click(submitButton())

    expect(await screen.findByText('Email hoặc mật khẩu không chính xác.')).toBeInTheDocument()
    expect(onLoginSuccess).not.toHaveBeenCalled()
    expect(submitButton()).toBeEnabled()
  })

  it('dùng thông báo mặc định khi lỗi không có nội dung', async () => {
    api.login.mockRejectedValue(new Error(''))
    const user = userEvent.setup()
    render(<LoginView onLoginSuccess={vi.fn()} />)

    await typeCredentials(user, 'boss@smartmeal.vn', 'wrong-pass')
    await user.click(submitButton())

    expect(await screen.findByText('Đăng nhập không thành công.')).toBeInTheDocument()
  })

  it('báo thiếu thông tin và không gọi API khi để trống email hoặc mật khẩu', async () => {
    const user = userEvent.setup()
    const { container } = render(<LoginView onLoginSuccess={vi.fn()} />)

    await user.clear(emailInput())
    await user.clear(passwordInput())
    fireEvent.submit(container.querySelector('form'))

    expect(await screen.findByText('Vui lòng nhập đầy đủ Email và Mật khẩu.')).toBeInTheDocument()
    expect(api.login).not.toHaveBeenCalled()
  })

  it('nút "Điền Tài Khoản Admin Mặc Định" điền lại form và xóa lỗi cũ', async () => {
    api.login.mockRejectedValue(new Error('Sai mật khẩu'))
    const user = userEvent.setup()
    render(<LoginView onLoginSuccess={vi.fn()} />)
    await typeCredentials(user, 'x@y.z', 'abc')
    await user.click(submitButton())
    await screen.findByText('Sai mật khẩu')

    await user.click(screen.getByRole('button', { name: /Điền Tài Khoản Admin Mặc Định/ }))

    expect(emailInput()).toHaveValue('admin@smartmeal.com')
    expect(passwordInput()).not.toHaveValue('')
    expect(screen.queryByText('Sai mật khẩu')).not.toBeInTheDocument()
  })

  it('[Bảo mật] trang đăng nhập không điền sẵn / không in ra mật khẩu của tài khoản admin', () => {
    // Backend seed admin@smartmeal.com / Admin@123456 ở MỌI môi trường (không chỉ Development) —
    // nếu trang công khai in sẵn mật khẩu này, bất kỳ ai mở cổng Admin đều đăng nhập được.
    const { container } = render(<LoginView onLoginSuccess={vi.fn()} />)

    expect(passwordInput()).toHaveValue('')
    expect(container.textContent).not.toContain('Admin@123456')
  })
})
