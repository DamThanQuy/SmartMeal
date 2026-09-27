# SmartMeal - System Structure

> Tài liệu quy định cấu trúc source code, cách tổ chức module và nguyên tắc phát triển Frontend React Native (Expo) của SmartMeal.

## 1. Mục đích

`structure_system.md` định nghĩa cấu trúc thư mục, quy tắc đặt file, phân chia trách nhiệm giữa các layer, cách tổ chức feature, giao tiếp Mobile–Backend, shared components, state, API, storage và native services.

Tài liệu này không thay thế:
- `business_rule.md`: nghiệp vụ.
- `design.md`: UI/UX và design system.

## 2. Công nghệ

### Frontend
- Expo (managed workflow) + React Native + TypeScript
- Expo Go dùng để chạy dev hằng ngày (quét QR bằng app Expo Go trên điện thoại thật, không cần build native)
- NativeWind (styling)
- React Navigation
- TanStack Query (server state)
- Zustand (client state)
- Axios
- React Hook Form + Zod
- Reanimated + Gesture Handler
- expo-secure-store (secure storage: access token, refresh token)
- AsyncStorage (`@react-native-async-storage/async-storage`) cho preference/cache không nhạy cảm
- expo-camera (camera, dùng cho AI Snap / Fridge Scanner)
- expo-camera (barcode scanning API) hoặc `expo-barcode-scanner` (quét mã vạch)
- expo-notifications (push notification, nhắc bữa ăn/uống nước)
- expo-av (ghi âm cho Voice Logging — gửi audio lên Backend để xử lý)
- react-native-gifted-charts (biểu đồ dinh dưỡng, cân nặng, calo)
- date-fns
- Lucide React Native (icons)

### Giới hạn của Expo Go (đọc trước khi chọn thư viện)

Expo Go là app client dựng sẵn của Expo, **không** cho phép nạp module native tùy chỉnh ngoài danh sách Expo SDK. Vì vậy trong giai đoạn dùng Expo Go:

- **Không dùng** Vision Camera + ML Kit, React Native Keychain, MMKV, Notifee, hoặc bất kỳ package nào yêu cầu `pod install`/native linking thủ công — các package này sẽ crash hoặc không cài được trên Expo Go.
- OCR nhãn dinh dưỡng bằng ML Kit **chưa chạy được thật** trên Expo Go → màn OCR Scanner (`OCRReview`) tạm thời chỉ dùng mock data, không gọi ML Kit thật.
- Health Connect / HealthKit thật cũng nằm ngoài Expo SDK cơ bản → tạm mock cho tới khi chuyển Dev Client.
- Muốn dùng module native ngoài danh sách hỗ trợ (ví dụ ML Kit, MMKV) thì phải chuyển sang **Expo Dev Client** (`npx expo prebuild` + EAS Build) — khi đó dự án rời khỏi Expo Go nhưng vẫn giữ code Expo, không cần "eject" hoàn toàn về React Native CLI thuần.
- Trước khi thêm bất kỳ package mới nào: kiểm tra package đó có nằm trong Expo SDK hoặc được ghi rõ "Expo Go compatible" không. Nếu không, hoặc mock lại chức năng, hoặc báo lại để quyết định có chuyển sang Dev Client hay chưa.

### Backend
- ASP.NET Core .NET 8
- PostgreSQL
- REST API
- JWT Authentication

### AI
AI được gọi thông qua Backend. Mobile không lưu API key của Gemini hoặc AI provider.

```text
React Native (Expo)
    ↓ HTTP
ASP.NET Core API
    ├── AI Service / Gemini
    └── PostgreSQL
```

## 3. Kiến trúc tổng thể

SmartMeal sử dụng **Feature-based + Layered Architecture**.

```text
Screen
  ↓
Feature Hook
  ↓
Feature Service
  ↓
API Service
  ↓
ASP.NET Core Backend
  ├── PostgreSQL
  └── AI Services
```

Local data:

```text
Screen → Hook / Store → Storage Service → AsyncStorage / expo-secure-store
```

Native functionality (qua Expo SDK):

```text
Feature → Native Service → expo-camera / expo-barcode-scanner / Health API / expo-notifications
```

## 4. Cấu trúc thư mục

```text
SmartMeal/
├── app.json / app.config.ts
├── assets/
├── __tests__/
├── src/
│   ├── assets/
│   │   ├── images/
│   │   ├── icons/
│   │   ├── illustrations/
│   │   └── fonts/
│   ├── components/
│   │   ├── ui/
│   │   └── common/
│   ├── config/
│   ├── constants/
│   ├── features/
│   │   ├── auth/
│   │   ├── health/
│   │   ├── dashboard/
│   │   ├── nutrition/
│   │   ├── recipes/
│   │   ├── meal-planner/
│   │   ├── grocery/
│   │   ├── scanner/
│   │   ├── ai/
│   │   ├── gamification/
│   │   ├── premium/
│   │   └── profile/
│   ├── hooks/
│   ├── navigation/
│   ├── services/
│   │   ├── api/
│   │   ├── storage/
│   │   ├── permissions/
│   │   ├── notifications/
│   │   └── analytics/
│   ├── state/
│   │   ├── auth/
│   │   └── app/
│   ├── theme/
│   ├── types/
│   └── utils/
├── App.tsx
├── index.ts
├── package.json
├── tsconfig.json
├── babel.config.js
├── metro.config.js
├── tailwind.config.js
├── global.css
└── README.md
```

Không có thư mục `android/` hoặc `ios/` khi còn ở chế độ Expo Go (Expo tự quản lý phần native ẩn). Hai thư mục này chỉ xuất hiện sau khi chạy `npx expo prebuild` (chuyển sang Dev Client/bare) — không tự tạo tay, không commit trừ khi dự án đã prebuild.

## 5. Feature-based Architecture

Mỗi nghiệp vụ chính là một feature:

| Feature | Trách nhiệm |
|---|---|
| `auth` | Đăng nhập, đăng ký, OTP, Google Sign-In, session |
| `health` | Health Profile, BMI, BMR, TDEE, dị ứng, bệnh lý, cân nặng |
| `dashboard` | Tổng quan sức khỏe, calories, macros, quick actions |
| `nutrition` | Nhật ký ăn uống, calories, macros, biểu đồ |
| `recipes` | Công thức, tìm kiếm, lọc, yêu thích |
| `meal-planner` | Lập kế hoạch bữa ăn |
| `grocery` | Danh sách mua sắm, nguyên liệu, chi phí |
| `scanner` | Camera, OCR, barcode, nutrition label |
| `ai` | AI Vision, Voice Logging, AI meal analysis |
| `gamification` | Pet, XP, streak, badge, challenge |
| `premium` | Premium, credit, giới hạn AI, thanh toán |
| `profile` | Hồ sơ người dùng, cài đặt, nhắc nhở, Health Connect |

Feature tiêu chuẩn:

```text
nutrition/
├── components/
├── hooks/
├── screens/
├── services/
├── mocks/
├── types/
└── index.ts
```

### components/
Component chỉ phục vụ feature.

### hooks/
Custom hooks liên quan đến feature, kết nối UI với service/state.

### screens/
Màn hình của feature. Screen chỉ nên render UI, gọi hook, navigation và xử lý loading/error/empty; không chứa business logic phức tạp.

### services/
Logic giao tiếp dữ liệu của feature. Service gọi API thông qua API client chung, không gọi Axios trực tiếp trong Screen. Trong giai đoạn mock UI, service tạm trả dữ liệu từ `mocks/` (xem mục 24).

### mocks/
Dữ liệu giả lập cho feature, dùng khi chưa nối API thật. Xóa hoặc giữ lại làm fixture test sau khi nối API tùy quyết định của team.

### types/
Types/interfaces riêng của feature.

### index.ts
Public entry point của feature khi cần.

## 6. Shared Components

### `components/ui/`
Chứa UI primitive dùng chung toàn app, ví dụ:

```text
AppButton.tsx
AppCard.tsx
AppInput.tsx
AppText.tsx
AppChip.tsx
AppIconButton.tsx
AppBottomSheet.tsx
```

Các component này:
- Không gọi API.
- Không chứa business logic.
- Không phụ thuộc feature cụ thể.
- Nhận dữ liệu qua props.
- Style bằng NativeWind `className` dùng token trong `src/theme` (xem mục 14).

### `components/common/`
Component dùng chung nhưng có tính năng cao hơn UI primitive:

```text
EmptyState.tsx
ErrorState.tsx
LoadingState.tsx
ScreenContainer.tsx
SectionHeader.tsx
```

## 7. Config và Constants

```text
src/config/
├── env.ts
├── api.ts
├── mock.ts
└── app.ts
```

`env.ts` đọc biến môi trường qua `expo-constants` (`Constants.expoConfig.extra`) hoặc file `.env` + `app.config.ts`, không hard-code URL production.

```text
src/constants/
├── routes.ts
├── storage.ts
├── nutrition.ts
├── meals.ts
└── index.ts
```

Constants dành cho giá trị cố định có ý nghĩa hệ thống/nghiệp vụ; không dùng để chứa dữ liệu động từ Backend.

## 8. Navigation

```text
src/navigation/
├── AppNavigator.tsx
├── AuthNavigator.tsx
├── MainNavigator.tsx
├── types.ts
└── linking.ts
```

Luồng:

```text
AppNavigator
├── AuthNavigator
│   ├── Login
│   ├── Register
│   ├── OTP
│   └── Forgot Password
└── MainNavigator
    ├── Dashboard
    ├── Nutrition
    ├── Recipes
    ├── Meal Planner
    ├── Grocery
    └── Profile
```

Navigation không chứa business logic. Deep link cấu hình qua `linking.ts` + Expo scheme trong `app.json`.

## 9. API Service

```text
src/services/api/
├── client.ts
├── interceptors.ts
└── endpoints.ts
```

Luồng bắt buộc:

```text
Screen → Hook → Feature Service → API Client → Backend
```

Không làm:

```tsx
const response = await axios.get('/meals');
```

trực tiếp trong Screen/component.

`interceptors.ts` xử lý token, unauthorized và lỗi HTTP dùng chung.

## 10. Storage

```text
src/services/storage/
├── storage.ts
└── secureStorage.ts
```

`storage.ts`: dùng `AsyncStorage` cho preferences/cache không nhạy cảm (theme mode, ngôn ngữ, cache dữ liệu gần đây).

`secureStorage.ts`: dùng `expo-secure-store` cho access token, refresh token và dữ liệu nhạy cảm.

Không lưu token nhạy cảm trong `AsyncStorage` nếu `expo-secure-store` phù hợp. Không dùng MMKV hay React Native Keychain khi còn chạy Expo Go (xem mục 2 – Giới hạn Expo Go).

## 11. Native Services

Native functionality phải được cô lập qua service, và trong giai đoạn Expo Go chỉ dùng API nằm trong Expo SDK:

```text
Feature → Native Service → Expo SDK API
```

Bao gồm:

| Chức năng | Expo SDK | Ghi chú |
|---|---|---|
| Camera (AI Snap, Fridge Scanner) | `expo-camera` | Đủ dùng trên Expo Go |
| Barcode | `expo-camera` (barcode scanning) hoặc `expo-barcode-scanner` | Đủ dùng trên Expo Go |
| OCR nhãn dinh dưỡng | — (ML Kit không chạy trên Expo Go) | Tạm mock, chưa gọi OCR thật cho tới khi chuyển Dev Client |
| Health Connect / HealthKit | — (cần Dev Client) | Tạm mock, native module ngoài Expo SDK |
| Notifications | `expo-notifications` | Đủ dùng trên Expo Go, riêng push token thật cần Dev Client/EAS |
| Microphone (Voice Logging) | `expo-av` (ghi âm) | Gửi audio lên Backend để xử lý, không nhận diện trên máy |
| Photo Library | `expo-image-picker` | Dùng khi chọn ảnh từ thư viện thay vì chụp trực tiếp |

Không để native implementation rải rác trong các Screen — luôn qua `services/permissions` hoặc service riêng của feature (`features/scanner/services`, `features/ai/services`...).

Khi một tính năng bắt buộc phải có module ngoài Expo SDK (ví dụ ML Kit OCR, Health Connect thật), feature đó giữ nguyên UI + mock, và ghi rõ trong PR/README rằng tính năng chờ chuyển sang Expo Dev Client.

## 12. AI Architecture

Không gọi Gemini trực tiếp từ Mobile bằng secret key.

```text
React Native (Expo)
    ↓
SmartMeal API
    ↓
AI Service
    ↓
Gemini / LLM
```

Ví dụ AI Food Recognition:

```text
expo-camera
  ↓
Scanner Screen
  ↓
useFoodRecognition()
  ↓
AI Service
  ↓
SmartMeal API
  ↓
Gemini Vision
  ↓
Food Analysis
  ↓
Nutrition Result
```

Backend chịu trách nhiệm bảo vệ key, quota, Premium/credit và orchestration AI.

## 13. State Management

### Global client state

```text
src/state/
├── auth/
│   └── authStore.ts
└── app/
    └── appStore.ts
```

Chỉ đưa vào global store khi nhiều feature thực sự cần.

### Feature state

State chỉ thuộc một feature nên đặt trong feature đó.

```text
Global state ≠ toàn bộ application state
```

Server state quản lý bằng TanStack Query, không đưa toàn bộ dữ liệu Backend vào Zustand.

## 14. Theme

```text
src/theme/
├── colors.ts
├── spacing.ts
├── typography.ts
├── radius.ts
├── shadows.ts
├── motion.ts
├── themes.ts
├── ThemeProvider.tsx
├── navigationTheme.ts
└── index.ts
```

`src/theme` là nguồn token duy nhất. `tailwind.config.js` import token từ đây (không gõ lại mã màu). UI phải dùng className NativeWind theo token và tuân theo `docs/design.md`.

Không hard-code màu/radius/spacing rải rác khi token tương ứng đã tồn tại. Không dùng bảng màu mặc định của NativeWind (`green-500`, `gray-200`...) và không viết `dark:` cho màu đã là token CSS variable.

## 15. Types

```text
src/types/
├── api.ts
├── common.ts
└── index.ts
```

Chỉ đặt type dùng chung toàn app. Type riêng feature đặt trong `features/<feature>/types/`. Type của theme đặt trong `src/theme/`.

## 16. Utils

```text
src/utils/
├── date.ts
├── number.ts
├── nutrition.ts
├── validation.ts
└── index.ts
```

Utils phải generic và có thể tái sử dụng. Không biến `utils` thành nơi chứa business logic không rõ nguồn gốc.

## 17. Business Logic

Business logic thuộc feature tương ứng.

Ví dụ tính toán nutrition nằm trong `features/nutrition`, không đặt tùy tiện trong UI primitive.

Quy tắc nghiệp vụ phải tuân theo:

```text
docs/business_rule.md
```

Backend là source of truth đối với business rules server-authoritative.

## 18. Dependency Rules

Hướng phụ thuộc chính:

```text
Screen
  ↓
Hook
  ↓
Feature Service
  ↓
Global Service
  ↓
External API / Expo SDK
```

Không để API service phụ thuộc Screen hoặc UI component truy cập trực tiếp database/native implementation.

Tránh circular dependency và relative import quá sâu.

## 19. Naming Convention

Components:

```text
PascalCase.tsx
```

Hooks:

```text
useSomething.ts
```

Services:

```text
somethingService.ts
```

Stores:

```text
somethingStore.ts
```

Types:

```text
something.types.ts
```

Mock:

```text
something.mock.ts
```

## 20. Import Convention

Ưu tiên absolute alias:

```ts
import { AppButton } from '@/components/ui/AppButton';
```

Hạn chế:

```ts
import { AppButton } from '../../../components/ui/AppButton';
```

## 21. Feature Boundary

Feature không truy cập tùy tiện implementation nội bộ của feature khác.

Ưu tiên public entry point:

```text
recipes/index.ts
```

Không làm:

```text
nutrition → recipes/screens/SomeInternalScreen.tsx
```

## 22. Authentication

```text
App
 ↓
Check Session
 ↓
Authenticated?
 ├── No  → AuthNavigator
 └── Yes → MainNavigator
```

Token được quản lý bởi `authStore` + `secureStorage` (`expo-secure-store`).

## 23. Error Handling

Màn hình dữ liệu nên có tối thiểu:

```text
Loading
Success
Empty
Error
```

Không để app rơi vào màn hình trắng khi API lỗi.

## 24. Mock Data & Offline Strategy

### Mock UI (nhánh `feat/mock-ui`)

Trước khi nối API thật, mọi service tạm trả dữ liệu mock:

```text
Screen → Hook (TanStack Query) → Feature Service → mocks/ (tạm thời)
```

- Mock đặt trong `src/features/<feature>/mocks/`, shape khớp `docs/SmartMeal_API_Contract.md`.
- Service đánh dấu đúng 1 chỗ `// TODO: replace mock with real API`.
- Không gọi Vision/ML Kit/Health Connect thật ở bước này (xem mục 11) — dùng nút "giả lập kết quả".
- Không hard-code mock data trực tiếp trong Screen/UI component.

### Offline cache (khi đã nối API thật)

Có thể cache các dữ liệu phù hợp như:
- User preferences.
- Recent meals.
- Recent recipes.
- Food data.
- Meal plans.

Local cache (`AsyncStorage`) không thay thế server source of truth.

## 25. Security

Không commit:
- API keys.
- Passwords.
- JWT tokens.
- Private credentials.
- Production secrets.
- File `.env` chứa giá trị thật (chỉ commit `.env.example`).

AI secret phải nằm ở Backend/environment phù hợp. Biến môi trường phía client (nếu cần) khai báo qua `app.config.ts` + `EXPO_PUBLIC_` prefix, không hard-code trong source.

## 26. Testing

Test có thể đặt trong:

```text
__tests__/
```

Ưu tiên test:
- BMI.
- BMR.
- TDEE.
- Macro calculation.
- Calorie budget.
- Validation.
- Authentication logic.
- API transformation.
- Important user flows.

## 27. Khi thêm Feature mới

1. Xác định nghiệp vụ trong `docs/business_rule.md`.
2. Xác định UI/UX trong `docs/design.md` và artboard tương ứng trong `design/`.
3. Tạo `src/features/<feature-name>/`.
4. Chỉ tạo `components`, `hooks`, `screens`, `services`, `mocks`, `types` khi cần.
5. Kết nối navigation.
6. Kết nối API (hoặc mock nếu đang ở giai đoạn mock UI).
7. Xử lý loading/error/empty.
8. Test flow chính.

## 28. Trước khi tạo file mới

Kiểm tra theo thứ tự:

1. File hiện có.
2. `components/ui`.
3. `components/common`.
4. Feature hiện tại.
5. `services`.
6. `utils`.
7. Tái sử dụng hoặc mở rộng nếu phù hợp.
8. Chỉ tạo mới khi cần.

Nguyên tắc:

```text
Reuse > Extend > Create new
```

## 29. Các nguyên tắc không được vi phạm

Không:
- Đưa business logic vào UI primitive.
- Gọi API trực tiếp trong component.
- Đưa toàn bộ state vào global store.
- Hard-code API URL.
- Hard-code AI API key.
- Để native code rải rác trong app.
- Tạo duplicate component/service.
- Copy-paste business logic giữa feature.
- Tự ý thay đổi business rule để UI dễ làm hơn.
- Bỏ qua `business_rule.md`.
- Bỏ qua `design.md`.
- Thêm package/module native ngoài Expo SDK mà không xác nhận tương thích Expo Go trước (mục 2).
- Chạy `expo prebuild`/tạo thư mục `android/`, `ios/` khi chưa có quyết định chuyển sang Dev Client.

## 30. Development Flow

```text
Requirement
    ↓
Business Rule
    ↓
Design
    ↓
Feature
    ↓
Screen
    ↓
Hook
    ↓
Service (mock hoặc API)
    ↓
Backend
    ↓
Test
```

Ví dụ AI Food Recognition:

```text
User
 ↓
expo-camera
 ↓
Scanner Screen
 ↓
useFoodRecognition()
 ↓
AI Service
 ↓
SmartMeal API
 ↓
Gemini
 ↓
Food Analysis
 ↓
Nutrition Diary
```

## 31. MVP Development Order

```text
Phase 0  Mock UI toàn bộ màn hình (Expo Go, chưa nối API/native thật)
   ↓
Phase 1  Authentication
   ↓
Phase 2  Health Profile
   ↓
Phase 3  Dashboard
   ↓
Phase 4  Food Database + Nutrition Diary
   ↓
Phase 5  Recipes
   ↓
Phase 6  Meal Planner
   ↓
Phase 7  Smart Grocery
   ↓
Phase 8  AI Snap + Voice Logging (nối API thật)
   ↓
Phase 9  Barcode + Safety Alert (Expo Go); OCR + Health Connect thật (cần Dev Client)
   ↓
Phase 10 Gamification
   ↓
Phase 11 Premium / Payment
```

## 32. Frontend - Backend Boundary

```text
SmartMeal/
├── frontend/
│   └── SmartMeal/        # Expo app
└── backend/
    └── SmartMeal API
```

Frontend không truy cập trực tiếp PostgreSQL.

```text
React Native (Expo)
      ↓
ASP.NET Core API
      ↓
PostgreSQL
```

### Backend chịu trách nhiệm
- Authentication.
- Authorization.
- Business validation.
- User data.
- Nutrition data.
- Meal data.
- Recipe data.
- AI orchestration.
- Premium/credit.
- Payment validation.
- Persistent data.

### Frontend chịu trách nhiệm
- UI.
- Navigation.
- Local state.
- Local cache.
- Native capabilities (trong giới hạn Expo SDK/Expo Go).
- User interaction.
- API integration.

## 33. Source of Truth

| Loại | Source of Truth |
|---|---|
| Business Rule | `docs/business_rule.md` + Backend |
| UI/UX | `docs/design.md` |
| Frontend Structure | `docs/structure_system.md` |
| Persistent Data | Backend + PostgreSQL |
| Authentication | Backend |
| AI Secret | Backend |
| UI State | React Native (Expo) |
| Local Preferences | AsyncStorage |
| Server Data | Backend |

## 34. Checklist trước khi Merge

- [ ] Code nằm đúng feature.
- [ ] Không tạo component trùng.
- [ ] Không gọi API trực tiếp từ UI.
- [ ] Không hard-code API URL.
- [ ] Không commit secret/API key/`.env` thật.
- [ ] Không thay đổi business rule ngoài yêu cầu.
- [ ] UI tuân theo `design.md`, đúng artboard trong `design/`.
- [ ] Có loading state.
- [ ] Có error state.
- [ ] Có empty state nếu cần.
- [ ] TypeScript không có lỗi.
- [ ] Không có import path quá sâu.
- [ ] Không có circular dependency.
- [ ] Đã test flow chính.
- [ ] Không phá vỡ feature hiện có.
- [ ] Không thêm package/module ngoài Expo SDK nếu chưa xác nhận chạy được trên Expo Go.

## 35. Nguyên tắc cuối cùng

SmartMeal ưu tiên:

```text
Clear Structure
      +
Feature Ownership
      +
Reusable Components
      +
Separation of Concerns
      +
Secure API Integration
      +
Maintainability
      +
Expo Go Compatibility (đến khi có quyết định chuyển Dev Client)
```

> Mỗi file có một trách nhiệm rõ ràng, mỗi feature sở hữu nghiệp vụ của mình, và các thành viên trong team có thể làm việc song song mà không tạo ra code trùng lặp hoặc phụ thuộc chéo khó kiểm soát.

---

**Document:** `structure_system.md`
**Project:** SmartMeal
**Architecture:** Feature-based + Layered
**Frontend:** React Native (Expo, chạy qua Expo Go) + TypeScript
**Backend:** ASP.NET Core .NET 8 + PostgreSQL