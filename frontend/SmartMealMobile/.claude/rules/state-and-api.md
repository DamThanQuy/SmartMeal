# Rule — State Management, API, Forms

## Server state → TanStack Query

Dùng cho mọi dữ liệu đến từ Backend: user data, nutrition diary, recipes, meal planner, grocery, food database, AI results, notifications.

```
Screen → useMeals() (hook, TanStack Query) → mealService.getMeals() → apiClient.get()
```

- Query key đặt tên rõ ràng, nhất quán (`['meals', date]`), tránh key trùng ý nghĩa khác nhau.
- Mutation (create/update/delete) phải invalidate đúng query liên quan, không tự bắn `refetch` thủ công
  rải rác.
- Không đưa toàn bộ server data vào Zustand "cho chắc".

## Client state → Zustand

Dùng cho: authentication status, user preferences, theme, language, temporary UI state, app-level settings.

```
src/state/
├── auth/authStore.ts
└── app/appStore.ts
```

Store đặt tên `somethingStore.ts`. Không dùng Zustand để cache toàn bộ dữ liệu server.

## HTTP → Axios (luôn qua API client chung)

```
src/services/api/
├── client.ts         # instance Axios + base config
├── interceptors.ts   # token, unauthorized, lỗi HTTP dùng chung
└── endpoints.ts      # danh sách endpoint, không hard-code string URL nơi khác
```

Không bao giờ import `axios` trực tiếp trong Screen/component. Feature service gọi `apiClient`, không tự
tạo instance Axios riêng.

## Storage

```
src/services/storage/
├── storage.ts        # AsyncStorage — preference, theme, language, onboarding, cache không nhạy cảm
└── secureStorage.ts  # expo-secure-store — access token, refresh token, credential nhạy cảm
```

Access/refresh token luôn qua `secureStorage.ts` (`expo-secure-store`), không lưu trong `AsyncStorage`/
plain storage/Zustand persist thường. Không dùng `react-native-mmkv` hay `react-native-keychain` — hai
package này yêu cầu native linking thủ công, không chạy trên Expo Go (xem `docs/structure_system.md`
§2, §11).

## Forms → React Hook Form + Zod

```ts
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});
```

Mọi form (login, register, profile, health profile, food input, meal planner, grocery, premium) dùng
React Hook Form để quản lý field state + Zod để validate schema. Không tự viết validate thủ công bằng
chuỗi `if` lặp lại khi Zod schema có thể xử lý.

## AI

```
React Native (Expo) → SmartMeal API (backend) → AI Service → Gemini/LLM
```

Mobile không bao giờ gọi thẳng Gemini/LLM bằng API key riêng. AI feature đặt trong `features/ai/` với
`components/`, `hooks/`, `services/`, `types/` riêng. AI service gửi ảnh/âm thanh/văn bản lên backend,
không bao giờ trả kết quả giả lập.

Kết quả AI luôn phải:
- Đi qua flow `AI Analysis → User Review → User Confirm → Save` (không tự động lưu — BR-054).
- Hiển thị rõ nhãn "Ước tính/Estimated" (≈), không trình bày như số liệu chính xác tuyệt đối (BR-061).
- Cho phép user chỉnh sửa/xóa/thêm trước khi lưu (BR-062).

## Offline

- Local cache (`AsyncStorage`) chỉ dùng cho preference, dữ liệu gần đây (recent meals/recipes), không
  thay thế Backend làm source of truth (BR-260).
- Khi mất mạng, dùng `NetInfo` để hiển thị offline state; thay đổi khi offline đưa vào sync queue, đẩy
  lên Backend khi có mạng lại (BR-261). Màn Dev có công tắc ép "offline" để kiểm tra luồng này.

## Error/Loading/Empty (bắt buộc với mọi màn hình có dữ liệu bất đồng bộ)

Mỗi màn hình dữ liệu tối thiểu phải xử lý 4 trạng thái: `Loading`, `Success`, `Empty`, `Error` — dùng
`LoadingState`/`EmptyState`/`ErrorState` từ `components/common` (xem `@.claude/rules/component-reuse.md`).
Kiểm tra trạng thái Empty bằng tài khoản mới (chưa có dữ liệu), Error bằng cách tắt backend. Không để màn
hình trắng khi API lỗi hoặc đang tải.
