# SmartMeal Google Sign-In — Handoff Doc

> Ngày: 2026-10-14 · Chủ: QuyDT · Workspace: `d:\STUDY\KY8\PRM\SmartMeal`

## 1. Tóm tắt trạng thái
- ✅ Google Sign-In Web (Expo Web) implement xong, TypeScript clean.
- ✅ GCP project + OAuth client + consent screen + Identity Toolkit API setup xong.
- ✅ Test user `damthanchiem@gmail.com` đã add (testing mode).
- ⚠️ Chưa validate end-to-end được trong VS Code integrated browser (Electron không hỗ trợ FedCM — limitation browser, không phải lỗi code).
- 🔴 Backend `POST /auth/google` chưa ready (chưa verify Google ID token) → FE gọi sẽ ăn `503`.

## 2. GCP / OAuth
| Hạng mục | Giá trị |
|---|---|
| Project ID | `zinc-night-511604-v9` (display name: My Project 90612) |
| Owner | `damthanchiem@gmail.com` (Đàm Quý) |
| OAuth Client (Web) | `1068113041699-f61fqs1k30psv5mh6aptdtpilin8ph44.apps.googleusercontent.com` |
| Client Secret | **Đã loại bỏ khỏi tài liệu — nếu giá trị trước đây là thật, cần thu hồi/rotate trong Google Cloud Console.** |
| Authorized JavaScript origin | `http://localhost:8082` |
| Audience | External |
| Publishing status | **Testing** — chỉ test user mới sign-in được |
| Test users | `damthanchiem@gmail.com` (1/100) |
| Identity Toolkit API | ✅ Đã enable |

> Khi app sẵn sàng publish: chuyển Publishing status sang `In production` ở GCP, hoặc giữ Testing và thêm user test.

## 3. Frontend (code)
Thư mục gốc: `SmartMeal/frontend/SmartMealMobile`

| File | Trách nhiệm |
|---|---|
| `.env` | `EXPO_PUBLIC_GOOGLE_CLIENT_ID=1068113041699-...` (EXPO_PUBLIC_ prefix → Metro inline) |
| `.env.example` | placeholder hướng dẫn |
| `src/features/auth/services/googleSignIn.ts` | GSI wrapper: `getGoogleIdToken()`, `renderGoogleButton()`. Load `https://accounts.google.com/gsi/client` một lần. Reject trên native. |
| `src/features/auth/hooks/useGoogleLogin.ts` | `useGoogleLogin({ onSuccess })` → `{ isPrompting, start, isLoading, error, result }`. `start()` gọi `getGoogleIdToken` rồi `authService.loginWithGoogle({ idToken })`. |
| `src/features/auth/screens/WelcomeScreen.tsx` | Nút "Tiếp tục với Google" + loading/error |
| `src/features/auth/screens/LoginScreen.tsx` | Nút Google + `handleSessionOpen` (login / pendingUser + reset tới HEALTH_PROFILE_BASIC_INFO) |
| `src/features/auth/screens/RegisterScreen.tsx` | Nút "Đăng ký với Google" |
| `src/features/auth/services/authService.api.ts` | `loginWithGoogle` → `POST /auth/google` (real API, không mock) |
| `start-metro.bat` | Tiện ích chạy Metro từ đúng thư mục (không cần) |

**Luồng sign-in:**
```
Nút Google → getGoogleIdToken() (GSI prompt) → ID token
→ authService.loginWithGoogle({ idToken }) → POST /auth/google
→ backend verify token (Google.Identity) → trả user + tokens
→ openSession(user) → handleSessionOpen:
   - needsSurvey=false → login(user) → vào app
   - needsSurvey=true  → setPendingUser + reset tới HEALTH_PROFILE_BASIC_INFO
```

## 4. Backend (chưa làm — task tiếp theo)
`SmartMeal/backend/SmartMeal.API`
- Chưa có endpoint `POST /auth/google` xử lý Google ID token thật.
- FE hiện `EXPO_PUBLIC_USE_MOCK_API=false` → gọi real API. Khi BE chưa hỗ trợ, response `503` đúng API contract.
- Task BE:
  1. Thêm controller/route `POST /api/auth/google` nhận `{ idToken }`.
  2. Verify token với Google (Google.Identity / token endpoint).
  3. Upsert user + trả `{ user, tokens }`.
  4. Xử lý 401 (token bad) và 409 (email trùng với tài khoản email/password tồn tại).

## 5. Chạy & validate
1. **Backend** (nếu chạy dev): `dotnet run` trong `SmartMeal/backend/SmartMeal.API` (port theo config).
2. **Frontend**:
   ```
   cd SmartMeal/frontend/SmartMealMobile
   npx expo start --web --port 8082
   ```
   > Mẹo: nếu terminal reset cwd, dùng `pushd "d:\STUDY\KY8\PRM\SmartMeal\frontend\SmartMealMobile"; npx expo start --clear --web --port 8082`.
3. **Test GSI**: mở `http://localhost:8082` trong **Chrome/Edge** (không phải browser embedded) → click "Tiếp tục với Google" → chọn `damthanchiem@gmail.com`.
4. Kiểm tra `EXPO_PUBLIC_GOOGLE_CLIENT_ID` inlined: console browser xem có GSI request `accounts.google.com/gsi/...` không.

## 6. Known limitations / gotchas
- **FedCM**: GSI flow mặc định cần trình duyệt hỗ trợ FedCM (Chrome/Edge desktop). Firefox/Safari và Electron (VS Code browser) → 403.
- **Testing mode**: chỉ test user mới sign-in được. Muốn public → publish app ở GCP.
- **CORS / origin**: origin phải khớp Authorized JavaScript origin (`http://localhost:8082`). Đổi port FE phải cập nhật lại ở GCP.
- **Native (Android/iOS)**: chưa support — cần `expo-auth-session` + Dev Client (xem task native, ngoài scope lần này).

## 7. Checklist handoff cho người nhận
- [ ] Đọc mục 2–4, hiểu config GCP + luồng FE.
- [ ] Implement backend `POST /auth/google` (mục 4).
- [ ] Chạy full: BE + FE, test GSI ở Chrome/Edge với `damthanchiem@gmail.com`.
- [ ] Kiểm tra session: sau login có user + tokens, redirect đúng (survey hay app).
- [ ] Xử lý edge case: email trùng (409), token sai (401).
- [ ] (Tuỳ chọn) Publish GCP app hoặc giữ testing mode.

## 8. Tài liệu liên quan
- `docs/SmartMeal_GoogleSignIn_Tasks.md` (nếu có) — task breakdown.
- `SmartMeal_API_Contract.md` — contract API auth.
- Không lưu credentials trong memory/tài liệu bàn giao; quản lý secret qua secret manager hoặc cấu hình local không commit.
