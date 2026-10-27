import { screen, within } from '@testing-library/react'

// Trả lời hộp xác nhận dùng chung (ConfirmDialog): nút đầu là "Hủy", nút sau là hành động.
// Trả về nội dung hộp thoại để test kiểm tra câu hỏi.
export async function answerConfirm(user, accept = true) {
  const dialog = await screen.findByRole('alertdialog')
  const text = dialog.textContent
  const [cancel, confirm] = within(dialog).getAllByRole('button')
  await user.click(accept ? confirm : cancel)
  return text
}
