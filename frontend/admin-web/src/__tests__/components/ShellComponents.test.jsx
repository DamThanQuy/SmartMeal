import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import Sidebar from '../../components/Sidebar'
import Topbar from '../../components/Topbar'

const MENU = [
  ['dashboard', 'Tổng Quan'],
  ['users', 'Quản Lý Người Dùng'],
  ['recipes', 'Quản Lý Món Ăn'],
  ['rewards', 'Hệ Thống Phần Thưởng'],
  ['system', 'Giám Sát Hệ Thống'],
  ['revenue', 'Báo Cáo Doanh Thu'],
  ['engagement', 'Phân Tích Tương Tác'],
  ['subscriptions', 'Gói Member & Giao Dịch'],
]

describe('Sidebar', () => {
  it('hiển thị đủ 8 mục menu và đánh dấu mục đang mở', () => {
    render(<Sidebar activeTab="rewards" setActiveTab={vi.fn()} user={{ fullName: 'Bảo', role: 'Admin' }} onLogout={vi.fn()} />)

    const items = screen.getAllByRole('button').filter((b) => b.classList.contains('nav-item'))
    expect(items.map((b) => b.textContent)).toEqual(MENU.map(([, label]) => label))
    expect(screen.getByRole('button', { name: 'Hệ Thống Phần Thưởng' })).toHaveClass('active')
    expect(screen.getByRole('button', { name: 'Tổng Quan' })).not.toHaveClass('active')
  })

  it.each(MENU)('bấm mục %s gọi setActiveTab với đúng id', async (id, label) => {
    const setActiveTab = vi.fn()
    render(<Sidebar activeTab="dashboard" setActiveTab={setActiveTab} user={null} onLogout={vi.fn()} />)

    await userEvent.click(screen.getByRole('button', { name: label }))

    expect(setActiveTab).toHaveBeenCalledWith(id)
  })

  it('hiển thị chữ cái đầu, tên và vai trò của admin; nút đăng xuất gọi onLogout', async () => {
    const onLogout = vi.fn()
    render(<Sidebar activeTab="dashboard" setActiveTab={vi.fn()} user={{ fullName: 'Bảo Nguyễn', role: 'Admin' }} onLogout={onLogout} />)

    expect(screen.getByText('B')).toHaveClass('admin-avatar')
    expect(screen.getByText('Bảo Nguyễn')).toBeInTheDocument()
    await userEvent.click(screen.getByTitle('Đăng xuất'))
    expect(onLogout).toHaveBeenCalledTimes(1)
  })

  it('dùng tên/vai trò mặc định khi thiếu thông tin user', () => {
    render(<Sidebar activeTab="dashboard" setActiveTab={vi.fn()} user={{}} onLogout={vi.fn()} />)

    expect(screen.getByText('A')).toHaveClass('admin-avatar')
    expect(screen.getByText('Administrator')).toBeInTheDocument()
    expect(screen.getByText('Admin')).toBeInTheDocument()
  })
})

describe('Topbar', () => {
  it('hiển thị tiêu đề trang và gọi onRefresh khi bấm "Làm mới"', async () => {
    const onRefresh = vi.fn()
    render(<Topbar title="Quản Lý Thực Đơn" onRefresh={onRefresh} isRefreshing={false} onOpenAddRecipe={vi.fn()} />)

    expect(screen.getByRole('heading', { name: 'Quản Lý Thực Đơn' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /Làm mới/ }))
    expect(onRefresh).toHaveBeenCalledTimes(1)
  })

  it('khóa nút "Làm mới" và quay icon khi đang tải', () => {
    const { container } = render(<Topbar title="T" onRefresh={vi.fn()} isRefreshing onOpenAddRecipe={vi.fn()} />)

    expect(screen.getByRole('button', { name: /Làm mới/ })).toBeDisabled()
    expect(container.querySelector('.animate-spin')).not.toBeNull()
  })

  it('chỉ hiện nút "Thêm Món Ăn" khi có handler', async () => {
    const onOpenAddRecipe = vi.fn()
    const { rerender } = render(<Topbar title="T" onRefresh={vi.fn()} isRefreshing={false} onOpenAddRecipe={onOpenAddRecipe} />)

    await userEvent.click(screen.getByRole('button', { name: /Thêm Món Ăn/ }))
    expect(onOpenAddRecipe).toHaveBeenCalledTimes(1)

    rerender(<Topbar title="T" onRefresh={vi.fn()} isRefreshing={false} />)
    expect(screen.queryByRole('button', { name: /Thêm Món Ăn/ })).not.toBeInTheDocument()
  })
})
