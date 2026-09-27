# SmartMeal — Tiến độ dựng UI mock

Cập nhật sau mỗi màn/đợt theo CLAUDE.md mục 10. Thứ tự theo `design/screens.json`.

| Artboard | Feature | Screen file | Trạng thái | Ghi chú |
|---|---|---|---|---|
| Main.dc.html | auth | `features/auth/screens/LoginScreen.tsx` | done | Đợt 1. Nút "Khám phá không cần đăng nhập" chưa nối (chờ Đợt 5 — Discovery). |
| HealthProfile.dc.html | health | `features/health/screens/HealthProfileGoalScreen.tsx` | done | Đợt 1. Đây là bước 3/7 (Mục tiêu) trong flow thật. |
| HealthResult.dc.html | health | `features/health/screens/HealthResultScreen.tsx` | done | Đợt 1. |
| Dashboard.dc.html | dashboard | `features/dashboard/screens/DashboardScreen.tsx` | done | Đợt 2. Tab "Trang chủ". Pet/Recommended meal tĩnh (chờ Đợt 8/5 nối). |
| QuickLog.dc.html | dashboard | `features/dashboard/screens/QuickLogScreen.tsx` | done | Đợt 2/4. Bottom sheet (transparentModal), dùng chung cho Dashboard + Diary. "Quét sản phẩm" đã nối Barcode (Đợt 4). |
| AISnap.dc.html | ai | `features/ai/screens/AISnapResultScreen.tsx` | done | Đợt 2. Đây là màn Review kết quả (sau AIAnalyzing). |
| VoiceLog.dc.html | ai | `features/ai/screens/VoiceLogScreen.tsx` | done | Đợt 2. Ghi âm thật (expo-av) chưa nối — nút mic mô phỏng dừng ghi rồi gọi thẳng aiService. |
| Diary.dc.html | nutrition | `features/nutrition/screens/DiaryScreen.tsx` | done | Đợt 3. Tab "Nhật ký". |
| Barcode.dc.html | scanner | `features/scanner/screens/BarcodeScreen.tsx` | done | Đợt 4. Vision Camera/ML Kit thật chưa nối — nút "chạm để giả lập quét". |
| Fridge.dc.html | scanner | `features/scanner/screens/FridgeScreen.tsx` | done | Đợt 4. Nguyên liệu phải qua bước xác nhận của user trước khi gợi ý món (BR-080). |
| Discovery.dc.html | recipes | `features/recipes/screens/DiscoveryScreen.tsx` | done | Đợt 5. Tab "Khám phá". |
| RecipeDetail.dc.html | recipes | `features/recipes/screens/RecipeDetailScreen.tsx` | done | Đợt 5. "Thêm vào thực đơn" disable (chờ Đợt 6 — MealPlanner). |
| MealPlanner.dc.html | meal-planner | — | todo | Đợt 6. Tab "Thực đơn" tạm dùng EmptyState placeholder. |
| Grocery.dc.html | grocery | — | todo | Đợt 6. |
| Profile.dc.html | profile | — | todo | Đợt 7. Tab "Cá nhân" tạm dùng `ThemePreviewScreen` (màn Dev) làm entry point. |
| Pet.dc.html | gamification | — | todo | Đợt 8. |
| Premium.dc.html | premium | — | todo | Đợt 8. |
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
| SlotPicker.dc.html | meal-planner | — | todo | Đợt 6. |
| HealthSettings.dc.html | profile | — | todo | Đợt 7. |
| WeightHistory.dc.html | profile | — | todo | Đợt 7. |
| HealthConnect.dc.html | profile | — | todo | Đợt 7. |
| Reminders.dc.html | profile | — | todo | Đợt 7. |
| Notifications.dc.html | profile | — | todo | Đợt 7. |
| PaymentSuccess.dc.html | premium | — | todo | Đợt 8. |
| PaymentPending.dc.html | premium | — | todo | Đợt 8. |
| StateLoading.dc.html | dev/shared | — | done | `LoadingState` (Đợt 0) — dùng thật trong Dashboard/Diary/FoodSearch/FoodDetail/ProgressChart/Discovery/Fridge/OCRReview (Đợt 2/3/4/5). |
| StateError.dc.html | dev/shared | `features/recipes/screens/DiscoveryScreen.tsx` | done | Đợt 5. Dùng `ErrorState` (mở rộng thêm `secondaryActionLabel`) ngay trong DiscoveryScreen, không tách route riêng. |
| StateAIFailed.dc.html | ai | `features/ai/screens/StateAIFailedScreen.tsx` | done | Đợt 2. Dùng chung cho AI Snap và Voice Logging thất bại (`source`). |
| StateAILimit.dc.html | ai/premium | `features/ai/screens/StateAILimitScreen.tsx` | done | Đợt 2. "Nâng cấp Pro" chưa nối Premium (Đợt 8). |
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

- Tổng artboard gốc: 47. Done: 39 (Main, HealthProfile, HealthResult, Register, OTP, ForgotPassword, HPActivity, HPAllergy — Đợt 1; Dashboard, QuickLog, AISnap, VoiceLog, AICamera, AIAnalyzing, StateAIFailed, StateAILimit, StateLoading — Đợt 2; Diary, FoodSearch, FoodDetail, EditMealLog, ProgressChart, DeleteConfirm, SaveSuccess — Đợt 3; Barcode, Fridge, ProductNotFound, OCRReview, StatePermission — Đợt 4; Discovery, RecipeDetail, FilterSheet, Favorites, StateError — Đợt 5).
- Còn lại: 8 (MealPlanner, Grocery, SlotPicker — Đợt 6; Profile, HealthSettings, WeightHistory, HealthConnect, Reminders, Notifications — Đợt 7; Pet, Premium, PaymentSuccess, PaymentPending — Đợt 8 — một số artboard trùng đợt nên tổng không cộng thẳng theo dòng).
- Bổ sung (không thuộc 47 artboard gốc): 4 bước Health Profile còn lại.
- Đợt 0 (nền tảng), Đợt 1 (auth + health), Đợt 2 (dashboard + log), Đợt 3 (nutrition), Đợt 4 (scanner) và Đợt 5 (recipes) đã xong — xem báo cáo tương ứng.
