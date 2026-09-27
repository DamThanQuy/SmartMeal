---
description: Rà soát diff/branch hiện tại của SmartMeal tìm component trùng lặp, giá trị hard-code và lỗi layering
argument-hint: [phạm vi diff, mặc định là working tree hiện tại]
---

Rà soát thay đổi trong `frontend/SmartMeal/`.
Phạm vi: $ARGUMENTS nếu có; nếu không, dùng `git status` + `git diff` (working tree và staged).

Giao việc cho agent `ui-consistency-reviewer` (chỉ review, KHÔNG sửa code), tập trung vào:

1. **Component trùng lặp**
   - Component mới có chức năng/giao diện giống component đã có trong `src/components/ui/`,
     `src/components/common/` hoặc feature khác. Đọc cả hai bên để xác nhận trước khi kết luận.
   - Dùng `Text` / `Pressable` / `TextInput` thô trong khi `AppText` / `AppButton` /
     `AppIconButton` / `AppInput` đã đáp ứng.
   - Loading / error / empty viết tay thay vì dùng `LoadingState` / `ErrorState` / `EmptyState`.

2. **Hard-code & token**
   - Mã màu hex/rgba viết tay trong className, style hoặc props (màu icon phải lấy từ `useTheme()`).
   - Class màu Tailwind mặc định (`green-500`, `gray-200`, `text-black`…) hoặc giá trị tùy ý
     (`p-[13px]`, `rounded-[10px]`) thay vì token (`bg-surface`, `p-md`, `rounded-card`…).
   - `dark:` cho màu đã là token; spacing/radius/font ngoài thang của `docs/design.md`.
   - URL/base path API, API key/secret, route name viết tay thay vì `src/config/` và
     `src/constants/routes.ts`.
   - Công thức BMI/BMR/TDEE/macro bị lặp ở nhiều nơi.

3. **Layering sai**
   - `axios` / `fetch` trực tiếp trong screen/component thay vì qua feature service → API client.
   - Screen/component import thẳng từ `mocks/` hoặc hard-code mock data trong UI.
   - Import vào ruột feature khác thay vì qua `index.ts`; server data để trong Zustand.

4. **Thiếu state**
   - Màn có dữ liệu bất đồng bộ nhưng thiếu Loading / Empty / Error, hoặc service mock không
     xử lý `MOCK_SCENARIO`.

Tham chiếu: `CLAUDE.md` §6–8, `.claude/rules/component-reuse.md`, `.claude/rules/no-hardcode.md`,
`.claude/rules/architecture.md`, `.claude/rules/state-and-api.md`.

Kết quả: danh sách ngắn gọn, xếp theo mức độ (Blocking → Should fix → Notes), mỗi mục có
`file:line` và cách sửa cụ thể. Bỏ qua mục không có vấn đề. Không tự sửa code; chỉ sửa khi
người dùng yêu cầu sau khi xem báo cáo.