import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import SubscriptionsView from '../../components/SubscriptionsView'
import { api } from '../../services/api'
import { listPage, setupApi, transactions } from '../../test/fixtures'

vi.mock('../../services/api', async (importOriginal) => (await import('../../test/mockApi.js')).mockApiModule(importOriginal))

let onNotify
let confirmSpy

const rowOf = async (text) => (await screen.findByText(text)).closest('tr')
const planCard = (name) => screen.getByRole('heading', { level: 4, name }).closest('.card')

async function renderLoaded() {
  const user = userEvent.setup()
  render(<SubscriptionsView onNotify={onNotify} />)
  await screen.findByText('#123456')
  return user
}

beforeEach(() => {
  setupApi(api)
  onNotify = vi.fn()
  confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
})

describe('SubscriptionsView — gói hội viên', () => {
  it('hiển thị giá, chu kỳ, nhãn phổ biến, số thành viên, doanh thu và đặc quyền', async () => {
    await renderLoaded()

    const monthly = planCard('Gói Tháng (Pro Monthly)')
    expect(within(monthly).getByText(/Chu kỳ: 30 ngày \(Hàng tháng\)/)).toBeInTheDocument()
    expect(within(monthly).getByText(/^79\.000\s₫$/)).toBeInTheDocument()
    expect(within(monthly).getByText('7 thành viên')).toBeInTheDocument()
    expect(within(monthly).getByText('AI không giới hạn')).toBeInTheDocument()
    expect(within(monthly).queryByText(/Gói Phổ Biến Nhất/)).not.toBeInTheDocument()
    const yearly = planCard('Gói Năm (Pro Yearly)')
    expect(within(yearly).getByText(/Hàng năm/)).toBeInTheDocument()
    expect(within(yearly).getByText(/Gói Phổ Biến Nhất/)).toBeInTheDocument()
  })
})

describe('SubscriptionsView — giao dịch', () => {
  it('nạp trang 1 (20 giao dịch/trang) và hiển thị mã đơn, cổng, thời gian khớp, trạng thái', async () => {
    await renderLoaded()

    expect(api.getTransactions).toHaveBeenCalledWith({ page: 1, pageSize: 20, status: '', search: '' })
    const paid = await rowOf('#123456')
    expect(within(paid).getByText(/Đã thanh toán/)).toBeInTheDocument()
    expect(within(paid).getByText(/Khớp:/)).toBeInTheDocument()
    expect(within(paid).getByText('Đã hoàn tất')).toBeInTheDocument()
    const pending = await rowOf('#sess-pending-abc')
    expect(within(pending).getByText(/Đang chờ/)).toBeInTheDocument()
    expect(within(pending).getByText('SEPAY')).toBeInTheDocument()
    expect(within(await rowOf('#777')).getByText(/Thất bại/)).toBeInTheDocument()
  })

  it('chỉ giao dịch chưa thanh toán mới có nút "Duyệt Đơn"', async () => {
    await renderLoaded()

    expect(screen.getAllByRole('button', { name: /Duyệt Đơn/ })).toHaveLength(2)
    expect(within(await rowOf('#123456')).queryByRole('button', { name: /Duyệt Đơn/ })).not.toBeInTheDocument()
  })

  it('duyệt đơn sau khi xác nhận → kích hoạt Pro và nạp lại', async () => {
    const user = await renderLoaded()

    await user.click(within(await rowOf('#sess-pending-abc')).getByRole('button', { name: /Duyệt Đơn/ }))

    expect(confirmSpy.mock.calls[0][0]).toContain('#sess-pending-abcdefghijkl')
    expect(api.approveTransaction).toHaveBeenCalledWith('t2')
    await waitFor(() => expect(onNotify).toHaveBeenCalledWith('Đã duyệt đơn và kích hoạt gói Pro thành công!', 'success'))
    expect(api.getTransactions).toHaveBeenCalledTimes(2)
  })

  it('đang duyệt thì nút bị khóa và đổi chữ "Đang duyệt..."', async () => {
    let finish
    api.approveTransaction.mockReturnValue(new Promise((resolve) => { finish = resolve }))
    const user = await renderLoaded()

    await user.click(within(await rowOf('#777')).getByRole('button', { name: /Duyệt Đơn/ }))

    const busy = within(await rowOf('#777')).getByRole('button', { name: /Đang duyệt/ })
    expect(busy).toBeDisabled()
    finish({ success: true })
    await waitFor(() => expect(onNotify).toHaveBeenCalledWith('Đã duyệt đơn và kích hoạt gói Pro thành công!', 'success'))
  })

  it('hủy xác nhận thì không duyệt; duyệt lỗi thì báo thất bại', async () => {
    const user = await renderLoaded()
    confirmSpy.mockReturnValueOnce(false)
    await user.click(within(await rowOf('#777')).getByRole('button', { name: /Duyệt Đơn/ }))
    expect(api.approveTransaction).not.toHaveBeenCalled()

    api.approveTransaction.mockRejectedValue(new Error('Không tìm thấy giao dịch thanh toán.'))
    await user.click(within(await rowOf('#777')).getByRole('button', { name: /Duyệt Đơn/ }))
    await waitFor(() => expect(onNotify).toHaveBeenCalledWith('Duyệt giao dịch thất bại: Không tìm thấy giao dịch thanh toán.', 'error'))
  })

  it('lọc theo trạng thái và tìm kiếm thì nạp lại', async () => {
    const user = await renderLoaded()

    await user.selectOptions(screen.getByRole('combobox'), 'Pending')
    await user.type(screen.getByPlaceholderText('Tìm mã đơn, email...'), 'minh')

    await waitFor(() => expect(api.getTransactions).toHaveBeenLastCalledWith({ page: 1, pageSize: 20, status: 'Pending', search: 'minh' }))
  })

  it('không có giao dịch → thông báo trống; lỗi tải → onNotify error', async () => {
    api.getTransactions.mockResolvedValueOnce(listPage([]))
    render(<SubscriptionsView onNotify={onNotify} />)
    expect(await screen.findByText('Không tìm thấy giao dịch nào.')).toBeInTheDocument()

    api.getPlans.mockRejectedValueOnce(new Error('Network'))
    await userEvent.selectOptions(screen.getByRole('combobox'), 'Failed')
    await waitFor(() => expect(onNotify).toHaveBeenCalledWith('Lỗi tải dữ liệu gói & giao dịch: Network', 'error'))
  })

  it('có hơn 20 giao dịch thì admin chuyển được sang trang 2', async () => {
    const page1 = Array.from({ length: 20 }, (_, i) => ({ ...transactions[0], id: `tx${i}`, orderCode: 1000 + i }))
    api.getTransactions.mockImplementation(async ({ page }) => (page === 1 ? listPage(page1, 21) : listPage([transactions[1]], 21)))
    const user = userEvent.setup()
    render(<SubscriptionsView onNotify={onNotify} />)
    await screen.findByText('#1000')

    expect(screen.getByText('Hiển thị 1–20 / 21 giao dịch')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Trang sau' }))
    await waitFor(() => expect(api.getTransactions).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2 })))
  })
})
