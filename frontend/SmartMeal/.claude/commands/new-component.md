---
description: Tạo mới hoặc mở rộng một shared/feature component cho SmartMeal, đúng reuse-first + no-hardcode + NativeWind token
argument-hint: <tên component> [ui|common|feature:<tên-feature>] [artboard, ví dụ Dashboard]
---

Yêu cầu: tạo hoặc mở rộng component `$ARGUMENTS` cho app SmartMeal (`frontend/SmartMeal/`).

Giao việc cho agent `rn-component-builder`, thực hiện đúng thứ tự:

1. **Đọc context**: `CLAUDE.md` §6–7, `.claude/rules/component-reuse.md`, `.claude/rules/no-hardcode.md`,
   `.claude/rules/typescript-mobile.md`, `src/theme/`, `tailwind.config.js`.
   Nếu có tên artboard → đọc thêm `design/<Artboard>.dc.html` để lấy đúng bố cục và trạng thái.

2. **Tìm component có sẵn**: grep/glob trong `src/components/ui/`, `src/components/common/`,
   `src/features/*/components/`. Đọc kỹ trước khi kết luận là chưa có.

3. **Reuse > Extend > Create new**:
   - Đã có component phù hợp → dùng lại, không tạo file.
   - Gần phù hợp → mở rộng bằng prop/variant (`cva`), KHÔNG tạo file mới.
   - Thực sự cần tạo mới → chọn đúng layer:
     - `components/ui/` — primitive chung (`AppXxx`), không business logic, không API/mock/store/navigation.
     - `components/common/` — UI chung có logic hiển thị (loading/empty/error/wrapper/section).
     - `features/<feature>/components/` — gắn với nghiệp vụ, dựng từ primitive trong `components/ui`.

4. **Token**: chỉ dùng className token ngữ nghĩa (`bg-surface`, `text-text-secondary`, `p-md`,
   `rounded-card`, `text-h3`…). Không hex, không class màu Tailwind mặc định, không giá trị tùy ý,
   không `dark:` cho màu token. Màu cần dùng trong JS (icon, placeholder, chart) lấy từ `useTheme()`.
   Thiếu token → thêm vào `src/theme` + `tailwind.config.js`, chỉ lấy giá trị từ `docs/design.md`.

5. **Chuẩn TSX**: interface `<Name>Props` export, named export, không `any`; touch target ≥ 44
   (hoặc `hitSlop`); `accessibilityRole`/`accessibilityLabel`/`accessibilityState`; có trạng thái
   pressed / disabled / loading (và focus / error cho input); hiển thị đúng ở light và dark.

6. **Kiểm tra**: `npx tsc --noEmit` và `npm run lint`.

7. **Báo cáo**:
   - Đã tái sử dụng / mở rộng / tạo mới gì (kèm đường dẫn file).
   - Prop/variant mới thêm.
   - Token mới thêm (nếu có) và lấy từ mục nào của design.md.
   - 1 đoạn JSX ví dụ cách dùng.