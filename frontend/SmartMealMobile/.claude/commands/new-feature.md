---
description: Scaffold một feature module mới cho SmartMeal (src/features/<feature>/) đúng kiến trúc feature-based + layered, gọi API thật (không mock)
argument-hint: <tên-feature> [artboard1,artboard2,...]
---

Yêu cầu: dựng feature `$ARGUMENTS` cho app SmartMeal (`frontend/SmartMealMobile/`) theo `docs/structure_system.md`.
Tham số 1 là tên feature; tham số 2 (tùy chọn) là danh sách artboard trong `design/` cần dựng.

Giao việc cho agent `rn-feature-scaffolder`, thực hiện đúng thứ tự:

1. **Đọc context**: `CLAUDE.md` §4–10, `.claude/rules/architecture.md`, `.claude/rules/state-and-api.md`,
   `docs/structure_system.md` §2/§11 (giới hạn Expo Go), `docs/ui-progress.md` (xem đã làm gì).

2. **Nghiệp vụ & design**:
   - Phần liên quan trong `docs/business_rule.md` (ghi lại mã BR-xxx: an toàn/dị ứng, AI cần xác nhận, premium…).
   - `docs/design.md` và các artboard `design/*.dc.html` tương ứng (bố cục, nội dung, số liệu mẫu,
     link `href="X.dc.html"`).
   - Shape dữ liệu trong `docs/SmartMeal_API_Contract.md`.

3. **Tên feature**: phải thuộc danh sách chuẩn — `auth`, `health`, `dashboard`, `nutrition`, `recipes`,
   `meal-planner`, `grocery`, `scanner`, `ai`, `gamification`, `premium`, `profile`, `dev`.
   Nếu đã có tên tương ứng thì dùng đúng tên đó, không tạo feature trùng ý nghĩa.

4. **Cấu trúc** (chỉ tạo thư mục con dùng ngay):
```
   src/features/<feature>/
   ├── components/
   ├── hooks/
   ├── screens/
   ├── services/
   ├── types/
   └── index.ts
```

5. **Service**: `xService.api.ts` gọi `api` + `ENDPOINTS` (`src/services/api`), `x.mapper.ts` đổi DTO → type FE,
   `xService.ts` export lại bản API. Không có mock: không tạo `mocks/`/`*.mock.ts`, không seed dữ liệu mẫu.
   Backend chưa có endpoint → báo lại, không bịa dữ liệu.

6. **Hook**: `useQuery` để đọc, `useMutation` cho hành động; chỉ gọi service.
   Query keys khai báo 1 chỗ trong feature.

7. **Screen**: chỉ render UI + gọi hook + điều hướng. Dùng `ScreenContainer`, `LoadingState`,
   `EmptyState`, `ErrorState` trong `src/components/common/`. Thiếu component dùng chung →
   giao cho `rn-component-builder`, không viết tạm trong screen.
   Styling theo `CLAUDE.md` §6 (NativeWind token, không hex). Kiểm tra cả light và dark.

8. **Navigation**: thêm route vào `src/constants/routes.ts`, param type vào `src/navigation/types.ts`,
   đăng ký đúng navigator (Auth / tab Main / stack / modal cho bottom sheet & dialog).

9. **Native (nếu feature cần camera/mic/barcode/health)**: chỉ dùng Expo SDK (`expo-camera`,
   `expo-image-picker`, `expo-av`, `expo-notifications`). Không thêm Vision Camera, ML Kit, MMKV,
   Keychain, Notifee — các package này không chạy trên Expo Go.

10. **Nghiệp vụ trên UI**: kết quả AI ghi "ước tính" (≈) và cần user xác nhận trước khi lưu;
    món chứa dị ứng phải bị lọc hoặc cảnh báo; không khẳng định "an toàn tuyệt đối";
    premium chỉ mở khi thanh toán thành công. Native chưa dùng được trên Expo Go → báo rõ, không trả kết quả giả.

11. **State dùng chung**: chỉ đưa vào `src/state/{auth,app}` khi nhiều feature thực sự cần.

12. **Kiểm tra & cập nhật**: chạy `npx tsc --noEmit`, `npx expo lint`; cập nhật `docs/ui-progress.md`.

13. **Báo cáo**:
    - File đã tạo/sửa, nhóm theo layer (screens / hooks / services / types / navigation).
    - Component/service dùng chung đã tái sử dụng hoặc vừa yêu cầu tạo.
    - Artboard đã dựng và chỗ lệch so với design.
    - BR-xxx đã áp dụng; điểm còn mơ hồ trong `business_rule.md` / `design.md` / API contract cần xác nhận.
