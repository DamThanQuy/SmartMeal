# SmartMeal — Tiến độ dựng UI mock

Cập nhật sau mỗi màn/đợt theo CLAUDE.md mục 10. Thứ tự theo `design/screens.json`.

| Artboard | Feature | Screen file | Trạng thái | Ghi chú |
|---|---|---|---|---|
| Main.dc.html | auth | `features/auth/screens/LoginScreen.tsx` | done | Đợt 1. Nút "Khám phá không cần đăng nhập" chưa nối (chờ Đợt 5 — Discovery). |
| HealthProfile.dc.html | health | `features/health/screens/HealthProfileGoalScreen.tsx` | done | Đợt 1. Đây là bước 3/7 (Mục tiêu) trong flow thật. |
| HealthResult.dc.html | health | `features/health/screens/HealthResultScreen.tsx` | done | Đợt 1. |
| Dashboard.dc.html | dashboard | `features/dashboard/screens/DashboardScreen.tsx` | done | Đợt 2. Tab "Trang chủ". Pet đọc thật từ `features/gamification` (Đợt 8, có onPress → PetScreen). Recommended meal vẫn tĩnh (chưa có AI suggestion — ngoài phạm vi Đợt 6-8). |
| QuickLog.dc.html | dashboard | `features/dashboard/screens/QuickLogScreen.tsx` | done | Đợt 2/4. Bottom sheet (transparentModal), dùng chung cho Dashboard + Diary. "Quét sản phẩm" đã nối Barcode (Đợt 4). |
| AISnap.dc.html | ai | `features/ai/screens/AISnapResultScreen.tsx` | done | Đợt 2. Đây là màn Review kết quả (sau AIAnalyzing). |
| VoiceLog.dc.html | ai | `features/ai/screens/VoiceLogScreen.tsx` | done | Đợt 2. Ghi âm thật (expo-av) chưa nối — nút mic mô phỏng dừng ghi rồi gọi thẳng aiService. |
| Diary.dc.html | nutrition | `features/nutrition/screens/DiaryScreen.tsx` | done | Đợt 3. Tab "Nhật ký". |
| Barcode.dc.html | scanner | `features/scanner/screens/BarcodeScreen.tsx` | done | Đợt 4. Vision Camera/ML Kit thật chưa nối — nút "chạm để giả lập quét". |
| Fridge.dc.html | scanner | `features/scanner/screens/FridgeScreen.tsx` | done | Đợt 4. Nguyên liệu phải qua bước xác nhận của user trước khi gợi ý món (BR-080). |
| Discovery.dc.html | recipes | `features/recipes/screens/DiscoveryScreen.tsx` | done | Đợt 5. Tab "Khám phá". |
| RecipeDetail.dc.html | recipes | `features/recipes/screens/RecipeDetailScreen.tsx` | done | Đợt 5. "Thêm vào thực đơn" disable (chờ Đợt 6 — MealPlanner). |
| MealPlanner.dc.html | meal-planner | `features/meal-planner/screens/MealPlannerScreen.tsx` | done | Đợt 6. Tab "Thực đơn" — toggle cục bộ với GroceryScreen qua `AppSegmentedControl` (không phải Stack lồng, để giữ bottom nav — xem `MainTabNavigator`). "Gợi ý thực đơn tuần bằng AI" chưa gate theo Premium (BR-230/231 — TODO). |
| Grocery.dc.html | grocery | `features/grocery/screens/GroceryScreen.tsx` | done | Đợt 6. Sinh từ Meal Plan hiện tại (BR-170/171 cộng dồn theo tên+đơn vị, BR-172 phân loại 5 nhóm, BR-173 check-off, BR-174 ước tính giá — bảng giá mock, CẦN xác nhận giá thật). |
| Profile.dc.html | profile | `features/profile/screens/ProfileScreen.tsx` | done | Đợt 7. Tab "Cá nhân" thật, thay `ThemePreviewScreen` (chuyển vào icon "Cài đặt" → `MAIN_STACK_ROUTES.DEV`). Badge gói đọc từ `premiumStore` (Đợt 8). |
| Pet.dc.html | gamification | `features/gamification/screens/PetScreen.tsx` | done | Đợt 8. XP "Ghi bữa sáng"/"Đạt mục tiêu protein" đọc thật từ Diary hôm nay (BR-202 idempotent qua `awardXpOnce`); "Uống đủ nước" và "Chuỗi ngày" 7 ô vẫn mock tĩnh (chưa có Water Log/lịch sử diary nhiều ngày). |
| Premium.dc.html | premium | `features/premium/screens/PremiumScreen.tsx` | done | Đợt 8. Giá "[GIÁ]" trong artboard là placeholder công cụ design — dùng mức mock 79.000đ/699.000đ (CẦN xác nhận giá thật). |
| Register.dc.html | auth | `features/auth/screens/RegisterScreen.tsx` | done | Đợt 1. |
| OTP.dc.html | auth | `features/auth/screens/OtpScreen.tsx` | done | Đợt 1. Dùng chung cho đăng ký + quên mật khẩu (`purpose`). |
| ForgotPassword.dc.html | auth | `features/auth/screens/ForgotPasswordScreen.tsx` | done | Đợt 1. |
| HPActivity.dc.html | health | `features/health/screens/HealthProfileActivityScreen.tsx` | done | Đợt 1. Bước 4/7. |
| HPAllergy.dc.html | health | `features/health/screens/HealthProfileAllergyScreen.tsx` | done | Đợt 1. Bước 5/7. |
| FoodSearch.dc.html | nutrition | `features/nutrition/screens/FoodSearchScreen.tsx` | done | Đợt 3/4. Bỏ giỏ chọn nhiều món của artboard gốc — mỗi món qua FoodDetail rồi ghi thẳng (BR-052). Nút quét mã vạch đã nối Barcode (Đợt 4). |
| FoodDetail.dc.html | nutrition | `features/nutrition/screens/FoodDetailScreen.tsx` | done | Đợt 3. |
| AICamera.dc.html | ai | `features/ai/screens/AICameraScreen.tsx` | done | Đợt 2. Camera thật (expo-camera) chưa nối — nền tĩnh + nút giả lập chụp. |
| AIAnalyzing.dc.html | ai | `features/ai/screens/AIAnalyzingScreen.tsx` | done | Đợt 2. Gọi aiService thật (mock), tự điều hướng khi xong. |
| EditMealLog.dc.html | nutrition | `features/nutrition/screens/EditMealLogScreen.tsx` | done | Đợt 3. Bỏ chip "Đơn vị" (gram/phần/miếng) — data model chỉ lưu gram. |
| ProgressChart.dc.html | nutrition | `features/nutrition/screens/ProgressChartScreen.tsx` | done | Đợt 3. Dùng react-native-gifted-charts. Chỉ tab "Tuần" có dữ liệu, "Ngày"/"Tháng" hiện EmptyState. |
| ProductNotFound.dc.html | scanner | `features/scanner/screens/ProductNotFoundScreen.tsx` | done | Đợt 4. "Nhập thủ công" trỏ tạm FoodSearch (chưa có màn tạo món tự do). |
| OCRReview.dc.html | scanner | `features/scanner/screens/OCRReviewScreen.tsx` | done | Đợt 4. Trường "Đường" cố ý đọc không chắc để minh hoạ cảnh báo OCR (BR-130). |
| FilterSheet.dc.html | recipes | `features/recipes/screens/FilterSheetScreen.tsx` | done | Đợt 5. Chip "Bữa" chỉ hiển thị, chưa lọc thật (Recipe chưa gắn mealType). "Ẩn món dị ứng" khoá luôn ON (BR-101/102). |
| Favorites.dc.html | recipes | `features/recipes/screens/FavoritesScreen.tsx` | done | Đợt 5. Vào từ nút bookmark trên Discovery (Profile/Đợt 7 chưa có entry point thật). |
| SlotPicker.dc.html | meal-planner | `features/meal-planner/screens/SlotPickerScreen.tsx` | done | Đợt 6. Tab "Bộ sưu tập" chưa có dữ liệu thật (EmptyState) — chỉ "Gợi ý" (lọc dị ứng bắt buộc, BR-101/102) và "Yêu thích" (từ `useFavoritesStore`, Đợt 5) hoạt động thật. |
| HealthSettings.dc.html | profile | `features/profile/screens/HealthSettingsScreen.tsx` | done | Đợt 7. Dùng chip chọn nhiều (giống HPAllergy/HealthProfileConditions/Diet, Đợt 1) cho cả 3 mục — lệch design gốc vẽ checkbox cho "Tình trạng sức khỏe", đổi để tái dùng đúng 1 ngôn ngữ UI. "Lưu thay đổi" chỉ `goBack()`, chưa có toast (khác SaveSuccess của Diary). |
| WeightHistory.dc.html | profile | `features/profile/screens/WeightHistoryScreen.tsx` | done | Đợt 7. Ghi cân nặng mới tính lại BMI/BMR/TDEE/Calorie/Macro qua đúng 1 hàm `calculateHealthProfileResult` (BR-003). |
| HealthConnect.dc.html | profile | `features/profile/screens/HealthConnectScreen.tsx` | done | Đợt 7. Mô phỏng qua nút "Đồng bộ ngay"/"Ngắt kết nối"/"Kết nối lại" — chưa gọi Health Connect thật (cần Dev Client). |
| Reminders.dc.html | profile | `features/profile/screens/RemindersScreen.tsx` | done | Đợt 7. Nút "Mở cài đặt" gọi `Linking.openSettings()` thật; toggle chưa nối `expo-notifications` thật. |
| Notifications.dc.html | profile | `features/profile/screens/NotificationsScreen.tsx` | done | Đợt 7. Tap "Danh sách đi chợ" trỏ tạm về tab Thực đơn (Grocery chưa có route riêng — xem `MainTabNavigator`). |
| PaymentSuccess.dc.html | premium | `features/premium/screens/PaymentSuccessScreen.tsx` | done | Đợt 8. |
| PaymentPending.dc.html | premium | `features/premium/screens/PaymentPendingScreen.tsx` | done | Đợt 8. Trạng thái lỗi (mẫu) trong artboard là chú giải của design tool, không hiện đồng thời với spinner — dựng thành 2 trạng thái loại trừ nhau (pending/error) theo `MOCK_SCENARIO`. |
| StateLoading.dc.html | dev/shared | — | done | `LoadingState` (Đợt 0) — dùng thật trong Dashboard/Diary/FoodSearch/FoodDetail/ProgressChart/Discovery/Fridge/OCRReview (Đợt 2/3/4/5). |
| StateError.dc.html | dev/shared | `features/recipes/screens/DiscoveryScreen.tsx` | done | Đợt 5. Dùng `ErrorState` (mở rộng thêm `secondaryActionLabel`) ngay trong DiscoveryScreen, không tách route riêng. |
| StateAIFailed.dc.html | ai | `features/ai/screens/StateAIFailedScreen.tsx` | done | Đợt 2. Dùng chung cho AI Snap và Voice Logging thất bại (`source`). |
| StateAILimit.dc.html | ai/premium | `features/ai/screens/StateAILimitScreen.tsx` | done | Đợt 2. "Nâng cấp Pro" đã nối `MAIN_STACK_ROUTES.PREMIUM` (Đợt 8); quota AI cũng đã đọc `premiumStore` (Premium = không giới hạn, BR-233). |
| StatePermission.dc.html | scanner | `features/scanner/screens/StatePermissionScreen.tsx` | done | Đợt 4. Mô phỏng qua MOCK_SCENARIO='error' (chưa có API quyền camera thật). |
| DeleteConfirm.dc.html | dev/shared | `features/nutrition/screens/DeleteConfirmScreen.tsx` | done | Đợt 3. Dùng chung nhiều feature — dựng ở đây cho luồng xóa Diary đầu tiên. |
| SaveSuccess.dc.html | dev/shared | — | done | Đợt 3. Không tách route riêng — dựng thành `SuccessToast` (components/common) hiển thị đè lên Diary khi quay lại từ Edit/Delete/FoodSearch/AI/Barcode/OCR. Banner "Đang offline" trong artboard chưa mô phỏng (chưa yêu cầu). |

## Bổ sung ngoài 47 artboard gốc (Đợt 1)

`design.md` mục 31 định nghĩa Health Profile có **7 bước**, nhưng `design/` chỉ có artboard cho bước 3, 4, 5 (HealthProfile/HPActivity/HPAllergy). 4 bước còn lại không có artboard riêng nên được dựng theo đúng ngôn ngữ hình ảnh của 3 màn trên (progress bar, `ScreenHeader`, `HealthOptionCard`/`AppChip`) — xem mục "Cần xác nhận" trong báo cáo Đợt 1.

| Bước | Feature | Screen file | Trạng thái | Ghi chú |
|---|---|---|---|---|
| 1/7 — Thông tin cơ bản | health | `features/health/screens/HealthProfileBasicInfoScreen.tsx` | done | Không có artboard — dựng theo mẫu chung. |
| 2/7 — Cơ thể | health | `features/health/screens/HealthProfileBodyScreen.tsx` | done | Không có artboard — dựng theo mẫu chung. |
| 6/7 — Sức khỏe (bệnh lý) | health | `features/health/screens/HealthProfileConditionsScreen.tsx` | done | Không có artboard — dựng theo mẫu chung. |
| 7/7 — Chế độ ăn | health | `features/health/screens/HealthProfileDietScreen.tsx` | done | Không có artboard — dựng theo mẫu chung. |

## Tổng kết

- **Tổng artboard gốc: 47/47 — done.** Đợt 1 (8): Main, HealthProfile, HealthResult, Register, OTP, ForgotPassword, HPActivity, HPAllergy. Đợt 2 (9): Dashboard, QuickLog, AISnap, VoiceLog, AICamera, AIAnalyzing, StateAIFailed, StateAILimit, StateLoading. Đợt 3 (7): Diary, FoodSearch, FoodDetail, EditMealLog, ProgressChart, DeleteConfirm, SaveSuccess. Đợt 4 (5): Barcode, Fridge, ProductNotFound, OCRReview, StatePermission. Đợt 5 (5): Discovery, RecipeDetail, FilterSheet, Favorites, StateError. Đợt 6 (3): MealPlanner, Grocery, SlotPicker. Đợt 7 (6): Profile, HealthSettings, WeightHistory, HealthConnect, Reminders, Notifications. Đợt 8 (4): Pet, Premium, PaymentSuccess, PaymentPending.
- Bổ sung (không thuộc 47 artboard gốc): 4 bước Health Profile còn lại (Đợt 1) — cũng đã done.
- Tất cả 9 đợt (0-8) đã xong. Toàn bộ mock UI theo `docs/ui-mock-prompts.md` đã dựng đủ 47 artboard + 4 bước bổ sung.

### TODO còn lại của cả dự án mock UI (sau Đợt 8)

- **Kiến trúc/state mới ở Đợt 7-8** (đã tạo, chưa có real API): `src/state/user/userProfileStore.ts` (hồ sơ sức khỏe dùng chung), `src/state/premium/premiumStore.ts` (membership status). Cả hai đều còn đúng 1 dòng `// TODO: replace mock with real API` ở service liên quan.
- **Grocery chưa có route riêng** — hiện chỉ là toggle cục bộ trong tab Planner (`MainTabNavigator.PlannerTab`), nên Notifications/deep-link khác không thể trỏ thẳng vào view Grocery (tạm trỏ về tab Thực đơn). Nếu cần deep-link thật, nên tách thành route riêng hoặc thêm param điều hướng.
- **MealPlanner "Gợi ý thực đơn tuần bằng AI"** chưa gate theo Premium status dù `Premium.dc.html` liệt kê "Meal Plan nâng cao" là tính năng Pro (BR-230/231) — cần xác nhận có bắt buộc gate không trước khi nối.
- **HealthSettingsScreen "Lưu thay đổi"** chỉ `goBack()`, chưa có `SuccessToast` như luồng Diary (Đợt 3) — có thể bổ sung nếu cần đồng bộ trải nghiệm.
- **Pet weekCompletion/streak** và **Water reminder progress** vẫn là số liệu mock tĩnh — ứng dụng chưa có tính năng ghi nước (Water Log) hoặc lưu lịch sử diary nhiều ngày để tính thật.
- **Business rule chưa có số BR chính thức** cho Reminders/Notifications (BR-180→183, BR-220→222) và Gamification (BR-200→212) — `docs/business_rule.md` hiện chỉ có §9 (Meal Planner/Grocery, BR-160-174) và §10 (Premium, BR-230-242) khớp Đợt 6/8; Đợt 7 Reminders/Notifications và Đợt 8 Pet dựng theo `design.md` + artboard, chưa có BR số cụ thể đối chiếu — cần bổ sung vào business_rule.md nếu muốn tra cứu chính thức.
- **Giá Premium (79.000đ/699.000đ)** là mock — artboard gốc chỉ có placeholder "[GIÁ]", cần giá thật từ Backend.
- Chi tiết đầy đủ theo từng màn xem cột "Ghi chú" ở bảng trên.
