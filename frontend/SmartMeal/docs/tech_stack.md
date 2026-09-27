# SmartMeal — Technology Stack

## 1. Mục tiêu

SmartMeal là mobile app về dinh dưỡng, AI meal logging, sức khỏe, meal planning và gamification.

Stack được chọn theo các nguyên tắc:

- Mobile-first.
- React Native + TypeScript.
- Dễ phát triển Android/iOS.
- Feature-based architecture.
- Ít dependency nhưng đúng trách nhiệm.
- Native feature được cô lập qua service.
- Server state và client state tách biệt.
- UI không phụ thuộc vào business logic.
- Backend là nguồn dữ liệu chính.

---

# 2. Technology Stack tổng thể

| Layer | Technology | Mục đích |
|---|---|---|
| Mobile | React Native | Mobile framework |
| Language | TypeScript | Type safety |
| Styling | NativeWind | Utility-first styling |
| UI | Custom Components + RN | UI system |
| Icons | Lucide React Native | Icons |
| Navigation | React Navigation | Navigation |
| Server State | TanStack Query | API data/cache |
| Client State | Zustand | Global client state |
| HTTP | Axios | REST API |
| Forms | React Hook Form | Form management |
| Validation | Zod | Validation/schema |
| Animation | Reanimated | Animation |
| Gesture | Gesture Handler | Gestures |
| Bottom Sheet | @gorhom/bottom-sheet | Bottom sheet |
| Storage | MMKV | Local storage |
| Secure Storage | React Native Keychain | Token/secrets |
| Camera | Vision Camera | Camera/scanning |
| OCR | ML Kit / native OCR | OCR |
| Barcode | ML Kit / Vision Camera | Barcode |
| Health | Health Connect / HealthKit | Health data |
| Notification | Notifee | Local notifications |
| Charts | react-native-gifted-charts | Nutrition charts |
| Date | date-fns | Date/time |
| Network | NetInfo | Network status |
| Backend | ASP.NET Core .NET 8 | REST API |
| Database | PostgreSQL | Persistent data |
| AI | Backend → Gemini/LLM | AI processing |

---

# 3. Core Architecture

```text
React Native
    │
    ├── Screens
    │      ↓
    ├── Hooks
    │      ↓
    ├── Feature Services
    │      ↓
    ├── API / Native Services
    │      ↓
    └── External Systems
             │
             ├── ASP.NET Core API
             ├── Camera / ML Kit
             ├── Health Connect / HealthKit
             └── Notifications
```

Backend:

```text
React Native
      ↓
ASP.NET Core .NET 8
      ↓
PostgreSQL
      ↓
AI / External Services
```

Mobile không truy cập PostgreSQL trực tiếp.

---

# 4. Styling

## NativeWind

NativeWind là styling chính.

Dùng cho:

- Layout.
- Spacing.
- Colors.
- Typography.
- Border.
- Radius.
- Flex.
- Common UI.

Ví dụ:

```tsx
<View className="flex-1 bg-white px-4">
  <Text className="text-xl font-bold">
    SmartMeal
  </Text>
</View>
```

Không tạo một file global chứa toàn bộ style của app.

Design tokens nằm tại:

```text
src/theme/
├── colors.ts
├── spacing.ts
├── typography.ts
├── radius.ts
├── shadows.ts
└── index.ts
```

Style phải tuân theo:

```text
docs/design.md
```

---

# 5. UI Components

Không dùng một UI framework lớn làm dependency chính.

SmartMeal dùng:

```text
React Native
+
NativeWind
+
Lucide React Native
+
Custom UI Components
```

Shared UI:

```text
src/components/ui/
├── AppButton.tsx
├── AppCard.tsx
├── AppInput.tsx
├── AppText.tsx
├── AppChip.tsx
├── AppIconButton.tsx
└── AppBottomSheet.tsx
```

Generic component:

```text
src/components/common/
├── EmptyState.tsx
├── ErrorState.tsx
├── LoadingState.tsx
├── ScreenContainer.tsx
└── SectionHeader.tsx
```

Feature-specific component phải nằm trong feature.

---

# 6. Navigation

## React Navigation

Sử dụng:

- Native Stack.
- Bottom Tabs.
- Modal/Stack khi cần.

Cấu trúc:

```text
src/navigation/
├── AppNavigator.tsx
├── AuthNavigator.tsx
├── MainNavigator.tsx
├── types.ts
└── linking.ts
```

Không đặt navigation logic trực tiếp trong business component.

---

# 7. State Management

## TanStack Query

Dùng cho server state:

- User data.
- Nutrition diary.
- Recipes.
- Meal planner.
- Grocery.
- Food database.
- Notifications từ backend.
- AI results.

Flow:

```text
Screen
  ↓
Hook
  ↓
TanStack Query
  ↓
Feature Service
  ↓
API
```

## Zustand

Dùng cho client state:

- Authentication status.
- User preferences.
- Theme.
- Language.
- Temporary UI state.
- App-level settings.

Không dùng Zustand để lưu toàn bộ server database.

---

# 8. HTTP

## Axios

API client nằm tại:

```text
src/services/api/
├── client.ts
├── interceptors.ts
└── endpoints.ts
```

Không được gọi Axios trực tiếp trong Screen.

Sai:

```tsx
const response = await axios.get("/meals");
```

Đúng:

```text
Screen
 ↓
useMeals()
 ↓
mealService.getMeals()
 ↓
apiClient.get()
```

---

# 9. Forms

## React Hook Form

Dùng cho:

- Login.
- Register.
- Profile.
- Health Profile.
- Food input.
- Meal Planner.
- Grocery.
- Premium/payment.

## Zod

Dùng để validate schema.

Ví dụ:

```ts
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});
```

Kết hợp:

```text
React Hook Form
+
Zod
```

---

# 10. Animation

## React Native Reanimated

Dùng cho:

- Progress.
- Pet animation.
- Streak.
- Gamification.
- AI scanning.
- Success state.
- Card transition.

Không tự tạo animation bằng setInterval nếu Reanimated có thể xử lý.

---

# 11. Gesture

## React Native Gesture Handler

Dùng cho:

- Swipe.
- Drag.
- Interactive cards.
- Bottom sheet.
- Gesture-based interaction.

Kết hợp:

```text
Gesture Handler
+
Reanimated
```

---

# 12. Bottom Sheet

## @gorhom/bottom-sheet

Dùng cho:

- Quick Add.
- Food detail.
- Recipe action.
- Filter.
- Sort.
- AI result.
- Camera action.
- Grocery action.

---

# 13. Camera

## react-native-vision-camera

Dùng cho:

- AI Snap.
- Food recognition.
- OCR.
- Barcode.
- Fridge Scanner.

Không viết camera logic trực tiếp trong nhiều Screen.

Architecture:

```text
Screen
 ↓
Hook
 ↓
Scanner Service
 ↓
Vision Camera
```

---

# 14. OCR

OCR được xử lý thông qua native ML/OCR service.

Flow:

```text
Camera
 ↓
OCR
 ↓
Extract Text
 ↓
Nutrition Parser
 ↓
Backend
```

OCR service nằm trong:

```text
src/features/scanner/services/
```

---

# 15. Barcode

Barcode flow:

```text
Camera
 ↓
Barcode Scanner
 ↓
Product Code
 ↓
Backend
 ↓
Food Database
```

Không duy trì toàn bộ barcode database trong mobile.

---

# 16. Health

Android:

```text
Health Connect
```

iOS:

```text
HealthKit
```

Service:

```text
src/features/health/services/
```

Health data chỉ được truy cập sau khi user cấp permission.

---

# 17. Storage

## MMKV

Dùng cho:

- Theme.
- Language.
- Preferences.
- Onboarding.
- Recent searches.
- Local flags.

## React Native Keychain

Dùng cho:

- Access token.
- Refresh token.
- Sensitive credentials.

Không lưu secret quan trọng trong plain storage.

---

# 18. Network

## @react-native-community/netinfo

Dùng để:

- Detect online/offline.
- Hiển thị offline state.
- Điều chỉnh UX khi mất mạng.

---

# 19. Notifications

## Notifee

Dùng cho:

- Meal reminder.
- Water reminder.
- Streak.
- Challenge.
- AI credit.
- Premium.

Permission phải được xin ở thời điểm hợp lý.

---

# 20. Charts

## react-native-gifted-charts

Dùng cho:

- Calories.
- Protein.
- Carbs.
- Fat.
- Weight.
- BMI.
- Nutrition history.
- Progress.

Chart component phải nằm trong feature tương ứng.

---

# 21. Utilities

## date-fns

Dùng cho date/time.

## uuid

Dùng khi frontend thực sự cần client-generated ID.

Không tự tạo UUID bằng random string.

---

# 22. AI Architecture

API key AI không được nằm trong React Native.

Sai:

```text
React Native
 ↓
Gemini API Key
 ↓
Gemini
```

Đúng:

```text
React Native
 ↓
SmartMeal API
 ↓
AI Service
 ↓
Gemini / LLM
```

Lợi ích:

- Bảo vệ API key.
- Quản lý quota.
- Quản lý Premium.
- Quản lý credit.
- Logging.
- Thay đổi AI provider dễ hơn.

---

# 23. AI Features

SmartMeal có thể gồm:

```text
AI Vision
Voice Logging
Food Recognition
Meal Analysis
Recipe Recommendation
Nutrition Analysis
```

AI feature:

```text
src/features/ai/
├── components/
├── hooks/
├── services/
└── types/
```

---

# 24. Security

Không commit:

```text
.env production secrets
AI API keys
Database passwords
Private credentials
```

Không hard-code:

```ts
const GEMINI_API_KEY = "...";
```

Token nhạy cảm dùng Keychain.

---

# 25. Package Rules

Trước khi cài package mới:

1. Kiểm tra package đã tồn tại.
2. Kiểm tra React Native compatibility.
3. Kiểm tra Android/iOS support.
4. Kiểm tra maintenance.
5. Kiểm tra native setup.
6. Xác định package giải quyết vấn đề gì.
7. Không thêm package trùng trách nhiệm.

Không cài nhiều thư viện cùng giải quyết một vấn đề nếu không có lý do rõ ràng.

---

# 26. Không dùng tùy tiện

Không tự động thêm:

```text
Redux
MobX
Apollo
GraphQL
Firebase
UI framework lớn
Expo
```

nếu project không có requirement.

SmartMeal hiện ưu tiên:

```text
REST API
+
TanStack Query
+
Zustand
```

---

# 27. State Rules

| Loại dữ liệu | Công nghệ |
|---|---|
| Server data | TanStack Query |
| Global client state | Zustand |
| Component state | useState / useReducer |
| Form state | React Hook Form |
| Local preferences | MMKV |
| Sensitive credentials | Keychain |

---

# 28. Component Rules

```text
Shared UI
→ src/components/ui

Generic UI
→ src/components/common

Business component
→ src/features/<feature>/components
```

Ví dụ:

```text
AppButton
→ components/ui

LoadingState
→ components/common

MealCard
→ features/nutrition/components

RecipeCard
→ features/recipes/components
```

---

# 29. Native Service Rules

Không gọi native API trực tiếp từ nhiều Screen.

Sai:

```text
Dashboard
Nutrition
Profile
Health
    ↓
Health API
```

Đúng:

```text
Feature
 ↓
Native Service
 ↓
Native API
```

---

# 30. Development Phases

## Phase 1 — Foundation

```text
React Native
TypeScript
NativeWind
Theme
UI Components
Navigation
```

## Phase 2 — Core App

```text
Axios
TanStack Query
Zustand
MMKV
Keychain
Authentication
```

## Phase 3 — Nutrition

```text
Health Profile
Dashboard
Nutrition Diary
Food Database
Recipes
```

## Phase 4 — Planning

```text
Meal Planner
Smart Grocery
```

## Phase 5 — AI / Scanner

```text
Vision Camera
AI Snap
OCR
Barcode
Voice Logging
Fridge Scanner
```

## Phase 6 — Health / Engagement

```text
Health Connect
HealthKit
Notifications
Gamification
Pet
Streak
```

## Phase 7 — Premium

```text
Credit
Premium
Payment
Usage Limits
```

---

# 31. Recommended Folder Mapping

```text
src/
├── assets/
├── components/
│   ├── ui/
│   └── common/
├── config/
├── constants/
├── features/
│   ├── auth/
│   ├── dashboard/
│   ├── nutrition/
│   ├── recipes/
│   ├── meal-planner/
│   ├── grocery/
│   ├── health/
│   ├── scanner/
│   ├── ai/
│   ├── gamification/
│   └── premium/
├── hooks/
├── navigation/
├── services/
│   ├── api/
│   ├── storage/
│   ├── permissions/
│   ├── notifications/
│   └── analytics/
├── state/
│   ├── auth/
│   └── app/
├── theme/
├── types/
└── utils/
```

---

# 32. Development Principle

SmartMeal không cần càng nhiều thư viện càng tốt.

Mục tiêu:

```text
Một thư viện
      ↓
Một trách nhiệm rõ ràng
```

Core:

```text
React Native
+
TypeScript
+
NativeWind
+
React Navigation
+
TanStack Query
+
Zustand
+
React Hook Form
+
Zod
+
Axios
+
Reanimated
```

Native:

```text
Vision Camera
Health Connect / HealthKit
ML/OCR
Notifee
```

Backend:

```text
ASP.NET Core .NET 8
+
PostgreSQL
```

---

# 33. Source of Truth

Business rules:

```text
docs/business_rule.md
```

UI/UX:

```text
docs/design.md
```

Architecture:

```text
docs/structure_system.md
```

Technology:

```text
docs/tech_stack.md
```

Khi implement feature:

```text
business_rule.md
        ↓
design.md
        ↓
structure_system.md
        ↓
tech_stack.md
        ↓
implementation
```

Không tự thay đổi business flow nếu chưa có requirement.

---

# 34. Definition of Done

Một feature chỉ được xem là hoàn thành khi:

- Đúng business rule.
- Đúng design.
- Đúng folder architecture.
- Dùng đúng technology stack.
- Không duplicate shared component.
- Không gọi API trực tiếp từ UI.
- Không hard-code secret.
- Có loading state.
- Có error state.
- Có empty state nếu cần.
- Xử lý offline phù hợp.
- Không tạo dependency không cần thiết.
- TypeScript không có lỗi.
- Test các logic quan trọng.
