import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import DashboardView from '../../components/DashboardView'
import { stats } from '../../test/fixtures'

const card = (label) => screen.getByText(label).closest('.stat-card')
const panel = (title) => screen.getByRole('heading', { name: title }).closest('.card')

describe('DashboardView', () => {
  it('hiện trạng thái đang tải khi chưa có thống kê', () => {
    render(<DashboardView stats={null} onNavigate={vi.fn()} />)

    expect(screen.getByText('Đang tải dữ liệu tổng quan...')).toBeInTheDocument()
  })

  it('4 thẻ số liệu: người dùng (hoạt động / bị khóa), Pro + tỉ lệ chuyển đổi, số món, doanh thu VND', () => {
    render(<DashboardView stats={stats} onNavigate={vi.fn()} />)

    expect(within(card('Tổng Người Dùng')).getByText('40')).toBeInTheDocument()
    expect(within(card('Tổng Người Dùng')).getByText('38 đang hoạt động')).toBeInTheDocument()
    expect(within(card('Tổng Người Dùng')).getByText('• 2 bị khóa')).toBeInTheDocument()
    expect(within(card('Thành Viên Pro / VIP')).getByText('Tỉ lệ chuyển đổi: 25%')).toBeInTheDocument()
    expect(within(card('Thực Đơn Món Ăn')).getByText('40')).toBeInTheDocument()
    expect(within(card('Doanh Thu Thành Viên')).getByText(/^1\.250\.000\s₫$/)).toBeInTheDocument()
    expect(within(card('Doanh Thu Thành Viên')).getByText(/Tháng này: 158\.000\s₫/)).toBeInTheDocument()
  })

  it('không hiện "bị khóa" khi không có tài khoản bị khóa và tỉ lệ 0% khi chưa có người dùng', () => {
    render(<DashboardView stats={{ ...stats, totalUsers: 0, proUsers: 0, lockedUsers: 0, activeUsers: 0 }} onNavigate={vi.fn()} />)

    expect(screen.queryByText(/bị khóa/)).not.toBeInTheDocument()
    expect(screen.getByText('Tỉ lệ chuyển đổi: 0%')).toBeInTheDocument()
  })

  it('phân bổ thực đơn theo bữa: số món và phần trăm trên tổng số món', () => {
    render(<DashboardView stats={stats} onNavigate={vi.fn()} />)
    const meals = panel('Phân Bổ Thực Đơn Theo Bữa')

    expect(within(meals).getByText('Bữa Sáng')).toBeInTheDocument()
    expect(within(meals).getByText('10 món (25%)')).toBeInTheDocument()
    expect(within(meals).getByText('20 món (50%)')).toBeInTheDocument()
    expect(within(meals).getByText('Bữa Phụ (Snack)')).toBeInTheDocument()
    expect(within(meals).getByText('2 món (5%)')).toBeInTheDocument()
  })

  it('gói thành viên: tên, giá / chu kỳ, nhãn phổ biến và số người dùng', () => {
    render(<DashboardView stats={stats} onNavigate={vi.fn()} />)
    const plansPanel = panel('Gói Thành Viên Đang Phát Hành')

    expect(within(plansPanel).getByText(/79\.000\s₫ \/ 30 ngày/)).toBeInTheDocument()
    expect(within(plansPanel).getByText('Phổ biến')).toBeInTheDocument()
    expect(within(plansPanel).getByText('3 người')).toBeInTheDocument()
  })

  it('giao dịch gần đây hiển thị đúng nhãn trạng thái Paid / Pending / Failed', () => {
    render(<DashboardView stats={stats} onNavigate={vi.fn()} />)
    const rows = within(panel('Giao Dịch Gần Đây')).getAllByRole('row').slice(1)

    expect(within(rows[0]).getByText('Đã thanh toán')).toBeInTheDocument()
    expect(within(rows[1]).getByText('Đang chờ')).toBeInTheDocument()
    expect(within(rows[2]).getByText('Thất bại')).toBeInTheDocument()
    expect(within(rows[1]).getByText(/699\.000\s₫/)).toBeInTheDocument()
  })

  it('người dùng mới: vai trò, gói và tên mặc định khi thiếu họ tên', () => {
    render(<DashboardView stats={stats} onNavigate={vi.fn()} />)
    const rows = within(panel('Người Dùng Mới Đăng Ký')).getAllByRole('row').slice(1)

    expect(within(rows[0]).getByText('Pro VIP')).toBeInTheDocument()
    expect(within(rows[1]).getByText('Người dùng')).toBeInTheDocument()
    expect(within(rows[1]).getByText('Admin')).toHaveClass('badge-info')
    expect(within(rows[1]).getByText('Free')).toBeInTheDocument()
  })

  it('hiện thông báo trống khi chưa có giao dịch / người dùng', () => {
    render(<DashboardView stats={{ ...stats, recentTransactions: [], recentUsers: [] }} onNavigate={vi.fn()} />)

    expect(screen.getByText('Chưa có giao dịch nào')).toBeInTheDocument()
    expect(screen.getByText('Chưa có người dùng')).toBeInTheDocument()
  })

  it('các nút "Xem tất cả / Chi tiết / Quản lý" điều hướng sang đúng tab', async () => {
    const onNavigate = vi.fn()
    render(<DashboardView stats={stats} onNavigate={onNavigate} />)

    await userEvent.click(within(panel('Phân Bổ Thực Đơn Theo Bữa')).getByRole('button', { name: /Xem tất cả/ }))
    await userEvent.click(within(panel('Gói Thành Viên Đang Phát Hành')).getByRole('button', { name: /Chi tiết/ }))
    await userEvent.click(within(panel('Giao Dịch Gần Đây')).getByRole('button', { name: /Xem tất cả/ }))
    await userEvent.click(within(panel('Người Dùng Mới Đăng Ký')).getByRole('button', { name: /Quản lý/ }))

    expect(onNavigate.mock.calls.map(([tab]) => tab)).toEqual(['recipes', 'subscriptions', 'subscriptions', 'users'])
  })
})
