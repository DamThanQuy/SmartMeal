import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import RecipesView from '../../components/RecipesView'
import { api } from '../../services/api'
import { recipeDetail, recipes, setupApi } from '../../test/fixtures'

vi.mock('../../services/api', async (importOriginal) => (await import('../../test/mockApi.js')).mockApiModule(importOriginal))

let onNotify
let confirmSpy

const cardOf = async (title) => (await screen.findByRole('heading', { level: 4, name: title })).closest('.card')
const modal = () => document.querySelector('.modal-content')
const titleInput = () => within(modal()).getByPlaceholderText('VD: Salad ức gà sốt mè rang bơ sáp')
const submit = () => within(modal()).getByRole('button', { name: /Tạo Món Ăn Mới|Lưu Thay Đổi|Đang lưu/ })
const chip = (label) => within(modal()).getByText((_, el) => el.classList?.contains('tag-chip') && el.textContent.includes(label))

async function renderLoaded(props = {}) {
  const user = userEvent.setup()
  render(<RecipesView onNotify={onNotify} {...props} />)
  await screen.findByText('Salad ức gà')
  return user
}

async function openCreate(user) {
  await user.click(screen.getByRole('button', { name: /Thêm Món Ăn Mới/ }))
  return modal()
}

beforeEach(() => {
  setupApi(api)
  onNotify = vi.fn()
  confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
})

describe('RecipesView — lưới món ăn & bộ lọc', () => {
  it('nạp trang 1 (16 món/trang) và hiển thị kcal làm tròn, thời gian, protein, độ khó, nhãn Pro, tối đa 3 tag', async () => {
    await renderLoaded()

    expect(api.getRecipes).toHaveBeenCalledWith({ page: 1, pageSize: 16, search: '', mealType: '', difficulty: '' })
    const salad = await cardOf('Salad ức gà')
    expect(within(salad).getByText(/350 kcal/)).toBeInTheDocument()
    expect(within(salad).getByText(/15 phút/)).toBeInTheDocument()
    expect(within(salad).getByText('32g P')).toBeInTheDocument()
    expect(within(salad).getByText('Dễ')).toBeInTheDocument()
    expect(within(salad).getByText(/Pro/)).toBeInTheDocument()
    expect(within(salad).getAllByText(/^#/)).toHaveLength(3)
    const bo = await cardOf('Bò kho')
    expect(within(bo).getByText('Khó')).toHaveClass('badge-danger')
    expect(within(bo).getByText('Chưa có mô tả ngắn cho món ăn này.')).toBeInTheDocument()
    expect(within(bo).queryByText(/Pro/)).not.toBeInTheDocument()
  })

  it('ảnh lỗi được thay bằng ảnh mặc định', async () => {
    await renderLoaded()
    const img = screen.getByAltText('Bò kho')

    fireEvent.error(img)

    expect(img.getAttribute('src')).toContain('images.unsplash.com')
  })

  it('đổi bộ lọc bữa ăn, độ khó và ô tìm kiếm thì nạp lại', async () => {
    const user = await renderLoaded()
    const [mealSelect, diffSelect] = screen.getAllByRole('combobox')

    await user.selectOptions(mealSelect, 'Dinner')
    await user.selectOptions(diffSelect, 'Hard')
    await user.type(screen.getByPlaceholderText('Tìm theo tên món ăn, mô tả...'), 'bò')

    await waitFor(() => expect(api.getRecipes).toHaveBeenLastCalledWith({ page: 1, pageSize: 16, search: 'bò', mealType: 'Dinner', difficulty: 'Hard' }))
  })

  it('không có món → hiện thông báo trống; lỗi tải → onNotify error', async () => {
    api.getRecipes.mockResolvedValueOnce([])
    render(<RecipesView onNotify={onNotify} />)
    expect(await screen.findByText('Không tìm thấy món ăn nào')).toBeInTheDocument()

    api.getRecipes.mockRejectedValueOnce(new Error('timeout'))
    await userEvent.selectOptions(screen.getAllByRole('combobox')[0], 'Snack')
    await waitFor(() => expect(onNotify).toHaveBeenCalledWith('Lỗi tải danh sách món ăn: timeout', 'error'))
  })

  it('có hơn 16 món thì admin chuyển được sang trang 2', async () => {
    const page1 = Array.from({ length: 16 }, (_, i) => ({ ...recipes[1], id: `r${i}`, title: `Món ${i}` }))
    api.getRecipes.mockImplementation(async ({ page }) => (page === 1 ? page1 : [recipes[0]]))
    const user = userEvent.setup()
    render(<RecipesView onNotify={onNotify} />)
    await screen.findByText('Món 0')

    // DB đã có 56 món (seed) — không có phân trang thì 40 món còn lại không thể xem / sửa / xóa từ lưới.
    const next = screen.queryByRole('button', { name: /Trang sau|Sau|Tiếp|›|»|^2$/ })
    expect(next).not.toBeNull()
    await user.click(next)
    await waitFor(() => expect(api.getRecipes).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2 })))
  })
})

describe('RecipesView — thêm món', () => {
  it('form mặc định: bữa Trưa, tag Eat Clean, 1 nguyên liệu ức gà', async () => {
    const user = await renderLoaded()
    await openCreate(user)

    expect(within(modal()).getByText('Thêm Món Ăn Mới Vào Cơ Sở Dữ Liệu')).toBeInTheDocument()
    expect(chip('Bữa Trưa')).toHaveClass('selected')
    expect(chip('Eat Clean')).toHaveClass('selected')
    expect(within(modal()).getByDisplayValue('Ức gà phi lê')).toBeInTheDocument()
  })

  it('gửi payload đầy đủ: mealTypes nối bằng dấu phẩy, tag đã chọn, nguyên liệu đã nhập', async () => {
    const user = await renderLoaded()
    await openCreate(user)

    await user.type(titleInput(), 'Bún gạo lứt chay')
    await user.click(chip('Bữa Tối'))
    await user.click(chip('Thuần Chay (Vegan)'))
    await user.click(chip('Eat Clean'))
    await user.selectOptions(within(modal()).getAllByRole('combobox')[0], 'Medium')
    await user.click(within(modal()).getByRole('checkbox'))
    await user.click(within(modal()).getByRole('button', { name: /Thêm nguyên liệu/ }))
    await user.type(within(modal()).getAllByPlaceholderText('Tên nguyên liệu (VD: Ức gà)')[1], 'Đậu hũ')
    await user.click(submit())

    await waitFor(() => expect(api.createRecipe).toHaveBeenCalledTimes(1))
    const payload = api.createRecipe.mock.calls[0][0]
    expect(payload).toMatchObject({
      title: 'Bún gạo lứt chay', difficulty: 'Medium', isPremium: true, mealTypes: 'Lunch,Dinner', tagCodes: ['vegan'],
      prepTimeMinutes: 10, cookTimeMinutes: 15, servings: 1, caloriesPerServing: 350,
    })
    expect(payload.ingredients.map((i) => i.name)).toEqual(['Ức gà phi lê', 'Đậu hũ'])
    await waitFor(() => expect(onNotify).toHaveBeenCalledWith('Đã thêm món ăn mới vào thực đơn thành công!', 'success'))
    expect(modal()).toBeNull()
    expect(api.getRecipes).toHaveBeenCalledTimes(2)
  })

  it('tên món chỉ có khoảng trắng → báo lỗi, không gọi API', async () => {
    const user = await renderLoaded()
    await openCreate(user)

    await user.type(titleInput(), '   ')
    await user.click(submit())

    expect(onNotify).toHaveBeenCalledWith('Vui lòng nhập tên món ăn.', 'error')
    expect(api.createRecipe).not.toHaveBeenCalled()
  })

  it('không bỏ chọn được bữa ăn cuối cùng; không xóa được nguyên liệu cuối cùng', async () => {
    const user = await renderLoaded()
    await openCreate(user)

    await user.click(chip('Bữa Trưa'))
    expect(chip('Bữa Trưa')).toHaveClass('selected')

    const removeButtons = () => within(modal()).getAllByRole('button').filter((b) => b.classList.contains('btn-danger'))
    expect(removeButtons()[0]).toBeDisabled()
    await user.click(within(modal()).getByRole('button', { name: /Thêm nguyên liệu/ }))
    expect(removeButtons()).toHaveLength(2)
    await user.click(removeButtons()[0])
    expect(within(modal()).queryByDisplayValue('Ức gà phi lê')).not.toBeInTheDocument()
    expect(removeButtons()).toHaveLength(1)
  })

  it('xem trước ảnh khi nhập link ảnh', async () => {
    const user = await renderLoaded()
    await openCreate(user)

    await user.type(within(modal()).getByPlaceholderText('https://images.unsplash.com/photo-...'), 'https://img.example.com/a.jpg')

    expect(within(modal()).getByAltText('Xem trước ảnh món ăn')).toHaveAttribute('src', 'https://img.example.com/a.jpg')
  })

  it('lỗi khi lưu (vd. trùng tên) → báo lỗi, giữ form mở', async () => {
    api.createRecipe.mockRejectedValue(new Error('Tên món ăn này đã tồn tại trong hệ thống.'))
    const user = await renderLoaded()
    await openCreate(user)

    await user.type(titleInput(), 'Salad ức gà')
    await user.click(submit())

    await waitFor(() => expect(onNotify).toHaveBeenCalledWith('Lỗi lưu món ăn: Tên món ăn này đã tồn tại trong hệ thống.', 'error'))
    expect(modal()).not.toBeNull()
    expect(submit()).toBeEnabled()
  })

  it('initialOpenAdd mở sẵn form và báo App reset cờ', async () => {
    const onResetAddTrigger = vi.fn()
    render(<RecipesView onNotify={onNotify} initialOpenAdd onResetAddTrigger={onResetAddTrigger} />)

    expect(await screen.findByText('Thêm Món Ăn Mới Vào Cơ Sở Dữ Liệu')).toBeInTheDocument()
    expect(onResetAddTrigger).toHaveBeenCalledTimes(1)
  })

  it('đóng form bằng nút Hủy hoặc bấm ra ngoài', async () => {
    const user = await renderLoaded()
    await openCreate(user)
    await user.click(within(modal()).getByRole('button', { name: 'Hủy' }))
    expect(modal()).toBeNull()

    await openCreate(user)
    await user.click(document.querySelector('.modal-overlay'))
    expect(modal()).toBeNull()
  })

  it('nhãn tag "quick" khớp định nghĩa của backend (Nhanh Gọn < 15 phút)', async () => {
    const user = await renderLoaded()
    await openCreate(user)

    // Backend: Tag quick = "Nhanh Gọn (< 15 phút)"; app mobile cũng lọc ≤ 15 phút. Ghi "Dưới 20p" khiến admin gắn nhầm món 16–19 phút.
    expect(within(modal()).getByText(/Nhanh/).textContent).toMatch(/15/)
  })
})

describe('RecipesView — sửa & xóa món', () => {
  it('sửa: nạp chi tiết, tách mealTypes "Breakfast, Lunch" và gửi updateRecipe', async () => {
    const user = await renderLoaded()

    await user.click(within(await cardOf('Salad ức gà')).getByRole('button', { name: /Sửa/ }))

    expect(api.getRecipeDetail).toHaveBeenCalledWith('r1')
    expect(await screen.findByText('Chỉnh Sửa Món Ăn')).toBeInTheDocument()
    expect(titleInput()).toHaveValue('Salad ức gà')
    expect(chip('Bữa Sáng')).toHaveClass('selected')
    expect(chip('Bữa Trưa')).toHaveClass('selected')
    await user.clear(titleInput())
    await user.type(titleInput(), 'Salad ức gà sốt mè')
    await user.click(submit())

    await waitFor(() => expect(api.updateRecipe).toHaveBeenCalledWith('r1', expect.objectContaining({
      title: 'Salad ức gà sốt mè', mealTypes: 'Breakfast,Lunch', tagCodes: ['eatClean'], isPremium: true,
    })))
    await waitFor(() => expect(onNotify).toHaveBeenCalledWith('Đã cập nhật món ăn thành công!', 'success'))
  })

  it('sửa món chưa có nguyên liệu → dùng nguyên liệu mặc định; thiếu mealTypes → bữa Trưa', async () => {
    api.getRecipeDetail.mockResolvedValue({ ...recipeDetail, mealTypes: '', ingredients: [] })
    const user = await renderLoaded()

    await user.click(within(await cardOf('Salad ức gà')).getByRole('button', { name: /Sửa/ }))

    await screen.findByText('Chỉnh Sửa Món Ăn')
    expect(chip('Bữa Trưa')).toHaveClass('selected')
    expect(within(modal()).getByDisplayValue('Ức gà phi lê')).toBeInTheDocument()
  })

  it('lỗi tải chi tiết → báo lỗi, không mở form', async () => {
    api.getRecipeDetail.mockRejectedValue(new Error('Không tìm thấy món ăn.'))
    const user = await renderLoaded()

    await user.click(within(await cardOf('Salad ức gà')).getByRole('button', { name: /Sửa/ }))

    await waitFor(() => expect(onNotify).toHaveBeenCalledWith('Không thể tải chi tiết món ăn: Không tìm thấy món ăn.', 'error'))
    expect(modal()).toBeNull()
  })

  it('xóa sau khi xác nhận thì gọi deleteRecipe và nạp lại; hủy thì không xóa', async () => {
    const user = await renderLoaded()

    confirmSpy.mockReturnValueOnce(false)
    await user.click(within(await cardOf('Bò kho')).getByTitle('Xóa món ăn'))
    expect(api.deleteRecipe).not.toHaveBeenCalled()

    await user.click(within(await cardOf('Bò kho')).getByTitle('Xóa món ăn'))
    expect(api.deleteRecipe).toHaveBeenCalledWith('r2')
    await waitFor(() => expect(onNotify).toHaveBeenCalledWith('Đã xóa món ăn thành công!', 'success'))
  })

  it('xóa lỗi (vd. món đã có trong nhật ký người dùng) → báo thất bại', async () => {
    api.deleteRecipe.mockRejectedValue(new Error('Đã xảy ra lỗi hệ thống.'))
    const user = await renderLoaded()

    await user.click(within(await cardOf('Bò kho')).getByTitle('Xóa món ăn'))

    await waitFor(() => expect(onNotify).toHaveBeenCalledWith('Xóa món ăn thất bại: Đã xảy ra lỗi hệ thống.', 'error'))
  })
})
