---
description: Review UI/UX của diff hiện tại so với docs/design.md, artboard trong design/ và checklist §57
argument-hint: [tên màn hình / feature / artboard, tùy chọn]
---

Review các thay đổi UI trong `frontend/SmartMeal/`.
Phạm vi: $ARGUMENTS nếu có (màn hình, feature hoặc artboard); nếu không, dùng `git status` + `git diff`.

Giao việc cho agent `ui-consistency-reviewer` (chỉ review, KHÔNG sửa code).
Với mỗi screen thay đổi: mở artboard tương ứng trong `design/*.dc.html` và đối chiếu với
`docs/design.md` (đặc biệt checklist §57) và `CLAUDE.md` §6, §9.

### Structure
- Mỗi màn có một mục tiêu chính, primary action rõ ràng, chỉ 1 nút primary.
- Thứ tự section, nội dung và điều hướng đúng artboard (link `href="X.dc.html"`).
- Nội dung nhóm hợp lý, không có section thừa hay thiếu so với design.

### Visual
- Chỉ dùng token NativeWind ngữ nghĩa (`bg-surface`, `text-text-secondary`, `p-md`, `rounded-card`,
  `text-h3`…). Không hex, không màu Tailwind mặc định, không giá trị tùy ý, không `dark:` cho màu token.
- Typography đúng thang (Display / H1 / H2 / H3 / Body / Caption), không quá nhiều cỡ chữ trên một màn.
- Spacing theo hệ 4px; radius đúng (button/input 12, card 16, hero 20, sheet 24, chip pill).
- Shadow nhẹ; semantic color chỉ dùng cho trạng thái (design §4.8).

### Dark mode
- Màn hiển thị đúng ở cả light và dark: không màu cố định chỉ hợp light, contrast đủ,
  màu icon/placeholder lấy từ `useTheme()`.

### Mobile UX
- Touch target ≥ 44×44 (hoặc có `hitSlop`), khoảng cách giữa các action ≥ 8.
- Có SafeArea, cuộn được khi nội dung dài, bottom sheet/dialog đúng pattern.
- Bàn phím không che input (KeyboardAvoidingView / scroll) ở màn có form.

### State
- Đủ Loading (skeleton) / Empty / Error / Success / Disabled cho dữ liệu bất đồng bộ,
  dùng `LoadingState` / `EmptyState` / `ErrorState` thay vì viết tay.
- Service mock xử lý đúng `MOCK_SCENARIO` để xem được mọi trạng thái.
- Error message thân thiện, có hành động ("Thử lại"), không hiện lỗi kỹ thuật.

### Nghiệp vụ trên UI
- Kết quả AI ghi "ước tính" (≈) và cần user xác nhận / chỉnh sửa trước khi lưu (BR-054, BR-061, BR-062).
- Món/sản phẩm chứa dị ứng bị lọc hoặc cảnh báo rõ, cảnh báo không tô đỏ toàn card (BR-102, BR-140, design §30).
- Không khẳng định "an toàn tuyệt đối" hay thay thế tư vấn y tế (BR-112, BR-291).
- Premium chỉ mở sau khi thanh toán được xác nhận (BR-241).

### Accessibility
- Text đủ contrast (caption dùng `text-text-secondary`, không dùng `text-text-muted`).
- Không truyền tải trạng thái chỉ bằng màu (phải có icon hoặc chữ đi kèm).
- Icon-only có `accessibilityLabel`; có `accessibilityRole` / `accessibilityState` phù hợp.

### Consistency
- Dùng `components/ui` và `components/common` thay vì style riêng cho từng screen.
  Style riêng lẽ ra nên dùng component chung được tính là một finding.

**Kết quả**: danh sách ngắn gọn theo mức độ **Blocking / Should fix / Note**, mỗi mục có
`file:line` và cách sửa cụ thể; kèm danh sách artboard đã đối chiếu. Bỏ qua mục không có vấn đề.
Không tự sửa code; chỉ sửa khi người dùng yêu cầu sau khi xem báo cáo.