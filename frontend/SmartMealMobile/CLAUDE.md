# CLAUDE.md — SmartMeal Mobile (React Native Expo + TypeScript)

Áp dụng cho toàn bộ code trong `frontend/SmartMealMobile/`. Đọc file này trước khi implement bất kỳ màn hình, component hay logic nào.

## 1. Dự án

SmartMeal là mobile app (Expo managed workflow, chạy qua Expo Go + TypeScript) về dinh dưỡng, AI meal logging, sức khỏe, meal planning và gamification.
Backend: ASP.NET Core .NET 8 + PostgreSQL. Mobile **không bao giờ** gọi trực tiếp database hoặc AI provider.

Nhánh hiện tại `feat/mock-ui`: dựng toàn bộ UI bằng dữ liệu giả lập, **không gọi API**. Xem mục 8.

## 2. Tài liệu nguồn (bắt buộc đọc trước khi code)

| Thứ tự | Tài liệu | Nội dung |
|---|---|---|
| 1 | `docs/business_rule.md` | Nghiệp vụ (BR-xxx) |
| 2 | `docs/design.md` | Design system, màu, spacing, typography, UI/UX |
| 3 | `docs/structure_system.md` | Kiến trúc thư mục, feature-based, layering, giới hạn Expo Go |
| 4 | `docs/tech_stack.md` | Công nghệ, Definition of Done |
| 5 | `docs/SmartMeal_API_Contract.md` | Shape dữ liệu (mock phải khớp) |
| 6 | `design/README.md`, `design/screens.json`, `design/*.dc.html` | Mockup UI 73 màn (390px) — v2, thêm 26 màn so với bản v1 (47 màn) |
| 7 | `docs/ui-progress.md` | Tiến độ dựng UI theo từng artboard |

Quy trình: `business_rule → design.md → design/*.dc.html → structure_system → tech_stack → implement`.
Không tự đổi nghiệp vụ/design để "code cho dễ". Tài liệu thiếu hoặc mâu thuẫn → hỏi lại, không tự suy diễn.

## 3. Tech stack

Expo (managed) · React Native · TypeScript (strict) · **NativeWind** (styling) · React Navigation · TanStack Query (server state) · Zustand (client state) · Axios · React Hook Form + Zod · Reanimated + Gesture Handler · AsyncStorage (`@react-native-async-storage/async-storage`, storage không nhạy cảm) · expo-secure-store (secure storage) · expo-camera + expo-image-picker (camera/ảnh) · expo-camera barcode scanning hoặc expo-barcode-scanner · expo-av (ghi âm) · expo-notifications (push) · react-native-gifted-charts · date-fns · Lucide React Native (icons).

Không tự thêm: Redux, MobX, Apollo/GraphQL, Firebase, UI kit lớn (Paper, NativeBase, Tamagui…).
Không tự thêm package cần native linking thủ công / không chạy trên Expo Go: `react-native-vision-camera`, ML Kit, `react-native-mmkv`, `react-native-keychain`, `notifee`. Muốn dùng phải chuyển sang Expo Dev Client (`npx expo prebuild` + EAS Build) — báo lại trước khi làm việc này.
Trước khi thêm package: kiểm tra đã có package tương đương chưa, có nằm trong Expo SDK / "Expo Go compatible" không, cần native setup không.

## 4. Kiến trúc & luồng phụ thuộc

```
Screen → Hook → Feature Service → API Client / Native Service → Backend / Native API
```

- Screen: chỉ render UI, gọi hook, navigation, xử lý loading/error/empty. Không business logic, không gọi Axios.
- Business logic nằm ở `features/<feature>/services/`.
- Server state qua TanStack Query. Client state (auth, theme, preferences) qua Zustand. Không dồn server data vào Zustand.
- Native functionality chỉ qua Expo SDK, cô lập trong service — xem mục 9.
- Chi tiết: `@.claude/rules/architecture.md`.

## 5. Cấu trúc thư mục

```
src/
├── assets/{images,icons,illustrations,fonts}
├── components/{ui,common}/
├── config/          # env.ts, api.ts, mock.ts, app.ts
├── constants/       # routes.ts, storage.ts, ...
├── features/<feature>/{components,hooks,screens,services,types,mocks,index.ts}
├── hooks/
├── navigation/      # AppNavigator, AuthNavigator, MainNavigator, types.ts, linking.ts
├── services/{api,storage,permissions,notifications,analytics}
├── state/{auth,app}
├── theme/           # nguồn token duy nhất
├── types/
└── utils/
```

Feature: `auth`, `health`, `dashboard`, `nutrition`, `recipes`, `meal-planner`, `grocery`, `scanner`, `ai`, `gamification`, `premium`, `profile`, `dev`.
Trước khi tạo file mới: kiểm tra `components/ui` → `components/common` → feature hiện tại → `services`/`utils`. Nguyên tắc: **Reuse > Extend > Create new**.

Không có `android/`, `ios/` khi còn ở chế độ Expo Go — Expo tự quản lý phần native ẩn. Hai thư mục này chỉ xuất hiện sau `npx expo prebuild`, không tự tạo tay.

## 6. Styling — NativeWind + theme

- `src/theme` là **nguồn token duy nhất** (colors light/dark, spacing, radius, typography, shadows, motion).
- `tailwind.config.js` import token từ `src/theme`, không gõ lại mã màu.
- Màu dùng CSS variables (`rgb(var(--color-xxx) / <alpha-value>)`) → `bg-surface`, `text-text-primary`… tự đổi theo dark mode.
- Dùng className token ngữ nghĩa:
  - Màu: `bg-background` `bg-surface` `bg-surface-elevated` `bg-primary` `bg-primary-soft` `text-text-primary` `text-text-secondary` `text-on-primary` `border-border` `text-error-text` …
  - Spacing: `p-md` `gap-xs` `px-md` `mt-xl` (xxs 4, xs 8, sm 12, md 16, lg 20, xl 24, xxl 32, xxxl 40)
  - Radius: `rounded-md` (12) `rounded-card` (16) `rounded-lg` (20) `rounded-sheet` (24) `rounded-pill`
  - Chữ: `text-display` `text-h1` `text-h2` `text-h3` `text-body-lg` `text-body` `text-caption` + `font-sans` / `font-semibold` / `font-bold`
- **Cấm**: hex trong className/style, màu Tailwind mặc định (`green-500`, `gray-200`…), `dark:` cho màu đã là token, spacing lẻ (13, 17, 19…).
- `StyleSheet`/style inline chỉ dùng khi className không làm được (animation, giá trị động).
- Giá trị JS (màu icon Lucide, chart, StatusBar, placeholderTextColor, React Navigation theme) lấy từ `useTheme()`.
- Theme mode `system | light | dark` lưu bằng AsyncStorage qua `src/services/storage`.
- Font Inter nạp qua `expo-font`: `Inter-Regular`, `Inter-SemiBold`, `Inter-Bold`. Không set `fontWeight` kèm fontFamily custom.
- Variant component dùng `cva` hoặc object map, không nối chuỗi className rối.

## 7. Bốn nguyên tắc bắt buộc

1. **UI đồng bộ qua shared component**
   - `components/ui`: AppText, AppButton, AppIconButton, AppInput, AppCard, AppChip, AppBottomSheet
   - `components/common`: ScreenContainer, SectionHeader, LoadingState, EmptyState, ErrorState
   - Dùng trước khi viết UI mới. Chi tiết: `@.claude/rules/component-reuse.md`.
2. **Không hard-code**: màu/spacing/radius/font từ theme; base URL từ `src/config` (qua `expo-constants`/`EXPO_PUBLIC_`); route name từ `src/constants/routes.ts`; không secret/API key. Chi tiết: `@.claude/rules/no-hardcode.md`.
3. **TypeScript chuẩn mobile**: strict, không `any`, props qua interface, tránh re-render thừa, SafeArea, touch target ≥ 44, `accessibilityLabel` cho icon button. Chi tiết: `@.claude/rules/typescript-mobile.md`.
4. **State & API đúng layer**: TanStack Query / Zustand / Axios / RHF+Zod đúng vai trò, storage qua AsyncStorage/expo-secure-store, không gọi API trong component. Chi tiết: `@.claude/rules/state-and-api.md`.

## 8. Mock UI (nhánh `feat/mock-ui`)

- **Không gọi API thật**: không Axios request, không URL backend.
- Mock data: `src/features/<feature>/mocks/*.mock.ts`, shape khớp `docs/SmartMeal_API_Contract.md`. Lấy số liệu mẫu từ design (1.420 kcal, Bún bò, Gà kho, Bé Mầm…).
- Service vẫn đúng layer: `useX()` → `xService.getX()` trả Promise từ mock, delay 400–800 ms.
  Đánh dấu `// TODO: replace mock with real API` **đúng 1 chỗ** trong service.
- Hook dùng TanStack Query với `queryFn` là service mock. Hành động (lưu, xóa, xác nhận, check-off) dùng `useMutation` cập nhật cache/state local.
- Không hard-code mock data trong Screen/UI component.
- `src/config/mock.ts`: `MOCK_SCENARIO = 'success' | 'empty' | 'error' | 'slow'`. Service mock trả kết quả theo scenario để xem đủ mọi state. Có công tắc trong màn Dev.
- Đăng nhập mock: bấm Đăng nhập → vào MainNavigator, không kiểm tra thật.
- Camera / mic / barcode / Health Connect: chỉ dựng UI + nút "giả lập kết quả", chưa gọi native (kể cả Expo SDK) thật.
- **Xóa dữ liệu cá nhân (BR-271)**: `src/state/resetUserData.ts` là registry chung — mọi store/service
  giữ **dữ liệu của user hiện tại** (nhật ký ăn uống, hồ sơ sức khỏe, yêu thích/bộ sưu tập, meal plan,
  grocery, gamification, AI usage, và các store tương tự tạo ở phase sau như `waterStore`, `challenges`...)
  **PHẢI** gọi `registerUserDataReset(name, fn)` lúc module load để đăng ký hàm reset về giá trị khởi
  tạo/seed. `DeleteDataScreen` chỉ gọi `resetUserData()` một lần, không biết danh sách store cụ thể.
  KHÔNG đăng ký: `authStore`, `appStore` (theme/ngôn ngữ), `premiumStore` và lịch sử giao dịch thanh
  toán (dữ liệu thanh toán được giữ lại theo BR-271).

## 9. Native services & giới hạn Expo Go

Chỉ dùng module nằm trong Expo SDK, cô lập qua service (`services/permissions`, hoặc `features/<feature>/services/`):

| Chức năng | Expo SDK | Ghi chú |
|---|---|---|
| Camera (AI Snap, Fridge Scanner) | `expo-camera` | Đủ dùng trên Expo Go |
| Chọn ảnh từ thư viện | `expo-image-picker` | Đủ dùng trên Expo Go |
| Barcode | `expo-camera` (barcode scanning) hoặc `expo-barcode-scanner` | Đủ dùng trên Expo Go |
| OCR nhãn dinh dưỡng | — (ML Kit không chạy trên Expo Go) | Tạm mock, chưa gọi OCR thật |
| Health Connect / HealthKit | — (cần Dev Client) | Tạm mock |
| Notifications | `expo-notifications` | Push token thật cần Dev Client/EAS |
| Ghi âm (Voice Logging) | `expo-av` | Gửi audio lên Backend xử lý |
| Secure storage | `expo-secure-store` | Access/refresh token |
| Storage thường | AsyncStorage | Preference, cache không nhạy cảm |

Không dùng `react-native-vision-camera`, ML Kit, `react-native-mmkv`, `react-native-keychain`, `notifee` khi còn chạy Expo Go — các package này cần native linking thủ công. Chi tiết: `docs/structure_system.md` §2, §11.

## 10. Dựng UI từ design

- `design/*.dc.html` là mockup HTML tĩnh: đọc để lấy bố cục, nội dung, thứ tự, token. **Không copy HTML/CSS**, dựng lại bằng RN + NativeWind.
- Bỏ qua `<x-dc>`, `<helmet>`, `<script type="text/x-dc">` (thuộc công cụ design).
- `<a href="X.dc.html">` = điều hướng tới màn X.
- Ảnh món ăn trong design là placeholder → dùng component placeholder có thể thay ảnh thật.
- Navigation:
  - AuthNavigator: Login (Main), Register, OTP, ForgotPassword, HealthProfile (các bước), HealthResult
  - MainNavigator: bottom tab 5 mục — Trang chủ · Khám phá · Nhật ký · Thực đơn · Cá nhân + stack màn con
  - Bottom sheet / dialog (QuickLog, FilterSheet, StateAILimit, DeleteConfirm) làm dạng modal/bottom sheet
- Business rule phải thể hiện trên UI:
  - Kết quả AI luôn ghi "ước tính" (≈) và cần user xác nhận trước khi lưu (BR-054, BR-061, BR-062)
  - Dị ứng là ràng buộc bắt buộc: lọc khỏi gợi ý hoặc cảnh báo rõ (BR-102, BR-140)
  - Không khẳng định "an toàn tuyệt đối", không thay thế tư vấn y tế (BR-112, BR-291)
  - Premium chỉ kích hoạt khi thanh toán thành công (BR-241)
- Mọi màn dữ liệu có Loading (skeleton) / Empty / Error / Success. Kiểm tra cả light và dark.

## 11. Tiến độ & chia đợt

`docs/ui-progress.md` — bảng: `| Artboard | Feature | Screen file | Trạng thái (todo/doing/done) | Ghi chú |`. Cập nhật sau mỗi màn.

| Đợt | Phạm vi | Artboard |
|---|---|---|
| 0 | Nền tảng | NativeWind + theme + AsyncStorage/expo-secure-store, UI primitives, navigation khung, màn Dev/ThemePreview |
| 1 | auth + health | Main, Register, OTP, ForgotPassword, HealthProfile, HPActivity, HPAllergy, HealthResult |
| 2 | dashboard + log | Dashboard, QuickLog, AICamera, AIAnalyzing, AISnap, VoiceLog, StateLoading, StateAIFailed, StateAILimit |
| 3 | nutrition | Diary, FoodSearch, FoodDetail, EditMealLog, ProgressChart, DeleteConfirm, SaveSuccess |
| 4 | scanner | Barcode, ProductNotFound, OCRReview, Fridge, StatePermission |
| 5 | recipes | Discovery, FilterSheet, RecipeDetail, Favorites, StateError |
| 6 | planner + grocery | MealPlanner, SlotPicker, Grocery |
| 7 | profile | Profile, HealthSettings, WeightHistory, HealthConnect, Reminders, Notifications |
| 8 | gamification + premium | Pet, Premium, PaymentSuccess, PaymentPending |
| 8.5 | Đồng bộ design v2 (chỉ tài liệu, không code UI) | — |
| 9 | auth + profile | Welcome, GuestPrompt, StateSession, Settings, EditProfile, DeleteData |
| 10 | ai + scanner | FridgeCamera, OCRCamera, AISnapUncertain, VoicePermission, RecipeAllergy, CreateFood |
| 11 | meal-planner + grocery | GroceryEmpty, GroceryAdd, GroceryDone, PlannerRegenerate, CalorieBudget, StateOffline |
| 12 | gamification | WaterLog, Challenges, ChallengeComplete, Badges, CollectionDetail, CreateCollection |
| 13 | premium | Subscription, PaymentMethod |
| 14 | rà soát | Đối chiếu 73/73 artboard, link lệch design, `/check-reuse`, `/ui-review`, smoke test |

Đợt 0-8 dùng bản design v1 (47 màn). Đợt 9-14 dùng bản design v2 (73 màn, xem `design/README.md`) —
chi tiết từng phase (nghiệp vụ, business rule liên quan) xem `docs/ui-mock-prompts.md`.
Mỗi lần chỉ làm **1 đợt**, xong thì dừng và báo cáo: file đã tạo/sửa, component dùng chung mới, chỗ lệch so với design, TODO còn lại.

## 12. Công cụ trong `.claude/`

- Skill `smartmeal-dev-workflow` (`/smartmeal-dev-workflow`): quy trình thêm feature/screen.
- Commands:
  - `/new-feature <tên>`: scaffold `features/<feature>/`
  - `/new-component <tên>`: tạo component sau khi check reuse
  - `/check-reuse`: tìm component trùng và style hard-code trong diff
  - `/ui-review`: review diff theo `design.md` + rules
- Agents:
  - `rn-component-builder`: xây shared component đúng design system
  - `rn-feature-scaffolder`: dựng khung feature
  - `ui-consistency-reviewer`: review-only, không tự sửa code

## 13. Lệnh thường dùng

```bash
npm install                        # cài dependency
npx expo install <package>         # cài package tương thích đúng version Expo SDK đang dùng
npx expo start                     # chạy Metro, quét QR bằng app Expo Go
npx expo start --clear             # bắt buộc sau khi đổi cấu hình NativeWind/babel/tailwind
npx expo lint                      # ESLint (eslint-config-expo)
npx tsc --noEmit                   # type-check
npm test                           # Jest
npm test -- <pattern>              # chạy 1 test
```

Prettier (`.prettierrc.js`: `singleQuote`, `trailingComma: all`, `arrowParens: avoid`) chạy qua editor hoặc `eslint --fix`.

## 14. Definition of Done

- Đúng `business_rule.md`, `design.md`, artboard tương ứng, đúng cấu trúc thư mục.
- Không component/service trùng lặp; không gọi API từ UI; không hard-code URL/secret/màu/spacing.
- Có Loading / Empty / Error khi dữ liệu bất đồng bộ; đúng ở cả light và dark.
- `npx tsc --noEmit` và `npx expo lint` sạch; không `any` thừa.
- Import dùng alias `@/`, không `../../../`.
- Không thêm package nào cần native linking thủ công / không tương thích Expo Go.
- Có test cho logic quan trọng (BMI/BMR/TDEE, macro, validation).
- `docs/ui-progress.md` đã cập nhật.

## 15. Encoding

Mọi file text lưu **UTF-8 không BOM**, line ending **LF**. Trên PowerShell 5 luôn dùng `-Encoding utf8` khi ghi file.

## 16. Trạng thái hiện tại (đọc trước khi giả định đã có gì)

- Dự án khởi tạo bằng `npx create-expo-app`; `src/` mới có thư mục rỗng, chưa có code thật trong feature/service/state/theme.
- `App.tsx` vẫn là template mặc định của Expo; chưa có navigation, ThemeProvider, QueryClient, NativeWind.
- `package.json` mới có các package mặc định của `create-expo-app`. Toàn bộ stack ở mục 3 **chưa cài** — dùng `npx expo install` cho package cần tương thích Expo SDK, `npm install` cho package thuần JS.
- `src/theme`, `src/config/*`, `src/constants/routes.ts`, store Zustand… **chưa tồn tại** → tạo mới đúng cấu trúc, không đi tìm file có sẵn.
- Test có sẵn (nếu có) theo template Expo mặc định — kiểm tra `__tests__/` hoặc `app-example/` trước khi giả định.
- Canvas design gốc: https://claude.ai/artifact/Fqipf9uFUt3ebwvhnd2MzW (bản dùng để code nằm ở `design/`).
- Dự án cũ `frontend/SmartMeal` (React Native CLI) đang được chuyển dần sang đây — xem lịch sử chat/PR để biết phần nào đã chuyển xong.