# Rule — TypeScript/TSX cho React Native (mobile, Expo)

## Types

- Bật strict mode (kế thừa cấu hình TypeScript mặc định của Expo — `tsconfig.json` extends
  `expo/tsconfig.base`), không tắt strict để né lỗi.
- Không dùng `any`. Nếu thực sự chưa biết shape, dùng `unknown` + narrow, hoặc khai báo type tạm rõ
  ràng kèm `// TODO` giải thích lý do.
- Mọi props của component phải có `interface <ComponentName>Props`, đặt ngay trên component, export
  nếu screen/hook khác cần dùng lại.
- Type dùng chung toàn app → `src/types/`. Type riêng feature → `src/features/<feature>/types/`.
  Type của theme (`Theme`, `ThemeColors`, `ThemeMode`…) đặt trong `src/theme/`. Không đặt type dùng
  chung trong 1 feature cụ thể.
- Naming file type riêng: `something.types.ts` (theo `docs/structure_system.md` mục 19).
- Dữ liệu từ API/mock phải có type khớp `docs/SmartMeal_API_Contract.md`; không dùng object literal
  tùy ý rồi ép kiểu (`as any`, `as SomeType` khi shape không khớp thật).

## Component

- Function component, arrow function, named export (trừ `App.tsx`/entry file theo yêu cầu của
  React Native/Expo Router nếu dùng).
- Không viết business logic trong component UI — xem `@.claude/rules/component-reuse.md` và
  `@.claude/rules/state-and-api.md`.
- Props destructure ngay trong signature, có default value rõ ràng thay vì `??`/`||` rải rác trong
  thân hàm.
- Không tạo component vô danh lồng bên trong component khác (định nghĩa 1 component mỗi file, trừ
  sub-component nội bộ rất nhỏ và không tái sử dụng).

## Styling (NativeWind)

- Ưu tiên `className` (NativeWind) cho layout/spacing/color/typography/border/radius/flex, dùng
  token ngữ nghĩa theo `@.claude/rules/no-hardcode.md` — không hex, không màu Tailwind mặc định,
  không `dark:` cho màu token.
- Biến thể (variant, size) dùng `cva` hoặc object map, không nối chuỗi className bằng nhiều `?:` lồng nhau.
- Dùng `StyleSheet.create` (qua `useThemedStyles`) chỉ cho style động/phức tạp NativeWind chưa hỗ trợ
  tốt (ví dụ transform phức tạp với Reanimated).
- Giá trị màu cần dùng trong JS (icon Lucide, `ActivityIndicator`, `placeholderTextColor`, chart,
  `StatusBar`) lấy từ `useTheme()`, không viết hex tay.
- Không dùng inline style object literal lặp lại nhiều nơi — nếu lặp lại ≥ 2 chỗ, tách thành
  component hoặc style dùng chung.

## Performance

- `FlatList`/`FlashList`: luôn có `keyExtractor` ổn định, tránh tạo function/object mới trong
  `renderItem` khi danh sách dài (đưa ra ngoài hoặc `useCallback`).
- Dùng `React.memo` cho component hiển thị trong list lặp lại nhiều (`MealCard`, `RecipeCard`...)
  khi props ổn định.
- Animation dùng Reanimated/Gesture Handler chạy trên UI thread; không tự viết animation bằng
  `setInterval`/`setState` liên tục nếu Reanimated xử lý được (theo `docs/tech_stack.md` mục 10).
- Không gọi API/service trong vòng lặp render; fetch qua hook + TanStack Query.

## Null-safety & lỗi

- Không dùng non-null assertion (`!`) để né lỗi TypeScript trừ khi chắc chắn 100% và có comment
  giải thích invariant.
- Optional chaining (`?.`) + nullish coalescing (`??`) khi dữ liệu có thể thiếu (đặc biệt dữ liệu từ
  AI/estimate — xem business rule BR-054, BR-061).
- Mọi request async (API/mock, native module) phải có try/catch hoặc được TanStack Query quản lý lỗi;
  không để Promise reject không được xử lý.

## Accessibility & Mobile UX (bắt buộc theo `docs/design.md`)

- Mọi phần tử tap được: `accessibilityRole`, `accessibilityLabel` khi không có text hiển thị rõ
  (icon button), `accessibilityState` cho selected/disabled/busy.
- Touch target tối thiểu 44×44 (iOS) / 48×48dp (Android) — không thu nhỏ icon button dưới mức này;
  dùng `hitSlop` nếu vùng vẽ nhỏ hơn.
- Tôn trọng safe area (`react-native-safe-area-context`, đi kèm sẵn trong Expo template) cho mọi
  screen, không hard-code padding-top để né notch.
- Không dùng màu là tín hiệu duy nhất (success/error) — luôn kèm icon hoặc text.
- Kiểm tra hiển thị đúng ở cả light và dark mode trước khi coi là xong.

## Platform-specific code

- Logic khác biệt Android/iOS xử lý qua `Platform.select`/`Platform.OS`, hoặc file
  `.ios.tsx`/`.android.tsx` nếu khác biệt lớn — không rẽ nhánh platform rải rác trong nhiều component
  không liên quan.
- Cấu hình splash screen, app icon, quyền (camera, mic, notification...) khai báo trong
  `app.json`/`app.config.ts` (plugin Expo tương ứng), không sửa trực tiếp project native — dự án chưa
  chạy `expo prebuild` nên không có thư mục `android/`/`ios/` để sửa tay.

## Import

- Dùng alias tuyệt đối `@/...` (theo `docs/structure_system.md` mục 20), tránh `../../../..`.
- Feature khác chỉ import qua `features/<feature>/index.ts` (public entry point), không import thẳng
  file nội bộ của feature khác.

## Lint & format

- Code phải pass `npx expo lint` (ESLint `eslint-config-expo`) và Prettier (`singleQuote`,
  `trailingComma: all`, `arrowParens: avoid`) trước khi coi là xong.
- Không dùng `// eslint-disable` để né lỗi trừ khi có lý do rõ ràng kèm comment.
