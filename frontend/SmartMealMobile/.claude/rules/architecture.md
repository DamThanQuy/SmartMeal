# Rule — Kiến trúc & Feature Boundary

Tóm tắt thực thi từ `docs/structure_system.md`. Khi có xung đột, `structure_system.md` là nguồn chuẩn.

## Layering bắt buộc

```
Screen → Hook → Feature Service → API Client / Native Service → Backend / Native API
```

```tsx
// Sai — gọi Axios trực tiếp trong Screen
const response = await axios.get('/meals');

// Sai — gọi mock trực tiếp trong Screen (nhánh feat/mock-ui)
import { mealsMock } from '../mocks/meals.mock';

// Đúng
const { data } = useMeals();          // hook
// useMeals() → mealService.getMeals() → apiClient.get(endpoints.meals)
//   (nhánh feat/mock-ui: mealService.getMeals() tạm trả mocks/meals.mock.ts,
//    có đúng 1 comment // TODO: replace mock with real API)
```

- Screen: chỉ render UI + gọi hook + xử lý navigation + loading/error/empty. Không chứa business logic phức tạp.
- Hook (`features/<feature>/hooks/`): kết nối UI với service/state (TanStack Query, Zustand). Không import
  thẳng file trong `mocks/`.
- Service (`features/<feature>/services/`): business/data logic, gọi API client chung (`src/services/api/`)
  — không gọi Axios trực tiếp bên ngoài đó. Trên nhánh `feat/mock-ui`, service là nơi DUY NHẤT được đọc
  `mocks/`.
- Native service (`services/permissions`, hoặc `features/<feature>/services/` cho camera/OCR/health): cô lập
  toàn bộ native API qua **Expo SDK** (`expo-camera`, `expo-notifications`, `expo-av`, `expo-image-picker`...),
  không gọi native API trực tiếp từ nhiều Screen khác nhau. Trên nhánh mock-ui, service này chỉ trả kết quả
  giả lập, chưa gọi native thật. Không dùng package yêu cầu native linking thủ công (Vision Camera, ML Kit,
  MMKV, Keychain, Notifee) khi còn chạy Expo Go — xem `docs/structure_system.md` §2/§11.

## Feature module chuẩn

```
features/<feature>/
├── components/   # component chỉ phục vụ feature này
├── hooks/
├── screens/
├── services/
├── mocks/        # dữ liệu giả lập, khớp docs/SmartMeal_API_Contract.md (nhánh feat/mock-ui)
├── types/
└── index.ts      # public entry point
```

Chỉ tạo các thư mục con khi thực sự cần (không tạo rỗng cho đủ bộ).

Feature chuẩn: `auth`, `health`, `dashboard`, `nutrition`, `recipes`, `meal-planner`, `grocery`, `scanner`,
`ai`, `gamification`, `premium`, `profile`, `dev`.

## Feature boundary

- Feature A không import thẳng file nội bộ của feature B (`nutrition → recipes/screens/SomeInternalScreen.tsx`
  là sai).
- Muốn dùng gì từ feature khác → export qua `index.ts` của feature đó rồi import từ entry point.
- Tránh circular dependency giữa các feature.

## State placement

| Loại state | Nơi đặt |
|---|---|
| Server data (meals, recipes, user...) | TanStack Query (trong hook của feature) |
| Global client state (auth, theme, language, preference) | `src/state/{auth,app}` (Zustand) |
| State chỉ 1 feature dùng | Trong chính feature đó, không đẩy lên global |
| Component-local state | `useState`/`useReducer` |
| Form state | React Hook Form |

Chỉ đưa vào global store khi **nhiều feature thực sự cần** — không mặc định đẩy mọi thứ lên Zustand.

## Trước khi thêm feature mới

1. Xác định nghiệp vụ trong `docs/business_rule.md`.
2. Xác định UI/UX trong `docs/design.md` và artboard tương ứng trong `design/*.dc.html`.
3. Tạo `src/features/<feature-name>/` theo cấu trúc chuẩn ở trên.
4. Kết nối navigation (`src/navigation/`), service (mock trên nhánh `feat/mock-ui`, sau này là
   `src/services/api/`), xử lý loading/error/empty.
5. Test flow chính.

Có thể dùng command `/new-feature` hoặc agent `rn-feature-scaffolder` để dựng khung nhanh, nhưng vẫn phải
điền đúng nội dung nghiệp vụ theo docs và artboard.

## Checklist kiến trúc trước khi merge

- [ ] Code nằm đúng feature, không lẫn sang feature khác.
- [ ] Không gọi API/mock trực tiếp từ UI/component.
- [ ] Không có circular dependency, không import sâu xuyên feature.
- [ ] Global store chỉ chứa state thực sự dùng chung.
- [ ] Native API được cô lập qua service, dùng đúng Expo SDK, không rải rác trong Screen.
