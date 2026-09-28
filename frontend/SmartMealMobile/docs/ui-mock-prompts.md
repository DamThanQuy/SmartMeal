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
# SmartMeal — Prompt cập nhật mock UI (Phase 9 → 14)

Nối tiếp `ui-mock-prompts.md` (Phase 0–8 đã xong 47/47 artboard). Design v2 có thêm 26 màn (tổng 73).
Dán từng khối vào Claude Code. `/clear` giữa các phase. "Phase" ở đây tương đương "Đợt" trong CLAUDE.md §11.

## Phase 8.5 — Đồng bộ design v2 (làm trước, chỉ sửa tài liệu, không code UI)

Trước khi chạy: giải nén `smartmeal-design-v2.zip`, chép thư mục `design/` mới đè lên `frontend/SmartMealMobile/design/`.

```
Design v2 vừa được chép đè vào design/ (73 màn, thêm 26 màn mới so với bản 47 màn).
Đọc CLAUDE.md, docs/ui-progress.md, design/README.md, design/screens.json.

Chỉ cập nhật tài liệu, KHÔNG viết code UI ở bước này:
1. So sánh design/screens.json với docs/ui-progress.md, liệt kê đúng 26 artboard mới:
   Welcome, GuestPrompt, StateSession, Settings, EditProfile, DeleteData,
   FridgeCamera, OCRCamera, AISnapUncertain, VoicePermission, RecipeAllergy, CreateFood,
   GroceryEmpty, GroceryAdd, GroceryDone, PlannerRegenerate, CalorieBudget, StateOffline,
   WaterLog, Challenges, ChallengeComplete, Badges, CollectionDetail, CreateCollection,
   Subscription, PaymentMethod.
2. Thêm 26 hàng vào docs/ui-progress.md, trạng thái = todo, cột Feature theo bảng phase bên dưới.
3. Ghi chú các màn cũ đã đổi link trong design v2 (Profile, Dashboard, Discovery, ProductNotFound,
   Favorites, Pet, Grocery, Premium) vào cột Ghi chú — đây là chỗ code hiện tại cần nối lại.
4. Cập nhật CLAUDE.md: §2 (mockup 73 màn), §11 (thêm Phase 9–14 vào bảng chia đợt).
5. Liệt kê chỗ code đang lệch design v2 (chỉ báo cáo, chưa sửa), ví dụ nút/link đang trỏ tạm
   (ProductNotFound "Nhập thủ công", Favorites "Tạo bộ sưu tập", Notifications → Grocery…).

Báo cáo rồi DỪNG.
```

Bảng phase:

```
Phase 9   auth/profile     Welcome, GuestPrompt, StateSession, Settings, EditProfile, DeleteData
Phase 10  ai/scanner       FridgeCamera, OCRCamera, AISnapUncertain, VoicePermission, RecipeAllergy, CreateFood
Phase 11  planner/grocery  GroceryEmpty, GroceryAdd, GroceryDone, PlannerRegenerate, CalorieBudget, StateOffline
Phase 12  gamification     WaterLog, Challenges, ChallengeComplete, Badges, CollectionDetail, CreateCollection
Phase 13  premium          Subscription, PaymentMethod
Phase 14  rà soát          đồng bộ lệch design, /ui-review, /check-reuse, smoke test
```

## Phase 9 — Onboarding, Guest, Tài khoản, Cài đặt

```
Đọc CLAUDE.md, docs/ui-progress.md. Xác nhận Phase 8.5 đã xong và tsc/lint sạch, chưa thì dừng và báo.

Làm Phase 9 — auth/profile:
Artboard: Welcome, GuestPrompt, StateSession, Settings, EditProfile, DeleteData

- Đọc business_rule.md (§2 Guest, BR-001→BR-003, BR-010→BR-014, BR-270, BR-271) và đúng artboard trong design/.
- Mock UI only. Welcome là màn đầu khi chưa đăng nhập (trước Login); "Khám phá không cần đăng nhập"
  vào Discovery ở chế độ Guest.
- Guest: xem được Discovery/RecipeDetail. Bấm hành động cần tài khoản (yêu thích, thêm vào thực đơn,
  ghi nhật ký) → mở GuestPrompt (bottom sheet/modal). Cần cờ isGuest trong authStore.
- StateSession: mô phỏng phiên hết hạn (BR-014) và tài khoản bị khóa (BR-013) qua MOCK_SCENARIO
  hoặc công tắc trong màn Dev; nút "Đăng nhập lại" xóa session rồi về Login.
- Settings: chế độ giao diện Hệ thống/Sáng/Tối dùng đúng themeMode trong appStore đã có;
  ngôn ngữ VI/EN chỉ lưu lựa chọn (chưa cần i18n đầy đủ, ghi rõ trong ui-progress);
  "Đăng xuất" xóa authStore; icon bánh răng ở Profile đang trỏ ThemePreview → đổi sang Settings,
  ThemePreview chuyển vào mục Dev trong Settings.
- EditProfile: sửa họ tên/năm sinh/giới tính/chiều cao trong userProfileStore; đổi chiều cao hoặc tuổi
  phải tính lại BMI/BMR/TDEE bằng ĐÚNG hàm calculateHealthProfileResult hiện có (BR-003).
  Email chỉ đọc. Đổi avatar: chỉ UI + nút giả lập, không gọi expo-image-picker.
- DeleteData: hiển thị 3 nhóm xóa / giữ / ẩn danh (BR-271); xác nhận bằng checkbox rồi mới bật nút Xóa;
  Xóa = reset các store mock của user rồi về Welcome. Không xóa thật dữ liệu nào ngoài mock.
- NativeWind token, light/dark, Loading/Error khi lưu.

Xong: tsc --noEmit + lint sạch, cập nhật ui-progress.md, báo cáo theo mẫu CLAUDE.md §11. DỪNG, không tự làm Phase 10.
```

## Phase 10 — AI Vision bổ sung & cảnh báo dị ứng

```
Đọc CLAUDE.md, docs/ui-progress.md. Xác nhận Phase 9 đã done, chưa thì dừng và báo.

Làm Phase 10 — ai/scanner:
Artboard: FridgeCamera, OCRCamera, AISnapUncertain, VoicePermission, RecipeAllergy, CreateFood

- Đọc business_rule.md (BR-072, BR-080→BR-083, BR-121, BR-130→BR-132, BR-162, BR-252, BR-290, BR-291)
  và đúng artboard trong design/.
- Mock UI only. Camera/mic/OCR: KHÔNG gọi expo-camera/expo-av/ML Kit thật — nền tĩnh + nút "giả lập chụp".
- FridgeCamera → Fridge: cho phép nhiều ảnh (mock), chỉ Pro; Free bị chặn bằng StateAILimit/Premium.
  Nguyên liệu vẫn phải qua bước user xác nhận trước khi gợi ý món (BR-082).
- OCRCamera → OCRReview; tab "Mã vạch" quay lại Barcode. Trạng thái đã có từ Phase 4 giữ nguyên.
- AISnapUncertain: khi kết quả AI mock có món độ tin cậy thấp → hỏi lại user chọn đúng món + khẩu phần,
  CHƯA lưu vào diary cho tới khi user trả lời và bấm xác nhận (BR-072, BR-054). Nút xác nhận disabled khi chưa chọn.
- VoicePermission: hiện khi mô phỏng chưa có quyền micro; có đường thay thế gõ tay (BR-252) → vẫn qua aiService
  và bước review như VoiceLog.
- RecipeAllergy: RecipeDetail phải tự chuyển sang bản cảnh báo khi món chứa thành phần trùng
  dị ứng trong userProfileStore, KHÔNG dựng màn riêng cố định. Cảnh báo chỉ tô icon/viền (design §30).
  Thành phần không rõ → không ghi "an toàn" (BR-291). Nút "Thêm vào thực đơn" disable cho món dị ứng (BR-162).
- CreateFood: tạo món do user nhập, lưu vào food DB mock, gắn nhãn "Do bạn nhập" (BR-121: không tự bịa dữ liệu).
  ProductNotFound "Nhập thủ công" trỏ đến đây (đang trỏ tạm FoodSearch).
- NativeWind token, light/dark.

Xong: tsc --noEmit + lint sạch, cập nhật ui-progress.md, báo cáo. DỪNG, không tự làm Phase 11.
```

## Phase 11 — Đi chợ, Thực đơn, Ngân sách calo, Offline

```
Đọc CLAUDE.md, docs/ui-progress.md. Xác nhận Phase 10 đã done, chưa thì dừng và báo.

Làm Phase 11 — meal-planner/grocery:
Artboard: GroceryEmpty, GroceryAdd, GroceryDone, PlannerRegenerate, CalorieBudget, StateOffline

- Đọc business_rule.md (BR-040→BR-042, BR-160→BR-174, BR-260→BR-262) và đúng artboard trong design/.
- Mock UI only.
- Grocery: khi Meal Plan trống → GroceryEmpty; "Thêm thủ công" → GroceryAdd (thêm nguyên liệu vào danh sách,
  có nhóm + đơn vị + giá ước tính); "Hoàn tất mua sắm" → GroceryDone (tóm tắt còn mấy món chưa mua,
  xác nhận rồi mới đóng danh sách). Tách Grocery thành route riêng nếu cần để Notifications/deep link trỏ được
  (TODO cũ trong ui-progress.md).
- PlannerRegenerate: 2 lựa chọn "Giữ bữa tôi đã chọn" / "Tạo lại toàn bộ"; mặc định giữ, KHÔNG âm thầm ghi đè
  bữa user đã sửa (BR-163). Gợi ý luôn lọc dị ứng (BR-162). Gate theo Premium (Meal Plan nâng cao là tính năng Pro,
  BR-230/231) — nếu chưa rõ có bắt buộc gate không thì HỎI tôi trước khi làm.
- CalorieBudget: Ngân sách = Mục tiêu + Calo vận động hợp lệ (BR-041). Nguồn trùng khung giờ chỉ cộng 1 lần
  (BR-042) — viết đúng 1 hàm tính dùng chung với Dashboard. Công tắc "Cộng calo vận động" ảnh hưởng số hiển thị
  ở Dashboard. Thẻ calo ở Dashboard mở màn này.
- StateOffline: banner "Đang offline" + số thay đổi chờ đồng bộ (BR-261); mô phỏng bằng công tắc Dev,
  KHÔNG cần NetInfo thật. Thao tác khi offline vào hàng đợi mock, hết offline thì đồng bộ và không nhân đôi (BR-262).
- NativeWind token, light/dark, đủ Loading/Empty/Error.

Xong: tsc --noEmit + lint sạch, cập nhật ui-progress.md, báo cáo. DỪNG, không tự làm Phase 12.
```

## Phase 12 — Nước uống, Thử thách, Huy hiệu, Bộ sưu tập

```
Đọc CLAUDE.md, docs/ui-progress.md. Xác nhận Phase 11 đã done, chưa thì dừng và báo.

Làm Phase 12 — gamification:
Artboard: WaterLog, Challenges, ChallengeComplete, Badges, CollectionDetail, CreateCollection

- Đọc business_rule.md (BR-031, BR-150→BR-152, BR-200→BR-212, BR-221) và đúng artboard trong design/.
  Lưu ý business_rule.md có BR-203 và BR-204 cùng tiêu đề "Streak" — nếu bản trong repo khác, báo tôi.
- Mock UI only.
- WaterLog: waterStore (ml theo ngày, mục tiêu 2.000 ml), thêm/xóa/hoàn tác. Dữ liệu này thay số "5/8 ly" tĩnh
  ở Dashboard, Pet mission "Uống đủ nước" và Reminders. Đủ mục tiêu → cộng XP đúng 1 lần/ngày (BR-202, dùng
  awardXpOnce hiện có).
- Challenges: 4 trạng thái (đang tham gia / mở đăng ký / chưa đến ngày / đã kết thúc). Chỉ cho tham gia khi
  hôm nay nằm trong [Start, End] (BR-211) — dùng date-fns, không so chuỗi. Hoàn thành → ChallengeComplete
  (thưởng XP/huy hiệu đúng 1 lần, BR-212).
- Badges: huy hiệu mở khóa theo dữ liệu thật đang có (streak, Diary, WaterLog); trang phục Bé Mầm mở theo Level/streak.
  Chưa mở phải có icon khóa + chữ, không chỉ đổi màu.
- CollectionDetail: đổi tên/xóa/bỏ món khỏi bộ sưu tập, chỉ chủ sở hữu (BR-152); Chia sẻ chỉ tạo link xem giả lập.
  CreateCollection: tạo mới trong useFavoritesStore/collections đã có từ Phase 5. Favorites đang trỏ các bộ sưu tập
  và nút "Tạo bộ sưu tập" → nối lại đúng.
- Pet có nút vào Challenges/Badges.
- NativeWind token, light/dark.

Xong: tsc --noEmit + lint sạch, cập nhật ui-progress.md, báo cáo. DỪNG, không tự làm Phase 13.
```

## Phase 13 — Quản lý gói & Thanh toán

```
Đọc CLAUDE.md, docs/ui-progress.md. Xác nhận Phase 12 đã done, chưa thì dừng và báo.

Làm Phase 13 — premium:
Artboard: Subscription, PaymentMethod

- Đọc business_rule.md (BR-230→BR-233, BR-240→BR-242) và đúng artboard trong design/.
- Mock UI only. Subscription đọc từ premiumStore hiện có: trạng thái Free/Premium/Expired/Cancelled
  (BR-230), hiệu lực đến, tự gia hạn, lịch sử giao dịch với 5 trạng thái (Pending/Success/Failed/Cancelled/Expired).
  Hết hạn → về Free nhưng KHÔNG xóa dữ liệu cũ (BR-232).
- PaymentMethod (VNPAY/MoMo/thẻ) → PaymentPending → PaymentSuccess/lỗi đã có. Premium chỉ kích hoạt khi bước
  "xác nhận thành công" ở phía service mock trả về (BR-241, BR-242) — không kích hoạt dựa vào callback UI.
- Nút "Nâng cấp Pro" ở Premium trỏ PaymentMethod; giá/ngày dùng placeholder hằng số trong 1 file, ghi rõ CẦN GIÁ THẬT.
- NativeWind token, light/dark.

Xong: tsc --noEmit + lint sạch, cập nhật ui-progress.md, báo cáo. DỪNG, không tự làm Phase 14.
```

## Phase 14 — Rà soát tổng, đồng bộ lệch design

```
Đọc CLAUDE.md, docs/ui-progress.md. Xác nhận Phase 9–13 đều done.

1. Đối chiếu design/screens.json (73 màn) với docs/ui-progress.md: phải đủ 73 hàng, không hàng nào todo.
2. Với mọi href="X.dc.html" trong design/*.dc.html, kiểm tra màn code tương ứng có điều hướng đến đúng X
   (bảng: màn nguồn → link → đã nối/chưa). Liệt kê chỗ chưa nối.
3. Chạy /check-reuse và /ui-review trên toàn bộ diff của Phase 9–13, sửa mọi mục Blocking.
4. Danh sách chỗ code lệch design (FoodSearch bỏ giỏ nhiều món, EditMealLog bỏ chip đơn vị,
   HealthSettings dùng chip thay checkbox, StateError gộp vào Discovery…) — với từng mục, hỏi tôi chọn:
   sửa code cho khớp design hay giữ code và cập nhật design.
5. Kiểm tra dark mode trên toàn bộ màn mới; xác nhận không có package ngoài Expo SDK / không tương thích Expo Go.
6. Viết 1 smoke test render App + kiểm tra điều hướng chính (Welcome → Login → Dashboard) bằng jest-expo.
7. npx tsc --noEmit, npx expo lint, npx jest đều sạch.

Báo cáo tổng: số màn done, danh sách TODO còn lại của cả dự án mock UI, các mục cần quyết định của tôi.
```

## Prompt chạy nhanh từng phase

```
Đọc CLAUDE.md và docs/ui-progress.md. Làm PHASE [SỐ] theo đúng khối prompt tương ứng trong
docs/ui-mock-prompts-phase9-13.md (mock UI, NativeWind token, Loading/Error, light/dark, reuse component có sẵn,
đúng business rule và artboard trong design/). Kiểm tra phase trước đã done và tsc/lint sạch chưa; chưa thì dừng và báo.
Xong: npx tsc --noEmit + npx expo lint, cập nhật ui-progress.md, báo cáo theo mẫu CLAUDE.md, rồi DỪNG.
```

Xong: tsc --noEmit + lint sạch, cập nhật ui-progress.md, báo cáo.
Đây là phase cuối — tổng kết: liệt kê toàn bộ 47 artboard trong ui-progress.md kèm trạng thái,
mọi TODO còn lại của cả dự án mock UI.
```