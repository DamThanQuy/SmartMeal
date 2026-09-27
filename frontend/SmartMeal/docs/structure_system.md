# SmartMeal - System Structure

> Tài liệu quy định cấu trúc source code, cách tổ chức module và nguyên tắc phát triển Frontend React Native của SmartMeal.

## 1. Mục đích

`structure_system.md` định nghĩa cấu trúc thư mục, quy tắc đặt file, phân chia trách nhiệm giữa các layer, cách tổ chức feature, giao tiếp Mobile–Backend, shared components, state, API, storage và native services.

Tài liệu này không thay thế:
- `business_rule.md`: nghiệp vụ.
- `design.md`: UI/UX và design system.

## 2. Công nghệ

### Frontend
- React Native + TypeScript
- React Navigation
- Axios
- Zustand
- React Hook Form + Zod
- Secure Storage
- Camera / OCR / Barcode
- Health Connect / HealthKit
- Push Notifications

### Backend
- ASP.NET Core .NET 8
- PostgreSQL
- REST API
- JWT Authentication

### AI
AI được gọi thông qua Backend. Mobile không lưu API key của Gemini hoặc AI provider.

```text
React Native
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
Screen → Hook / Store → Storage Service → Local Storage / Secure Storage
```

Native functionality:

```text
Feature → Native Service → Camera / OCR / Barcode / Health / Notifications
```

## 4. Cấu trúc thư mục

```text
SmartMeal/
├── android/
├── ios/
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
│   │   ├── dashboard/
│   │   ├── nutrition/
│   │   ├── recipes/
│   │   ├── meal-planner/
│   │   ├── grocery/
│   │   ├── health/
│   │   ├── scanner/
│   │   ├── ai/
│   │   ├── gamification/
│   │   └── premium/
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
├── index.js
├── package.json
├── tsconfig.json
├── babel.config.js
├── metro.config.js
└── README.md
```

## 5. Feature-based Architecture

Mỗi nghiệp vụ chính là một feature:

| Feature | Trách nhiệm |
|---|---|
| `auth` | Đăng nhập, đăng ký, OTP, Google Sign-In, session |
| `dashboard` | Tổng quan sức khỏe, calories, macros, quick actions |
| `nutrition` | Nhật ký ăn uống, calories, macros, biểu đồ |
| `recipes` | Công thức, tìm kiếm, lọc, yêu thích |
| `meal-planner` | Lập kế hoạch bữa ăn |
| `grocery` | Danh sách mua sắm, nguyên liệu, chi phí |
| `health` | BMI, BMR, TDEE, dị ứng, hồ sơ sức khỏe |
| `scanner` | Camera, OCR, barcode, nutrition label |
| `ai` | AI Vision, Voice Logging, AI meal analysis |
| `gamification` | Pet, XP, streak, badge, challenge |
| `premium` | Premium, credit, giới hạn AI, thanh toán |

Feature tiêu chuẩn:

```text
nutrition/
├── components/
├── hooks/
├── screens/
├── services/
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
Logic giao tiếp dữ liệu của feature. Service gọi API thông qua API client chung, không gọi Axios trực tiếp trong Screen.

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
└── app.ts
```

Environment và API configuration không được hard-code rải rác.

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
    ├── Health
    └── Profile
```

Navigation không chứa business logic.

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

`storage.ts`: preferences/cache không nhạy cảm.

`secureStorage.ts`: access token, refresh token và dữ liệu nhạy cảm.

Không lưu token nhạy cảm trong plain storage nếu có secure storage phù hợp.

## 11. Native Services

Native functionality phải được cô lập qua service:

```text
Feature → Native Service → Native API
```

Bao gồm:
- Camera
- OCR
- Barcode
- Health Connect
- HealthKit
- Notifications
- Microphone
- Photo Library

Không để native implementation rải rác trong các Screen.

## 12. AI Architecture

Không gọi Gemini trực tiếp từ Mobile bằng secret key.

```text
React Native
    ↓
SmartMeal API
    ↓
AI Service
    ↓
Gemini / LLM
```

Ví dụ AI Food Recognition:

```text
Camera
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

Server state nên được quản lý bằng data-fetching/cache layer phù hợp nếu team sử dụng, thay vì đưa toàn bộ dữ liệu Backend vào Zustand.

## 14. Theme

```text
src/theme/
├── colors.ts
├── spacing.ts
├── typography.ts
├── radius.ts
├── shadows.ts
└── index.ts
```

UI phải dùng design tokens và tuân theo `docs/design.md`.

Không hard-code màu/radius/spacing rải rác khi token tương ứng đã tồn tại.

## 15. Types

```text
src/types/
├── api.ts
├── common.ts
└── index.ts
```

Chỉ đặt type dùng chung toàn app. Type riêng feature đặt trong `features/<feature>/types/`.

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
External API / Native API
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

Token được quản lý bởi `authStore` + `secureStorage`.

## 23. Error Handling

Màn hình dữ liệu nên có tối thiểu:

```text
Loading
Success
Empty
Error
```

Không để app rơi vào màn hình trắng khi API lỗi.

## 24. Offline Strategy

Có thể cache các dữ liệu phù hợp như:
- User preferences.
- Recent meals.
- Recent recipes.
- Food data.
- Meal plans.

Local cache không thay thế server source of truth.

## 25. Security

Không commit:
- API keys.
- Passwords.
- JWT tokens.
- Private credentials.
- Production secrets.

AI secret phải nằm ở Backend/environment phù hợp.

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
2. Xác định UI/UX trong `docs/design.md`.
3. Tạo `src/features/<feature-name>/`.
4. Chỉ tạo `components`, `hooks`, `screens`, `services`, `types` khi cần.
5. Kết nối navigation.
6. Kết nối API.
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
Service
    ↓
API
    ↓
Backend
    ↓
Test
```

Ví dụ AI Food Recognition:

```text
User
 ↓
Camera
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
Phase 8  AI Snap + Voice Logging
   ↓
Phase 9  OCR + Barcode + Safety
   ↓
Phase 10 Health Connect / HealthKit
   ↓
Phase 11 Gamification
   ↓
Phase 12 Premium / Payment
```

## 32. Frontend - Backend Boundary

```text
SmartMeal/
├── frontend/
│   └── SmartMeal/
└── backend/
    └── SmartMeal API
```

Frontend không truy cập trực tiếp PostgreSQL.

```text
React Native
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
- Native capabilities.
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
| UI State | React Native |
| Local Preferences | Local Storage |
| Server Data | Backend |

## 34. Checklist trước khi Merge

- [ ] Code nằm đúng feature.
- [ ] Không tạo component trùng.
- [ ] Không gọi API trực tiếp từ UI.
- [ ] Không hard-code API URL.
- [ ] Không commit secret/API key.
- [ ] Không thay đổi business rule ngoài yêu cầu.
- [ ] UI tuân theo `design.md`.
- [ ] Có loading state.
- [ ] Có error state.
- [ ] Có empty state nếu cần.
- [ ] TypeScript không có lỗi.
- [ ] Không có import path quá sâu.
- [ ] Không có circular dependency.
- [ ] Đã test flow chính.
- [ ] Không phá vỡ feature hiện có.

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
```

> Mỗi file có một trách nhiệm rõ ràng, mỗi feature sở hữu nghiệp vụ của mình, và các thành viên trong team có thể làm việc song song mà không tạo ra code trùng lặp hoặc phụ thuộc chéo khó kiểm soát.

---

**Document:** `structure_system.md`  
**Project:** SmartMeal  
**Architecture:** Feature-based + Layered  
**Frontend:** React Native + TypeScript  
**Backend:** ASP.NET Core .NET 8 + PostgreSQL
