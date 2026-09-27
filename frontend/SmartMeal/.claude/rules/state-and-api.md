# Rule â€” State Management, API, Forms

## Server state â†’ TanStack Query

DÃ¹ng cho má»i dá»¯ liá»‡u Ä‘áº¿n tá»« Backend: user data, nutrition diary, recipes, meal planner, grocery, food database, AI results, notifications.

```
Screen â†’ useMeals() (hook, TanStack Query) â†’ mealService.getMeals() â†’ apiClient.get()
```

- Query key Ä‘áº·t tÃªn rÃµ rÃ ng, nháº¥t quÃ¡n (`['meals', date]`), trÃ¡nh key trÃ¹ng Ã½ nghÄ©a khÃ¡c nhau.
- Mutation (create/update/delete) pháº£i invalidate Ä‘Ãºng query liÃªn quan, khÃ´ng tá»± báº¯n `refetch` thá»§ cÃ´ng ráº£i rÃ¡c.
- KhÃ´ng Ä‘Æ°a toÃ n bá»™ server data vÃ o Zustand "cho cháº¯c".

## Client state â†’ Zustand

DÃ¹ng cho: authentication status, user preferences, theme, language, temporary UI state, app-level settings.

```
src/state/
â”œâ”€â”€ auth/authStore.ts
â””â”€â”€ app/appStore.ts
```

Store Ä‘áº·t tÃªn `somethingStore.ts`. KhÃ´ng dÃ¹ng Zustand Ä‘á»ƒ cache toÃ n bá»™ dá»¯ liá»‡u server.

## HTTP â†’ Axios (luÃ´n qua API client chung)

```
src/services/api/
â”œâ”€â”€ client.ts         # instance Axios + base config
â”œâ”€â”€ interceptors.ts   # token, unauthorized, lá»—i HTTP dÃ¹ng chung
â””â”€â”€ endpoints.ts       # danh sÃ¡ch endpoint, khÃ´ng hard-code string URL nÆ¡i khÃ¡c
```

KhÃ´ng bao giá» import `axios` trá»±c tiáº¿p trong Screen/component. Feature service gá»i `apiClient`, khÃ´ng tá»± táº¡o instance Axios riÃªng.

## Storage

```
src/services/storage/
â”œâ”€â”€ storage.ts        # MMKV â€” preference, theme, language, onboarding, cache khÃ´ng nháº¡y cáº£m
â””â”€â”€ secureStorage.ts  # Keychain â€” access token, refresh token, credential nháº¡y cáº£m
```

Access/refresh token luÃ´n qua `secureStorage.ts`, khÃ´ng lÆ°u trong MMKV/plain storage/Zustand persist thÆ°á»ng.

## Forms â†’ React Hook Form + Zod

```ts
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});
```

Má»i form (login, register, profile, health profile, food input, meal planner, grocery, premium) dÃ¹ng React Hook Form Ä‘á»ƒ quáº£n lÃ½ field state + Zod Ä‘á»ƒ validate schema. KhÃ´ng tá»± viáº¿t validate thá»§ cÃ´ng báº±ng chuá»—i `if` láº·p láº¡i khi Zod schema cÃ³ thá»ƒ xá»­ lÃ½.

## AI

```
React Native â†’ SmartMeal API (backend) â†’ AI Service â†’ Gemini/LLM
```

Mobile khÃ´ng bao giá» gá»i tháº³ng Gemini/LLM báº±ng API key riÃªng. AI feature Ä‘áº·t trong `features/ai/` vá»›i `components/`, `hooks/`, `services/`, `types/` riÃªng.

Káº¿t quáº£ AI luÃ´n pháº£i:
- Äi qua flow `AI Analysis â†’ User Review â†’ User Confirm â†’ Save` (khÃ´ng tá»± Ä‘á»™ng lÆ°u â€” BR-054).
- Hiá»ƒn thá»‹ rÃµ nhÃ£n "Æ¯á»›c tÃ­nh/Estimated", khÃ´ng trÃ¬nh bÃ y nhÆ° sá»‘ liá»‡u chÃ­nh xÃ¡c tuyá»‡t Ä‘á»‘i (BR-061).

## Offline

- Local cache (MMKV) chá»‰ dÃ¹ng cho preference, dá»¯ liá»‡u gáº§n Ä‘Ã¢y (recent meals/recipes), khÃ´ng thay tháº¿ Backend lÃ m source of truth (BR-260).
- Khi máº¥t máº¡ng, dÃ¹ng `NetInfo` Ä‘á»ƒ hiá»ƒn thá»‹ offline state; thay Ä‘á»•i khi offline Ä‘Æ°a vÃ o sync queue, Ä‘áº©y lÃªn Backend khi cÃ³ máº¡ng láº¡i (BR-261).

## Error/Loading/Empty (báº¯t buá»™c vá»›i má»i mÃ n hÃ¬nh cÃ³ dá»¯ liá»‡u báº¥t Ä‘á»“ng bá»™)

Má»—i mÃ n hÃ¬nh dá»¯ liá»‡u tá»‘i thiá»ƒu pháº£i xá»­ lÃ½ 4 tráº¡ng thÃ¡i: `Loading`, `Success`, `Empty`, `Error` â€” dÃ¹ng `LoadingState`/`EmptyState`/`ErrorState` tá»« `components/common` (xem `@.claude/rules/component-reuse.md`). KhÃ´ng Ä‘á»ƒ mÃ n hÃ¬nh tráº¯ng khi API lá»—i hoáº·c Ä‘ang táº£i.
