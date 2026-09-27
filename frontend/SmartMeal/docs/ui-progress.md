# SmartMeal — Tiến độ dựng UI mock

Cập nhật sau mỗi màn/đợt theo CLAUDE.md mục 10. Thứ tự theo `design/screens.json`.

| Artboard | Feature | Screen file | Trạng thái | Ghi chú |
|---|---|---|---|---|
| Main.dc.html | auth | `features/auth/screens/LoginScreen.tsx` | done | Đợt 1. Nút "Khám phá không cần đăng nhập" chưa nối (chờ Đợt 5 — Discovery). |
| HealthProfile.dc.html | health | `features/health/screens/HealthProfileGoalScreen.tsx` | done | Đợt 1. Đây là bước 3/7 (Mục tiêu) trong flow thật. |
| HealthResult.dc.html | health | `features/health/screens/HealthResultScreen.tsx` | done | Đợt 1. |
| Dashboard.dc.html | dashboard | — | todo | Đợt 2. Tab "Trang chủ" tạm dùng EmptyState placeholder. |
| QuickLog.dc.html | dashboard | — | todo | Đợt 2. |
| AISnap.dc.html | ai | — | todo | Đợt 2. |
| VoiceLog.dc.html | ai | — | todo | Đợt 2. |
| Diary.dc.html | nutrition | — | todo | Đợt 3. Tab "Nhật ký" tạm dùng EmptyState placeholder. |
| Barcode.dc.html | scanner | — | todo | Đợt 4. |
| Fridge.dc.html | scanner | — | todo | Đợt 4. |
| Discovery.dc.html | recipes | — | todo | Đợt 5. Tab "Khám phá" tạm dùng EmptyState placeholder. |
| RecipeDetail.dc.html | recipes | — | todo | Đợt 5. |
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
| FoodSearch.dc.html | nutrition | — | todo | Đợt 3. |
| FoodDetail.dc.html | nutrition | — | todo | Đợt 3. |
| AICamera.dc.html | ai | — | todo | Đợt 2. |
| AIAnalyzing.dc.html | ai | — | todo | Đợt 2. |
| EditMealLog.dc.html | nutrition | — | todo | Đợt 3. |
| ProgressChart.dc.html | nutrition | — | todo | Đợt 3. |
| ProductNotFound.dc.html | scanner | — | todo | Đợt 4. |
| OCRReview.dc.html | scanner | — | todo | Đợt 4. |
| FilterSheet.dc.html | recipes | — | todo | Đợt 5. |
| Favorites.dc.html | recipes | — | todo | Đợt 5. |
| SlotPicker.dc.html | meal-planner | — | todo | Đợt 6. |
| HealthSettings.dc.html | profile | — | todo | Đợt 7. |
| WeightHistory.dc.html | profile | — | todo | Đợt 7. |
| HealthConnect.dc.html | profile | — | todo | Đợt 7. |
| Reminders.dc.html | profile | — | todo | Đợt 7. |
| Notifications.dc.html | profile | — | todo | Đợt 7. |
| PaymentSuccess.dc.html | premium | — | todo | Đợt 8. |
| PaymentPending.dc.html | premium | — | todo | Đợt 8. |
| StateLoading.dc.html | dev/shared | — | todo | Dùng chung — đã có `LoadingState` (Đợt 0), artboard riêng chưa dựng. |
| StateError.dc.html | dev/shared | — | todo | Dùng chung — đã có `ErrorState` (Đợt 0). |
| StateAIFailed.dc.html | ai | — | todo | Đợt 2. |
| StateAILimit.dc.html | ai/premium | — | todo | Đợt 2. |
| StatePermission.dc.html | scanner | — | todo | Đợt 4. |
| DeleteConfirm.dc.html | dev/shared | — | todo | Dùng chung nhiều feature — dựng khi có màn xóa đầu tiên cần (Đợt 3). |
| SaveSuccess.dc.html | dev/shared | — | todo | Dùng chung — dựng khi có luồng lưu đầu tiên cần (Đợt 3). |

## Bổ sung ngoài 47 artboard gốc (Đợt 1)

`design.md` mục 31 định nghĩa Health Profile có **7 bước**, nhưng `design/` chỉ có artboard cho bước 3, 4, 5 (HealthProfile/HPActivity/HPAllergy). 4 bước còn lại không có artboard riêng nên được dựng theo đúng ngôn ngữ hình ảnh của 3 màn trên (progress bar, `ScreenHeader`, `HealthOptionCard`/`AppChip`) — xem mục "Cần xác nhận" trong báo cáo Đợt 1.

| Bước | Feature | Screen file | Trạng thái | Ghi chú |
|---|---|---|---|---|
| 1/7 — Thông tin cơ bản | health | `features/health/screens/HealthProfileBasicInfoScreen.tsx` | done | Không có artboard — dựng theo mẫu chung. |
| 2/7 — Cơ thể | health | `features/health/screens/HealthProfileBodyScreen.tsx` | done | Không có artboard — dựng theo mẫu chung. |
| 6/7 — Sức khỏe (bệnh lý) | health | `features/health/screens/HealthProfileConditionsScreen.tsx` | done | Không có artboard — dựng theo mẫu chung. |
| 7/7 — Chế độ ăn | health | `features/health/screens/HealthProfileDietScreen.tsx` | done | Không có artboard — dựng theo mẫu chung. |

## Tổng kết

- Tổng artboard gốc: 47. Done: 8 (Main, HealthProfile, HealthResult, Register, OTP, ForgotPassword, HPActivity, HPAllergy).
- Bổ sung (không thuộc 47 artboard gốc): 4 bước Health Profile còn lại.
- Đợt 0 (nền tảng) và Đợt 1 (auth + health) đã xong — xem báo cáo tương ứng.
