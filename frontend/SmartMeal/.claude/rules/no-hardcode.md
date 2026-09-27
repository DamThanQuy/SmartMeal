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
  chỉ