import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as XLSX from 'xlsx'
import RecipeExcelImportModal from '../../components/RecipeExcelImportModal'
import { api } from '../../services/api'

vi.mock('../../services/api', async (importOriginal) => (await import('../../test/mockApi.js')).mockApiModule(importOriginal))

let onNotify
let onSuccess
const row = (overrides = {}) => ({ TenMonAn: 'Salad kiểm thử', Calo: 350, NguyenLieu: 'Ức gà: 150g; Dầu: 0,5 ml', ...overrides })
const importButton = () => screen.getByRole('button', { name: /Bắt Đầu Nhập/ })

async function uploadRows(rows) {
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), 'Món ăn')
  const file = new File([XLSX.write(workbook, { type: 'array', bookType: 'xlsx' })], 'mon-an.xlsx')
  fireEvent.change(document.querySelector('input[type="file"]'), { target: { files: [file] } })
  await waitFor(() => expect(onNotify).toHaveBeenCalledWith(expect.stringMatching(/Đã phân tích xong|không có dữ liệu/), expect.any(String)))
}

function openModal() {
  return render(<RecipeExcelImportModal isOpen onClose={vi.fn()} onSuccess={onSuccess} onNotify={onNotify} />)
}

beforeEach(() => {
  onNotify = vi.fn()
  onSuccess = vi.fn()
  api.bulkImportRecipes.mockResolvedValue({ data: { totalSubmitted: 1, totalImported: 1, totalUpdated: 0, totalSkipped: 0, messages: [] } })
})

describe('RecipeExcelImportModal — file thực và API nhập hàng loạt', () => {
  it('ẩn khi đóng và không cho nhập khi chưa có dữ liệu', () => {
    const { rerender } = render(<RecipeExcelImportModal isOpen={false} />)
    expect(screen.queryByText(/Thêm Món Ăn Bằng File Excel/)).not.toBeInTheDocument()
    rerender(<RecipeExcelImportModal isOpen onNotify={onNotify} />)
    expect(importButton()).toBeDisabled()
  })

  it('đọc workbook, giữ thời gian 0 phút và số lượng thập phân, mặc định không ghi đè', async () => {
    openModal()
    await uploadRows([row({ ThoiGianChuanBiPhut: 0, ThoiGianNauPhut: 10, TheTag: 'quick; eatClean', GoiProVip: 'TRUE' })])
    await userEvent.click(importButton())
    expect(api.bulkImportRecipes).toHaveBeenCalledWith([expect.objectContaining({
      title: 'Salad kiểm thử', prepTimeMinutes: 0, cookTimeMinutes: 10, isPremium: true,
      tagCodes: ['quick', 'eatClean'], ingredients: [
        expect.objectContaining({ name: 'Ức gà', amount: 150, unit: 'g' }),
        expect.objectContaining({ name: 'Dầu', amount: 0.5, unit: 'ml' }),
      ],
    })], false)
    expect(await screen.findByText('Kết Quả Nhập Dữ Liệu Thành Công')).toBeInTheDocument()
    expect(onSuccess).toHaveBeenCalledOnce()
  })

  it('hỗ trợ tiêu đề tiếng Anh và chỉ gửi dòng có tên, calo hợp lệ', async () => {
    openModal()
    await uploadRows([{ Title: 'Món hợp lệ', Calories: 200 }, { Title: '', Calories: 200 }, { Title: 'Thiếu calo', Calories: -1 }])
    expect(screen.getByText('2 dòng lỗi')).toBeInTheDocument()
    await userEvent.click(importButton())
    expect(api.bulkImportRecipes).toHaveBeenCalledWith([expect.objectContaining({ title: 'Món hợp lệ', caloriesPerServing: 200 })], false)
  })

  it('chỉ ghi đè khi người dùng bật tùy chọn', async () => {
    openModal()
    await uploadRows([row()])
    await userEvent.click(screen.getByRole('checkbox'))
    await userEvent.click(importButton())
    expect(api.bulkImportRecipes).toHaveBeenCalledWith(expect.any(Array), true)
  })

  it('chọn file mới rỗng phải xóa preview cũ để không nhập nhầm dữ liệu', async () => {
    openModal()
    await uploadRows([row()])
    expect(importButton()).toBeEnabled()
    onNotify.mockClear()
    await uploadRows([])
    expect(importButton()).toBeDisabled()
    expect(screen.queryByText('Salad kiểm thử')).not.toBeInTheDocument()
    expect(api.bulkImportRecipes).not.toHaveBeenCalled()
  })

  it('lỗi API giữ preview để thử lại và không gọi onSuccess', async () => {
    api.bulkImportRecipes.mockRejectedValueOnce(new Error('Mất kết nối'))
    openModal()
    await uploadRows([row()])
    await userEvent.click(importButton())
    await waitFor(() => expect(onNotify).toHaveBeenCalledWith('Nhập file thất bại: Mất kết nối', 'error'))
    expect(importButton()).toBeEnabled()
    expect(onSuccess).not.toHaveBeenCalled()
    await userEvent.click(importButton())
    expect(await screen.findByText('Kết Quả Nhập Dữ Liệu Thành Công')).toBeInTheDocument()
  })

  it('khóa nút nhập trong lúc chờ phản hồi để tránh gửi lặp', async () => {
    let complete
    api.bulkImportRecipes.mockImplementationOnce(() => new Promise(resolve => { complete = resolve }))
    openModal()
    await uploadRows([row()])
    await userEvent.click(importButton())
    expect(screen.getByRole('button', { name: 'Đang nhập dữ liệu...' })).toBeDisabled()
    complete({ data: { totalSubmitted: 1, totalImported: 1, messages: [] } })
    await screen.findByText('Kết Quả Nhập Dữ Liệu Thành Công')
  })
})
