import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import UsersView from '../../components/UsersView'
import { api } from '../../services/api'
import { listPage, manyUsers, setupApi, userDetail, users } from '../../test/fixtures'
import { answerConfirm } from '../../test/confirm'

vi.mock('../../services/api', async (importOriginal) => (await import('../../test/mockApi.js')).mockApiModule(importOriginal))

let onNotify

const rowOf = async (name) => (await screen.findByText(name)).closest('tr')
const modal = () => document.querySelector('.modal-content')

async function renderLoaded() {
  const user = userEvent.setup()
  render(<UsersView onNotify={onNotify} />)
  await screen.findByText('Lan Anh')
  return user
}

beforeEach(() => {
  setupApi(api)
  onNotify = vi.fn()
})

describe('UsersView — danh sách & bộ lọc', () => {
  it('nạp trang 1 (15 người/trang, không lọc) và hiển thị vai trò, gói Pro, trạng thái', async () => {
    await renderLoaded()

    expect(api.getUsers).toHaveBeenCalledWith({ page: 1, pageSize: 15, search: '', role: '', status: '', subscription: '' })
    const lan = await rowOf('Lan Anh')
    expect(within(lan).getByText(/Pro VIP/)).toBeInTheDocument()
    expect(within(lan).getByText(/Hoạt động/)).toBeInTheDocument()
    expect(within(await rowOf('Minh Trần')).getByText('★ Quản trị (Admin)')).toBeInTheDocument()
    expect(within(await rowOf('Spam Bot')).getByText(/Đang bị khóa/)).toBeInTheDocument()
  })

  it('đang tải → hiện thông báo tải; không có kết quả → hiện thông báo trống', async () => {
    api.getUsers.mockResolvedValue(listPage([]))
    render(<UsersView onNotify={onNotify} />)

    expect(screen.getByText('Đang tải danh sách người dùng...')).toBeInTheDocument()
    expect(await screen.findByText('Không tìm thấy người dùng nào phù hợp với bộ lọc.')).toBeInTheDocument()
  })

  it('đổi bộ lọc vai trò / gói / trạng thái và ô tìm kiếm thì nạp lại với tham số tương ứng', async () => {
    const user = await renderLoaded()
    const [roleSelect, subSelect, statusSelect] = screen.getAllByRole('combobox')

    await user.selectOptions(roleSelect, 'Admin')
    await user.selectOptions(subSelect, 'expired')
    await user.selectOptions(statusSelect, 'locked')
    await user.type(screen.getByPlaceholderText('Tìm theo email, họ tên...'), 'bot')

    await waitFor(() => expect(api.getUsers).toHaveBeenLastCalledWith(
      { page: 1, pageSize: 15, search: 'bot', role: 'Admin', status: 'locked', subscription: 'expired' }))
  })

  it('lỗi tải danh sách gọi onNotify kiểu error', async () => {
    api.getUsers.mockRejectedValue(new Error('500'))
    render(<UsersView onNotify={onNotify} />)

    await waitFor(() => expect(onNotify).toHaveBeenCalledWith('Lỗi tải danh sách người dùng: 500', 'error'))
  })

  it('có hơn 15 người dùng thì admin chuyển được sang trang 2', async () => {
    api.getUsers.mockImplementation(async ({ page }) => (page === 1 ? listPage(manyUsers(15), 16) : listPage([users[0]], 16)))
    const user = userEvent.setup()
    render(<UsersView onNotify={onNotify} />)
    await screen.findByText('Người dùng 0')

    // Tổng số lấy từ header X-Total-Count: 16 người → 2 trang; người thứ 16 phải xem được.
    expect(screen.getByText('Hiển thị 1–15 / 16 người dùng')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Trang sau' }))
    await waitFor(() => expect(api.getUsers).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2 })))
    expect(await screen.findByText('Lan Anh')).toBeInTheDocument()
  })

  it('đổi bộ lọc khi đang ở trang 2 thì quay về trang 1', async () => {
    api.getUsers.mockImplementation(async ({ page }) => (page === 1 ? listPage(manyUsers(15), 40) : listPage(manyUsers(15), 40)))
    const user = userEvent.setup()
    render(<UsersView onNotify={onNotify} />)
    await screen.findByText('Người dùng 0')
    await user.click(screen.getByRole('button', { name: 'Trang sau' }))
    await waitFor(() => expect(api.getUsers).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2 })))

    await user.selectOptions(screen.getAllByRole('combobox')[0], 'Admin')

    await waitFor(() => expect(api.getUsers).toHaveBeenLastCalledWith(expect.objectContaining({ page: 1, role: 'Admin' })))
  })
})

describe('UsersView — xem chi tiết & phân quyền', () => {
  it('xem chi tiết: nạp hồ sơ đầy đủ, hiển thị sức khỏe và số liệu sử dụng', async () => {
    const user = await renderLoaded()

    await user.click(within(await rowOf('Lan Anh')).getByTitle('Xem chi tiết & Hồ sơ sức khỏe'))

    expect(api.getUserDetail).toHaveBeenCalledWith('u1')
    const dialog = await screen.findByText('Hồ Sơ Chi Tiết: Lan Anh')
    const content = dialog.closest('.modal-content')
    expect(await within(content).findByText('Nữ / 28 tuổi')).toBeInTheDocument()
    expect(within(content).getByText('160 cm / 58 kg')).toBeInTheDocument()
    expect(within(content).getByText('1650 kcal')).toBeInTheDocument()
    expect(within(content).getByText('12')).toBeInTheDocument()
    await user.click(within(content).getByRole('button', { name: 'Đóng' }))
    expect(screen.queryByText('Hồ Sơ Chi Tiết: Lan Anh')).not.toBeInTheDocument()
  })

  it('người dùng chưa khai báo sức khỏe → hiện ghi chú chưa hoàn thiện hồ sơ', async () => {
    api.getUserDetail.mockResolvedValue({ ...userDetail, healthProfile: null })
    const user = await renderLoaded()

    await user.click(within(await rowOf('Lan Anh')).getByTitle('Xem chi tiết & Hồ sơ sức khỏe'))

    expect(await screen.findByText('Người dùng chưa hoàn thiện hồ sơ sức khỏe.')).toBeInTheDocument()
  })

  it('đổi vai trò User ↔ Admin sau khi xác nhận, rồi nạp lại danh sách', async () => {
    const user = await renderLoaded()

    await user.click(within(await rowOf('Lan Anh')).getByTitle('Bấm để đổi quyền'))
    await answerConfirm(user)
    await user.click(within(await rowOf('Minh Trần')).getByTitle('Bấm để đổi quyền'))
    await answerConfirm(user)

    expect(api.updateUserRole.mock.calls).toEqual([['u1', 'Admin'], ['u2', 'User']])
    await waitFor(() => expect(onNotify).toHaveBeenCalledWith('Đã đổi vai trò thành User thành công!', 'success'))
    expect(api.getUsers.mock.calls.length).toBeGreaterThanOrEqual(3)
  })

  it('hủy hộp thoại xác nhận thì không đổi vai trò', async () => {
    const user = await renderLoaded()

    await user.click(within(await rowOf('Lan Anh')).getByTitle('Bấm để đổi quyền'))
    await answerConfirm(user, false)

    expect(api.updateUserRole).not.toHaveBeenCalled()
  })

  it('xóa người dùng sau khi xác nhận; lỗi thì báo thất bại', async () => {
    const user = await renderLoaded()
    await user.click(within(await rowOf('Spam Bot')).getByTitle('Xóa người dùng'))
    await answerConfirm(user)
    expect(api.deleteUser).toHaveBeenCalledWith('u3')
    await waitFor(() => expect(onNotify).toHaveBeenCalledWith('Đã xóa người dùng thành công.', 'success'))

    api.deleteUser.mockRejectedValue(new Error('Bạn không thể tự xóa tài khoản của chính mình.'))
    await user.click(within(await rowOf('Minh Trần')).getByTitle('Xóa người dùng'))
    await answerConfirm(user)
    await waitFor(() => expect(onNotify).toHaveBeenCalledWith('Xóa người dùng thất bại: Bạn không thể tự xóa tài khoản của chính mình.', 'error'))
  })
})

describe('UsersView — cấp / hủy gói Pro', () => {
  it('chọn gói Năm tự đặt 365 ngày và gửi cấp Pro', async () => {
    const user = await renderLoaded()

    await user.click(within(await rowOf('Minh Trần')).getByTitle('Cấp / Gia hạn gói Pro'))
    await user.selectOptions(within(modal()).getByRole('combobox'), 'PRO_YEARLY')
    expect(within(modal()).getByRole('spinbutton')).toHaveValue(365)
    await user.click(screen.getByRole('button', { name: 'Xác Nhận Kích Hoạt Pro' }))

    expect(api.updateUserSubscription).toHaveBeenCalledWith('u2', true, 'PRO_YEARLY', 365)
    await waitFor(() => expect(onNotify).toHaveBeenCalledWith('Đã cấp thành công gói Pro (365 ngày) cho Minh Trần!', 'success'))
    expect(modal()).toBeNull()
  })

  it('nhập số ngày tùy chỉnh được gửi dưới dạng số', async () => {
    const user = await renderLoaded()

    await user.click(within(await rowOf('Minh Trần')).getByTitle('Cấp / Gia hạn gói Pro'))
    const days = within(modal()).getByRole('spinbutton')
    await user.clear(days)
    await user.type(days, '45')
    await user.click(screen.getByRole('button', { name: 'Xác Nhận Kích Hoạt Pro' }))

    expect(api.updateUserSubscription).toHaveBeenCalledWith('u2', true, 'PRO_MONTHLY', 45)
  })

  it('người dùng đang Pro: nút "Hủy Gói Pro Ngay Lập Tức" hạ về gói miễn phí', async () => {
    const user = await renderLoaded()

    await user.click(within(await rowOf('Lan Anh')).getByTitle('Cấp / Gia hạn gói Pro'))
    await user.click(within(modal()).getByRole('button', { name: 'Hủy Gói Pro Ngay Lập Tức' }))
    await answerConfirm(user)

    expect(api.updateUserSubscription).toHaveBeenCalledWith('u1', false)
    await waitFor(() => expect(onNotify).toHaveBeenCalledWith('Đã hủy gói Pro thành công!', 'success'))
  })

  it('cấp Pro lỗi thì báo lỗi và giữ hộp thoại', async () => {
    api.updateUserSubscription.mockRejectedValue(new Error('Không tìm thấy người dùng.'))
    const user = await renderLoaded()

    await user.click(within(await rowOf('Minh Trần')).getByTitle('Cấp / Gia hạn gói Pro'))
    await user.click(screen.getByRole('button', { name: 'Xác Nhận Kích Hoạt Pro' }))

    await waitFor(() => expect(onNotify).toHaveBeenCalledWith('Cấp gói Pro thất bại: Không tìm thấy người dùng.', 'error'))
    expect(modal()).not.toBeNull()
  })
})

describe('UsersView — UC1 Ban user', () => {
  it('cấm 7 ngày với lý do tùy chỉnh', async () => {
    const user = await renderLoaded()

    await user.click(within(await rowOf('Lan Anh')).getByTitle('Cấm tài khoản (Ban User)'))
    await user.selectOptions(within(modal()).getByRole('combobox'), '7')
    const reason = within(modal()).getByRole('textbox')
    await user.clear(reason)
    await user.type(reason, 'Spam bình luận')
    await user.click(screen.getByRole('button', { name: 'Xác Nhận Ban Tài Khoản' }))

    expect(api.banUser).toHaveBeenCalledWith('u1', true, 'Spam bình luận', 7)
    await waitFor(() => expect(onNotify).toHaveBeenCalledWith('Đã cấm tài khoản Lan Anh thành công.', 'success'))
  })

  it('cấm vĩnh viễn gửi durationDays = null; mặc định 30 ngày với lý do vi phạm cộng đồng', async () => {
    const user = await renderLoaded()

    await user.click(within(await rowOf('Lan Anh')).getByTitle('Cấm tài khoản (Ban User)'))
    expect(within(modal()).getByRole('combobox')).toHaveValue('30')
    expect(within(modal()).getByRole('textbox')).toHaveValue('Vi phạm tiêu chuẩn cộng đồng SmartMeal')
    await user.selectOptions(within(modal()).getByRole('combobox'), 'permanent')
    await user.click(screen.getByRole('button', { name: 'Xác Nhận Ban Tài Khoản' }))

    expect(api.banUser).toHaveBeenCalledWith('u1', true, 'Vi phạm tiêu chuẩn cộng đồng SmartMeal', null)
  })

  it('tài khoản đang bị cấm: hộp thoại đề nghị gỡ cấm và gửi isBanned = false', async () => {
    const user = await renderLoaded()

    await user.click(within(await rowOf('Spam Bot')).getByTitle('Quản lý cấm / Mở cấm (Unban)'))
    expect(within(modal()).getByText('Tài khoản này hiện đang bị cấm!')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Xác Nhận Mở Cấm (Unban)' }))

    expect(api.banUser).toHaveBeenCalledWith('u3', false, 'Vi phạm tiêu chuẩn cộng đồng SmartMeal', 30)
    await waitFor(() => expect(onNotify).toHaveBeenCalledWith('Đã gỡ cấm tài khoản Spam Bot.', 'success'))
  })

  it('lỗi khi cấm thì báo thất bại', async () => {
    api.banUser.mockRejectedValue(new Error('Bạn không thể tự cấm tài khoản của chính mình.'))
    const user = await renderLoaded()

    await user.click(within(await rowOf('Minh Trần')).getByTitle('Cấm tài khoản (Ban User)'))
    await user.click(screen.getByRole('button', { name: 'Xác Nhận Ban Tài Khoản' }))

    await waitFor(() => expect(onNotify).toHaveBeenCalledWith(
      'Thao tác cấm người dùng thất bại: Bạn không thể tự cấm tài khoản của chính mình.', 'error'))
  })
})

describe('UsersView — UC2 Moderate account', () => {
  it('tài khoản đang bị cấm: không mặc định gỡ khóa khi kiểm duyệt (giữ lệnh cấm)', async () => {
    const user = await renderLoaded()

    await user.click(within(await rowOf('Spam Bot')).getByTitle('Kiểm duyệt tài khoản (Moderate Account)'))
    const [, clearLockout] = within(modal()).getAllByRole('checkbox')
    expect(clearLockout).not.toBeChecked()
    await user.click(screen.getByRole('button', { name: 'Lưu Thay Đổi Kiểm Duyệt' }))

    expect(api.moderateAccount).toHaveBeenCalledWith('u3', expect.objectContaining({ clearLockout: false }))
  })

  it('mở form với dữ liệu hiện tại, gửi tên đã trim, vai trò và mật khẩu mới', async () => {
    const user = await renderLoaded()

    await user.click(within(await rowOf('Lan Anh')).getByTitle('Kiểm duyệt tài khoản (Moderate Account)'))
    const [nameInput] = within(modal()).getAllByRole('textbox')
    expect(nameInput).toHaveValue('Lan Anh')
    await user.clear(nameInput)
    await user.type(nameInput, '  Lan Anh Nguyễn  ')
    await user.selectOptions(within(modal()).getByRole('combobox'), 'Admin')
    await user.type(within(modal()).getByPlaceholderText('Để trống nếu không muốn đổi mật khẩu'), '  NewPass@2026 ')
    await user.click(screen.getByRole('button', { name: 'Lưu Thay Đổi Kiểm Duyệt' }))

    expect(api.moderateAccount).toHaveBeenCalledWith('u1', {
      fullName: 'Lan Anh Nguyễn', isEmailVerified: true, clearLockout: true, role: 'Admin', resetPassword: 'NewPass@2026',
    })
    await waitFor(() => expect(onNotify).toHaveBeenCalledWith('Đã kiểm duyệt và cập nhật tài khoản lan@example.com thành công!', 'success'))
  })

  it('để trống mật khẩu → resetPassword = null; xóa trống tên → giữ tên cũ; bỏ chọn checkbox', async () => {
    const user = await renderLoaded()

    await user.click(within(await rowOf('Minh Trần')).getByTitle('Kiểm duyệt tài khoản (Moderate Account)'))
    await user.clear(within(modal()).getAllByRole('textbox')[0])
    const [verified, clearLockout] = within(modal()).getAllByRole('checkbox')
    await user.click(verified)
    await user.click(clearLockout)
    await user.click(screen.getByRole('button', { name: 'Lưu Thay Đổi Kiểm Duyệt' }))

    expect(api.moderateAccount).toHaveBeenCalledWith('u2', {
      fullName: 'Minh Trần', isEmailVerified: false, clearLockout: false, role: 'Admin', resetPassword: null,
    })
  })

  it('lỗi kiểm duyệt thì báo thất bại, đóng bằng nút Hủy', async () => {
    api.moderateAccount.mockRejectedValue(new Error('Không tìm thấy người dùng.'))
    const user = await renderLoaded()

    await user.click(within(await rowOf('Lan Anh')).getByTitle('Kiểm duyệt tài khoản (Moderate Account)'))
    await user.click(screen.getByRole('button', { name: 'Lưu Thay Đổi Kiểm Duyệt' }))
    await waitFor(() => expect(onNotify).toHaveBeenCalledWith('Kiểm duyệt tài khoản thất bại: Không tìm thấy người dùng.', 'error'))
    await user.click(within(modal()).getByRole('button', { name: 'Hủy' }))

    expect(modal()).toBeNull()
  })
})
