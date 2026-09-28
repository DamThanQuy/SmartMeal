# Rule — Không hard-code

## 1. Màu sắc, spacing, radius, typography, shadow

Design tokens nằm ở `src/theme/` (`colors.ts`, `spacing.ts`, `typography.ts`, `radius.ts`,
`shadows.ts`, `themes.ts`, `index.ts`), giá trị chuẩn theo `docs/design.md` (mục 4, 6, 7, 8, 9, 58).
`tailwind.config.js` import token từ `src/theme` — không gõ lại giá trị ở đó.

```tsx
// Sai
<View style={{ backgroundColor: '#22A447', padding: 16, borderRadius: 12 }} />
<Text style={{ color: '#183022', fontSize: 18, fontWeight: '600' }} />
<View className="bg-green-500 p-4 rounded-xl" />       // dùng palette Tailwind mặc định
<View className="bg-surface dark:bg-night-800" />       // dark: cho màu đã là token CSS variable

// Đúng — NativeWind với token ngữ nghĩa (tự đổi theo light/dark qua CSS variable)
<View className="bg-primary p-md rounded-md" />
<AppText variant="h3">...</AppText>

// StyleSheet chỉ khi className không làm được (animation, giá trị động)
const styles = useThemedStyles((t) => ({ box: { backgroundColor: t.colors.surface } }));
```

- Không tạo màu/spacing/radius mới cho riêng một màn hình nếu token tương ứng đã tồn tại trong `docs/design.md`.
- Không dùng bảng màu mặc định của Tailwind (`green-500`, `gray-200`, `text-black`, `bg-white`…) —
  chỉ dùng tên token ngữ nghĩa (`bg-primary`, `text-text-primary`, `border-border`…).
- Không viết `dark:` cho màu đã là token — token tự đổi qua CSS variable theo light/dark.
- Nếu NativeWind config chưa có token cần dùng, thêm vào `src/theme/` + `tailwind.config.js` một lần,
  không patch giá trị số trực tiếp tại nơi dùng (`p-[13px]`, `rounded-[10px]`).
- Spacing chỉ dùng theo hệ 4px đã định nghĩa (4/8/12/16/20/24/32/40), không dùng số tùy ý (13, 17, 19, 27...).
- Font: dùng token `text-h1`/`text-body`/`font-semibold`… (Inter, nạp qua `expo-font`). Không set
  `fontWeight` cùng lúc với `fontFamily` custom.

## 2. Cấu hình môi trường & API

```
src/config/
├── env.ts   ← đọc qua expo-constants (Constants.expoConfig.extra), KHÔNG default cứng URL production
├── api.ts   ← base URL, timeout, version — đọc từ env.ts
├── mock.ts  ← MOCK_SCENARIO (nhánh feat/mock-ui)
└── app.ts
```

```ts
// Sai
const BASE_URL = 'https://api.smartmeal.com/v1';
axios.get('https://api.smartmeal.com/v1/meals');

// Sai — kiểu .env của React Native CLI, Expo không tự đọc file này khi build
import { API_URL } from '@env';

// Đúng — khai báo trong app.config.ts (extra), đọc qua expo-constants
// app.config.ts: extra: { apiUrl: process.env.EXPO_PUBLIC_API_URL }
import Constants from 'expo-constants';
const BASE_URL = Constants.expoConfig?.extra?.apiUrl;

// Hoặc dùng thẳng biến public do Expo tự inline lúc build
const BASE_URL = process.env.EXPO_PUBLIC_API_URL;
```

Không hard-code URL API rải rác trong service/screen — luôn qua `src/services/api/client.ts` + `endpoints.ts`.
File `.env` chỉ chứa biến có prefix `EXPO_PUBLIC_` (biến này bị inline vào bundle nên có thể lộ ra, không
đặt secret vào đây).

## 3. Secret / API key

Không bao giờ đặt AI API key (Gemini...), token bí mật, hoặc credential trong code React Native —
mobile không giữ secret AI (xem `docs/tech_stack.md` mục 22, `docs/structure_system.md` mục 25).

```ts
// Tuyệt đối không làm
const GEMINI_API_KEY = 'AIza...';
```

AI luôn gọi qua `SmartMeal API` (backend), không gọi thẳng Gemini/LLM từ mobile.

## 4. Route / navigation key

```
src/constants/routes.ts
```

```tsx
// Sai
navigation.navigate('MealDetailScreen');

// Đúng
navigation.navigate(ROUTES.MEAL_DETAIL);
```

## 5. Chuỗi & hằng số nghiệp vụ

- Giá trị cố định có ý nghĩa hệ thống/nghiệp vụ (loại bữa ăn, activity factor, ngưỡng cảnh báo...) đặt
  trong `src/constants/` (`nutrition.ts`, `meals.ts`...), không lặp lại literal ở nhiều file.
- Công thức tính (BMI/BMR/TDEE/macro) chỉ được định nghĩa **một lần** trong `src/utils/` hoặc feature
  `health`, không copy công thức sang file khác (tránh lệch công thức giữa các màn hình — vi phạm
  BR-022 trong `business_rule.md`).
- Không hard-code dữ liệu động lẽ ra phải đến từ Backend (danh sách món ăn, giá nguyên liệu...) vào
  `constants/` — constants chỉ chứa giá trị tĩnh của hệ thống.

## 6. Mock data (giai đoạn `feat/mock-ui`)

Mock data được phép tồn tại tạm thời nhưng phải cô lập trong `src/features/<feature>/mocks/` (xem
`CLAUDE.md` mục 8), có type rõ ràng, không hard-code trực tiếp trong JSX của Screen/component dùng
chung, và không import mock ở tầng Screen/Hook — chỉ Service được đọc `mocks/`.

## 7. Checklist nhanh trước khi commit

- [ ] Không có mã màu hex/rgba viết tay ngoài `src/theme/`.
- [ ] Không dùng class màu Tailwind mặc định (`green-500`, `gray-200`…) hoặc `dark:` cho màu token.
- [ ] Không có số spacing/radius viết tay ngoài hệ 4px/token.
- [ ] Không có URL, base path API viết tay ngoài `src/config/`.
- [ ] Không có API key/secret/token trong source.
- [ ] Không có route string viết tay ngoài `src/constants/routes.ts`.
- [ ] Không có mock data hard-code trong Screen/UI component.
- [ ] Kiểm tra hiển thị đúng ở cả light và dark mode.
