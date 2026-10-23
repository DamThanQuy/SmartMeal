import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import Pagination from '../../components/Pagination'

const prev = () => screen.getByRole('button', { name: 'Trang trước' })
const next = () => screen.getByRole('button', { name: 'Trang sau' })

describe('Pagination', () => {
  it('ẩn khi mọi bản ghi nằm gọn trong trang đầu', () => {
    const { container } = render(<Pagination page={1} pageSize={15} total={15} onPageChange={vi.fn()} />)

    expect(container).toBeEmptyDOMElement()
  })

  it('trang đầu: hiển thị khoảng bản ghi, tổng số trang và khóa nút "Trang trước"', () => {
    render(<Pagination page={1} pageSize={16} total={56} onPageChange={vi.fn()} itemLabel="món ăn" />)

    expect(screen.getByText('Hiển thị 1–16 / 56 món ăn')).toBeInTheDocument()
    expect(screen.getByText('Trang 1 / 4')).toBeInTheDocument()
    expect(prev()).toBeDisabled()
    expect(next()).toBeEnabled()
  })

  it('bấm "Trang sau" / "Trang trước" báo trang kế tiếp / trước đó', async () => {
    const onPageChange = vi.fn()
    render(<Pagination page={2} pageSize={16} total={56} onPageChange={onPageChange} />)

    await userEvent.click(next())
    await userEvent.click(prev())

    expect(onPageChange.mock.calls).toEqual([[3], [1]])
  })

  it('trang cuối: khoảng bản ghi kết thúc ở tổng số và khóa nút "Trang sau"', () => {
    render(<Pagination page={4} pageSize={16} total={56} onPageChange={vi.fn()} itemLabel="món ăn" />)

    expect(screen.getByText('Hiển thị 49–56 / 56 món ăn')).toBeInTheDocument()
    expect(next()).toBeDisabled()
  })

  it('vẫn hiện để quay lại khi đang ở trang lớn hơn số trang (vd. vừa xóa bản ghi cuối)', () => {
    render(<Pagination page={2} pageSize={15} total={15} onPageChange={vi.fn()} />)

    expect(screen.getByText('Trang 2 / 1')).toBeInTheDocument()
    expect(prev()).toBeEnabled()
  })
})
