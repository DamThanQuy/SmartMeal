# SmartMeal — Prompt dựng UI mock theo phase

Dán nguyên khối của phase tương ứng vào Claude Code. Làm lần lượt, `/clear` giữa các phase.

## Phase 0 — Setup (đang chạy)

```
Đọc CLAUDE.md. Làm Phase 0:
- Cài & cấu hình NativeWind (className, tailwind.config.js lấy token từ src/theme, dark mode qua CSS variables)
- Chuyển theme mode (system/light/dark) sang lưu bằng MMKV qua src/services/storage
- Tạo UI primitives: AppText, AppButton, AppIconButton, AppInput, AppCard, AppChip, AppBottomSheet
- Tạo common: ScreenContainer, SectionHeader, LoadingState, EmptyState, ErrorState
- Wire App.tsx: SafeAreaProvider > ThemeProvider > NavigationContainer, khung AppNavigator/AuthNavigator/MainNavigator
- Tạo src/config/mock.ts với MOCK_SCENARIO = 'success' | 'empty' | 'error' | 'slow'
- Tạo màn Dev/ThemePreview hiển thị mọi component + nút đổi System/Light/Dark
- Tạo docs/ui-progress.md: bảng | Artboard | Feature | Screen file | Trạng thái | Ghi chú |
  liệt kê đủ 47 artboard trong design/screens.json, trạng thái ban đầu = todo

Chạy npx tsc --noEmit + npm run lint, sửa hết lỗi.
Báo cáo: file tạo/sửa, việc còn thiếu. Xong thì DỪNG, không tự làm Phase 1.
```

## Phase 1 — Auth + Health Profile

```
Đọc CLAUDE.md, docs/ui-progress.md, design/screens.json.
Xác nhận Phase 0 đã xong (tsc/lint sạch). Chưa xong thì dừng và báo tôi.

Làm Phase 1 — auth + health:
Artboard: Main (Login), Register, OTP, ForgotPassword, HealthProfile, HPActivity, HPAllergy, HealthResult

- Đọc business_rule.md (BR-010→BR-024) và đúng artboard trong design/ trước khi code từng màn.
- Chỉ mock UI, không gọi API thật. Mock trong src/features/auth/mocks và src/features/health/mocks,
  đúng 1 TODO mỗi service, xử lý theo MOCK_SCENARIO.
- Đăng nhập/đăng ký mock: bấm nút là điều hướng tiếp, không kiểm tra thật.
- Health Profile 7 bước dùng chung 1 flow state, progress bar đúng bước theo design.
- Dùng components/ui, components/common từ Phase 0. Thiếu gì mới thì tạo đúng layer, không trùng.
- NativeWind token, kiểm tra cả light và dark. Có Loading/Error cho thao tác bất đồng bộ (gửi OTP...).

Xong: tsc --noEmit + lint sạch, cập nhật ui-progress.md, báo cáo theo mẫu CLAUDE.md §10.
DỪNG, không tự làm Phase 2.
```

## Phase 2 — Dashboard + Ghi bữa ăn (AI/Voice)

```
Đọc CLAUDE.md, docs/ui-progress.md. Xác nhận Phase 1 đã done, chưa thì dừng và báo.

Làm Phase 2 — dashboard + log:
Artboard: Dashboard, QuickLog, AICamera, AIAnalyzing, AISnap, VoiceLog,
          StateLoading, StateAIFailed, StateAILimit

- Đọc business_rule.md (BR-040, BR-041, BR-054, BR-060→BR-072, BR-190, BR-191, BR-233, BR-252)
  và đúng artboard trong design/.
- Mock UI only. AI Snap/Voice: service mock trả kết quả giả lập theo MOCK_SCENARIO
  (success/slow/error/empty), có nút "giả lập kết quả" thay camera/mic thật.
- Bắt buộc: kết quả AI ghi "≈ ước tính", có bước User Review → Confirm trước khi lưu vào diary state.
- QuickLog là bottom sheet, dẫn sang AICamera/VoiceLog/FoodSearch/Barcode (link theo design).
- StateAILimit: khi hết lượt AI mock (đặt giới hạn cứng trong mock, ví dụ 5/ngày) → hiện màn hết lượt.
- NativeWind token, light/dark, Loading/Error/Empty đủ theo design.

Xong: tsc --noEmit + lint sạch, cập nhật ui-progress.md, báo cáo. DỪNG, không tự làm Phase 3.
```

## Phase 3 — Nhật ký dinh dưỡng

```
Đọc CLAUDE.md, docs/ui-progress.md. Xác nhận Phase 2 đã done, chưa thì dừng và báo.

Làm Phase 3 — nutrition:
Artboard: Diary, FoodSearch, FoodDetail, EditMealLog, ProgressChart, DeleteConfirm, SaveSuccess

- Đọc business_rule.md (BR-050→BR-054) và đúng artboard trong design/.
- Mock UI only. Diary đọc/ghi vào state mock (feature nutrition), FoodSearch/FoodDetail dùng
  mock food database khớp SmartMeal_API_Contract.md.
- Sửa/xóa log (EditMealLog, DeleteConfirm) cập nhật lại state mock, có toast SaveSuccess.
- ProgressChart: dùng react-native-gifted-charts với dữ liệu mock 7 ngày.
- NativeWind token, light/dark, đủ Loading/Empty/Error.

Xong: tsc --noEmit + lint sạch, cập nhật ui-progress.md, báo cáo. DỪNG, không tự làm Phase 4.
```

## Phase 4 — Scanner

```
Đọc CLAUDE.md, docs/ui-progress.md. Xác nhận Phase 3 đã done, chưa thì dừng và báo.

Làm Phase 4 — scanner:
Artboard: Barcode, ProductNotFound, OCRReview, Fridge, StatePermission

- Đọc business_rule.md (BR-080→BR-083, BR-120→BR-132, BR-140, BR-141) và đúng artboard trong design/.
- Mock UI only, không gọi Vision Camera/ML Kit thật — nút "giả lập quét" trả kết quả mock
  (sản phẩm tìm thấy / không tìm thấy / cảnh báo dị ứng, theo MOCK_SCENARIO).
- Barcode/OCR: cảnh báo dị ứng chỉ tô icon/border, không tô đỏ toàn card (design §30).
- Fridge Scanner: nguyên liệu cần xác nhận trước khi gợi ý món (không tự lưu).
- StatePermission: mô phỏng màn xin quyền camera bị từ chối.
- NativeWind token, light/dark.

Xong: tsc --noEmit + lint sạch, cập nhật ui-progress.md, báo cáo. DỪNG, không tự làm Phase 5.
```

## Phase 5 — Khám phá công thức

```
Đọc CLAUDE.md, docs/ui-progress.md. Xác nhận Phase 4 đã done, chưa thì dừng và báo.

Làm Phase 5 — recipes:
Artboard: Discovery, FilterSheet, RecipeDetail, Favorites, StateError

- Đọc business_rule.md (BR-090→BR-092, BR-100→BR-102, BR-280, BR-281, BR-290, BR-291)
  và đúng artboard trong design/.
- Mock UI only, mock recipe database khớp SmartMeal_API_Contract.md.
- Gợi ý phải lọc theo dị ứng/chế độ ăn mock của user (ghi rõ "Đã loại món chứa..." như design).
- RecipeDetail: không ghi "an toàn tuyệt đối" (BR-291), có nút "Thêm vào thực đơn".
- Favorites/Collections thao tác trên state mock cục bộ.
- StateError: mô phỏng lỗi mạng khi tải Discovery, có nút Thử lại.
- NativeWind token, light/dark.

Xong: tsc --noEmit + lint sạch, cập nhật ui-progress.md, báo cáo. DỪNG, không tự làm Phase 6.
```

## Phase 6 — Thực đơn + Đi chợ

```
Đọc CLAUDE.md, docs/ui-progress.md. Xác nhận Phase 5 đã done, chưa thì dừng và báo.

Làm Phase 6 — meal-planner + grocery:
Artboard: MealPlanner, SlotPicker, Grocery

- Đọc business_rule.md (BR-160→BR-174) và đúng artboard trong design/.
- Mock UI only. Chọn món cho từng slot (SlotPicker) cập nhật MealPlanner state mock.
- Grocery: sinh từ MealPlanner mock, cộng dồn nguyên liệu trùng (BR-171), nhóm theo category (BR-172),
  check-off Pending/Purchased (BR-173), ước tính chi phí (BR-174, ghi rõ là ước tính).
- NativeWind token, light/dark.

Xong: tsc --noEmit + lint sạch, cập nhật ui-progress.md, báo cáo. DỪNG, không tự làm Phase 7.
```

## Phase 7 — Cá nhân

```
Đọc CLAUDE.md, docs/ui-progress.md. Xác nhận Phase 6 đã done, chưa thì dừng và báo.

Làm Phase 7 — profile:
Artboard: Profile, HealthSettings, WeightHistory, HealthConnect, Reminders, Notifications

- Đọc business_rule.md (BR-001→BR-003, BR-180→BR-183, BR-220→BR-222) và đúng artboard trong design/.
- Mock UI only. HealthSettings sửa dị ứng/bệnh lý/chế độ ăn → cập nhật state mock dùng chung cho
  Recipes/MealPlanner nếu đã làm (đảm bảo lọc dị ứng nhất quán toàn app).
- WeightHistory: cập nhật cân nặng mock → tính lại BMI/BMR/TDEE hiển thị (dùng đúng 1 hàm tính chung).
- HealthConnect: mô phỏng đồng bộ (nút "Đồng bộ ngay" cập nhật số liệu mock, không gọi Health Connect thật).
- Reminders/Notifications: danh sách mock, toggle lưu vào state.
- NativeWind token, light/dark.

Xong: tsc --noEmit + lint sạch, cập nhật ui-progress.md, báo cáo. DỪNG, không tự làm Phase 8.
```

## Phase 8 — Gamification + Premium

```
Đọc CLAUDE.md, docs/ui-progress.md. Xác nhận Phase 7 đã done, chưa thì dừng và báo.

Làm Phase 8 — gamification + premium:
Artboard: Pet, Premium, PaymentSuccess, PaymentPending

- Đọc business_rule.md (BR-200→BR-212, BR-230→BR-242) và đúng artboard trong design/.
- Mock UI only. Pet: XP/Level/Streak tính từ hành động mock trong Diary/Health (BR-202: không cộng
  trùng XP cho cùng 1 sự kiện).
- Premium: bấm "Nâng cấp Pro" → PaymentPending (mock) → PaymentSuccess hoặc trạng thái lỗi, KHÔNG tự
  kích hoạt Premium khi chưa qua bước "xác nhận thành công" (BR-241, BR-242).
- NativeWind token, light/dark.

Xong: tsc --noEmit + lint sạch, cập nhật ui-progress.md, báo cáo.
Đây là phase cuối — tổng kết: liệt kê toàn bộ 47 artboard trong ui-progress.md kèm trạng thái,
mọi TODO còn lại của cả dự án mock UI.
```