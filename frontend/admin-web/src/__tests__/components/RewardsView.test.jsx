import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import RewardsView from '../../components/RewardsView'
import { api } from '../../services/api'
import { challenges, listPage, setupApi, users, xpEvents } from '../../test/fixtures'

vi.mock('../../services/api', async (importOriginal) => (await import('../../test/mockApi.js')).mockApiModule(importOriginal))

let onNotify

const rowOf = async (title) => (await screen.findByText(title)).closest('tr')
const modal = () => document.querySelector('.modal-content')
const tab = (name) => screen.getByRole('button', { name })

async function renderLoaded() {
  const user = userEvent.setup()
  render(<RewardsView onNotify={onNotify} />)
  await screen.findByText('7 Ngày Uống Đủ 2L Nước')
  return user
}

beforeEach(() => {
  setupApi(api)
  onNotify = vi.fn()
  vi.spyOn(window, 'confirm').mockReturnValue(true)
})

describe('RewardsView — thử thách', () => {
  it('nạp song song thử thách, huy hiệu, lịch sử XP, người dùng và đếm số trên tab', async () => {
    await renderLoaded()

    expect(api.getChallenges).toHaveBeenCalledTimes(1)
    expect(api.getBadges).toHaveBeenCalledTimes(1)
    expect(api.getXpEvents).toHaveBeenCalledTimes(1)
    expect(api.getUsers).toHaveBeenCalledWith({ pageSize: 50 })
    expect(tab(/Thử Thách Sức Khỏe \(2\)/)).toBeInTheDocument()
    expect(tab(/Huy Hiệu Hệ Thống \(2\)/)).toBeInTheDocument()
  })

  it('bảng thử thách: danh mục, thời hạn, mục tiêu, thưởng, tham gia và trạng thái', async () => {
    await renderLoaded()

    const water = await rowOf('7 Ngày Uống Đủ 2L Nước')
    expect(within(water).getByText('DrinkWater')).toBeInTheDocument()
    expect(within(water).getByText('7 ngày')).toBeInTheDocument()
    expect(within(water).getByText('2000 lần/ngày')).toBeInTheDocument()
    expect(within(water).getByText('+150 XP')).toBeInTheDocument()
    expect(within(water).getByText(/Water Champion/)).toBeInTheDocument()
    expect(within(water).getByText('12')).toBeInTheDocument()
    expect(within(water).getByText(/Đang mở/)).toBeInTheDocument()
    const closed = await rowOf('Eat Clean 14 Ngày')
    expect(within(closed).getByText('Đã đóng')).toBeInTheDocument()
    expect(within(closed).getByText('Không có mô tả')).toBeInTheDocument()
  })

  it('chưa có thử thách → hiện lời mời tạo thử thách đầu tiên', async () => {
    api.getChallenges.mockResolvedValue([])
    render(<RewardsView onNotify={onNotify} />)

    expect(await screen.findByText('Chưa có thử thách nào. Hãy tạo thử thách đầu tiên!')).toBeInTheDocument()
  })

  it('tạo thử thách mới với dữ liệu nhập và nạp lại danh sách', async () => {
    const user = await renderLoaded()

    await user.click(screen.getByRole('button', { name: /Thêm Thử Thách Mới/ }))
    await user.type(within(modal()).getByPlaceholderText(/7 Ngày Ăn Sạch/), '10.000 bước')
    await user.selectOptions(within(modal()).getByRole('combobox'), 'Exercise')
    const [days, target] = within(modal()).getAllByRole('spinbutton')
    await user.clear(days)
    await user.type(days, '14')
    await user.clear(target)
    await user.type(target, '10000')
    await user.click(within(modal()).getByRole('button', { name: 'Tạo Thử Thách' }))

    await waitFor(() => expect(api.createChallenge).toHaveBeenCalledWith({
      title: '10.000 bước', description: '', category: 'Exercise', durationDays: 14, targetValuePerDay: 10000,
      rewardExp: 150, rewardBadge: 'Clean Eater', isActive: true,
    }))
    await waitFor(() => expect(onNotify).toHaveBeenCalledWith('Đã tạo thử thách mới thành công!', 'success'))
    expect(api.getChallenges).toHaveBeenCalledTimes(2)
    expect(modal()).toBeNull()
  })

  it('tiêu đề trống → báo lỗi, không gọi API', async () => {
    const user = await renderLoaded()

    await user.click(screen.getByRole('button', { name: /Thêm Thử Thách Mới/ }))
    await user.type(within(modal()).getByPlaceholderText(/7 Ngày Ăn Sạch/), '  ')
    await user.click(within(modal()).getByRole('button', { name: 'Tạo Thử Thách' }))

    expect(onNotify).toHaveBeenCalledWith('Vui lòng nhập tiêu đề thử thách.', 'error')
    expect(api.createChallenge).not.toHaveBeenCalled()
  })

  it('sửa thử thách: điền sẵn dữ liệu cũ, bỏ chọn "mở" và gửi updateChallenge', async () => {
    const user = await renderLoaded()

    await user.click(within(await rowOf('7 Ngày Uống Đủ 2L Nước')).getByTitle('Chỉnh sửa thử thách'))
    expect(within(modal()).getByText('Chỉnh Sửa Thử Thách')).toBeInTheDocument()
    expect(within(modal()).getByDisplayValue('7 Ngày Uống Đủ 2L Nước')).toBeInTheDocument()
    await user.click(within(modal()).getByRole('checkbox'))
    await user.click(within(modal()).getByRole('button', { name: 'Lưu Cập Nhật' }))

    await waitFor(() => expect(api.updateChallenge).toHaveBeenCalledWith('c1', expect.objectContaining({
      title: '7 Ngày Uống Đủ 2L Nước', category: 'DrinkWater', targetValuePerDay: 2000, isActive: false,
    })))
    await waitFor(() => expect(onNotify).toHaveBeenCalledWith('Đã cập nhật thử thách thành công!', 'success'))
  })

  it('lưu thất bại → báo lỗi', async () => {
    api.updateChallenge.mockRejectedValue(new Error('Không tìm thấy thử thách.'))
    const user = await renderLoaded()

    await user.click(within(await rowOf('Eat Clean 14 Ngày')).getByTitle('Chỉnh sửa thử thách'))
    await user.click(within(modal()).getByRole('button', { name: 'Lưu Cập Nhật' }))

    await waitFor(() => expect(onNotify).toHaveBeenCalledWith('Lưu thử thách thất bại: Không tìm thấy thử thách.', 'error'))
  })

  it('xóa thử thách sau khi xác nhận thì bỏ khỏi bảng', async () => {
    const user = await renderLoaded()

    await user.click(within(await rowOf('Eat Clean 14 Ngày')).getByTitle('Xóa thử thách'))

    expect(api.deleteChallenge).toHaveBeenCalledWith('c2')
    await waitFor(() => expect(screen.queryByText('Eat Clean 14 Ngày')).not.toBeInTheDocument())
    expect(onNotify).toHaveBeenCalledWith('Đã xóa thử thách.', 'success')
  })

  it('lỗi tải dữ liệu → onNotify error', async () => {
    api.getBadges.mockRejectedValue(new Error('503'))
    render(<RewardsView onNotify={onNotify} />)

    await waitFor(() => expect(onNotify).toHaveBeenCalledWith('Lỗi tải dữ liệu phần thưởng: 503', 'error'))
  })
})

describe('RewardsView — huy hiệu & tặng XP', () => {
  it('tab Huy hiệu hiển thị tên, mô tả, danh mục (mặc định "Thành Tích") và số người mở khóa', async () => {
    const user = await renderLoaded()

    await user.click(tab(/Huy Hiệu Hệ Thống/))

    expect(screen.getByText('Khởi đầu')).toBeInTheDocument()
    expect(screen.getByText('25 người dùng')).toBeInTheDocument()
    expect(screen.getByText('Thành Tích')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Thêm Thử Thách Mới/ })).not.toBeInTheDocument()
  })

  it('tab XP: chọn sẵn người dùng đầu tiên, tặng XP và nạp lại lịch sử', async () => {
    api.getXpEvents.mockResolvedValueOnce(xpEvents).mockResolvedValueOnce([...xpEvents, { ...xpEvents[0], id: 'x2', xp: 250 }])
    const user = await renderLoaded()

    await user.click(tab(/Tặng Điểm XP/))
    expect(screen.getByRole('combobox')).toHaveValue(users[0].id)
    expect(screen.getByText('1 sự kiện')).toBeInTheDocument()
    await user.selectOptions(screen.getByRole('combobox'), 'u2')
    const amount = screen.getByRole('spinbutton')
    await user.clear(amount)
    await user.type(amount, '250')
    await user.click(screen.getByRole('button', { name: /Xác Nhận Tặng XP/ }))

    await waitFor(() => expect(api.grantXp).toHaveBeenCalledWith('u2', 250, 'Admin thưởng sự kiện chuyên cần'))
    await waitFor(() => expect(onNotify).toHaveBeenCalledWith('Đã tặng thành công +250 XP cho người dùng!', 'success'))
    expect(await screen.findByText('2 sự kiện')).toBeInTheDocument()
  })

  it('không có người dùng → báo phải chọn người nhận', async () => {
    api.getUsers.mockResolvedValue(listPage([]))
    const user = await renderLoaded()

    await user.click(tab(/Tặng Điểm XP/))
    // Ô chọn có `required` nên trình duyệt chặn trước; submit trực tiếp để kiểm tra lớp kiểm tra của handler.
    fireEvent.submit(screen.getByRole('button', { name: /Xác Nhận Tặng XP/ }).closest('form'))

    expect(onNotify).toHaveBeenCalledWith('Vui lòng chọn người dùng nhận XP.', 'error')
    expect(api.grantXp).not.toHaveBeenCalled()
  })

  it('tặng XP lỗi → báo thất bại; lịch sử trống → hiện thông báo', async () => {
    api.getXpEvents.mockResolvedValue([])
    api.grantXp.mockRejectedValue(new Error('Không tìm thấy người dùng.'))
    const user = await renderLoaded()

    await user.click(tab(/Tặng Điểm XP/))
    expect(screen.getByText('Chưa có lịch sử nhận XP nào.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Xác Nhận Tặng XP/ }))

    await waitFor(() => expect(onNotify).toHaveBeenCalledWith('Tặng điểm XP thất bại: Không tìm thấy người dùng.', 'error'))
    expect(screen.getByRole('button', { name: /Xác Nhận Tặng XP/ })).toBeEnabled()
  })

  it('danh sách thử thách mẫu không bị ảnh hưởng khi chuyển tab qua lại', async () => {
    const user = await renderLoaded()

    await user.click(tab(/Huy Hiệu Hệ Thống/))
    await user.click(tab(/Thử Thách Sức Khỏe/))

    expect(screen.getAllByRole('row')).toHaveLength(challenges.length + 1)
  })
})
