# Rule â€” KhÃ´ng hard-code

## 1. MÃ u sáº¯c, spacing, radius, typography, shadow

Design tokens náº±m á»Ÿ `src/theme/` (`colors.ts`, `spacing.ts`, `typography.ts`, `radius.ts`, `shadows.ts`, `index.ts`), giÃ¡ trá»‹ chuáº©n theo `docs/design.md` (má»¥c 4, 6, 7, 8, 9, 58).

```tsx
// Sai
<View style={{ backgroundColor: '#22A447', padding: 16, borderRadius: 12 }} />
<Text style={{ color: '#183022', fontSize: 18, fontWeight: '600' }} />

// ÄÃºng (NativeWind + token, hoáº·c StyleSheet dÃ¹ng theme)
<View className="bg-primary p-4 rounded-md" />
<AppText variant="h3">...</AppText>
```

- KhÃ´ng táº¡o mÃ u/spacing/radius má»›i cho riÃªng má»™t mÃ n hÃ¬nh náº¿u token tÆ°Æ¡ng á»©ng Ä‘Ã£ tá»“n táº¡i trong `docs/design.md`.
- Náº¿u NativeWind config chÆ°a cÃ³ token cáº§n dÃ¹ng, thÃªm vÃ o `theme/` + Tailwind config má»™t láº§n, khÃ´ng patch giÃ¡ trá»‹ sá»‘ trá»±c tiáº¿p táº¡i nÆ¡i dÃ¹ng.
- Spacing chá»‰ dÃ¹ng theo há»‡ 4px Ä‘Ã£ Ä‘á»‹nh nghÄ©a (4/8/12/16/20/24/32/40), khÃ´ng dÃ¹ng sá»‘ tuá»³ Ã½ (13, 17, 19, 27...).

## 2. Cáº¥u hÃ¬nh mÃ´i trÆ°á»ng & API

```
src/config/
â”œâ”€â”€ env.ts   â† Ä‘á»c tá»« biáº¿n mÃ´i trÆ°á»ng (.env), KHÃ”NG default cá»©ng URL production
â”œâ”€â”€ api.ts   â† base URL, timeout, version â€” Ä‘á»c tá»« env.ts
â””â”€â”€ app.ts
```

```ts
// Sai
const BASE_URL = 'https://api.smartmeal.com/v1';
axios.get('https://api.smartmeal.com/v1/meals');

// ÄÃºng
import { apiConfig } from '@/config/api';
apiClient.get(apiConfig.endpoints.meals);
```

KhÃ´ng hard-code URL API ráº£i rÃ¡c trong service/screen â€” luÃ´n qua `src/services/api/client.ts` + `endpoints.ts`.

## 3. Secret / API key

KhÃ´ng bao giá» Ä‘áº·t AI API key (Gemini...), token bÃ­ máº­t, hoáº·c credential trong code React Native â€” mobile khÃ´ng giá»¯ secret AI (xem `docs/tech_stack.md` má»¥c 22, `docs/structure_system.md` má»¥c 25).

```ts
// Tuyá»‡t Ä‘á»‘i khÃ´ng lÃ m
const GEMINI_API_KEY = 'AIza...';
```

AI luÃ´n gá»i qua `SmartMeal API` (backend), khÃ´ng gá»i tháº³ng Gemini/LLM tá»« mobile.

## 4. Route / navigation key

```
src/constants/routes.ts
```

```tsx
// Sai
navigation.navigate('MealDetailScreen');

// ÄÃºng
navigation.navigate(ROUTES.MEAL_DETAIL);
```

## 5. Chuá»—i & háº±ng sá»‘ nghiá»‡p vá»¥

- GiÃ¡ trá»‹ cá»‘ Ä‘á»‹nh cÃ³ Ã½ nghÄ©a há»‡ thá»‘ng/nghiá»‡p vá»¥ (loáº¡i bá»¯a Äƒn, activity factor, ngÆ°á»¡ng cáº£nh bÃ¡o...) Ä‘áº·t trong `src/constants/` (`nutrition.ts`, `meals.ts`...), khÃ´ng láº·p láº¡i literal á»Ÿ nhiá»u file.
- CÃ´ng thá»©c tÃ­nh (BMI/BMR/TDEE/macro) chá»‰ Ä‘Æ°á»£c Ä‘á»‹nh nghÄ©a **má»™t láº§n** trong `src/utils/` hoáº·c feature `health`, khÃ´ng copy cÃ´ng thá»©c sang file khÃ¡c (trÃ¡nh lá»‡ch cÃ´ng thá»©c giá»¯a cÃ¡c mÃ n hÃ¬nh â€” vi pháº¡m BR-022 trong `business_rule.md`).
- KhÃ´ng hard-code dá»¯ liá»‡u Ä‘á»™ng láº½ ra pháº£i Ä‘áº¿n tá»« Backend (danh sÃ¡ch mÃ³n Äƒn, giÃ¡ nguyÃªn liá»‡u...) vÃ o `constants/` â€” constants chá»‰ chá»©a giÃ¡ trá»‹ tÄ©nh cá»§a há»‡ thá»‘ng.

## 6. Mock data (giai Ä‘oáº¡n `feat/mock-ui`)

Mock data Ä‘Æ°á»£c phÃ©p tá»“n táº¡i táº¡m thá»i nhÆ°ng pháº£i cÃ´ láº­p trong file/folder mock riÃªng (xem `CLAUDE.md` má»¥c 8), khÃ´ng hard-code trá»±c tiáº¿p trong JSX cá»§a Screen/component dÃ¹ng chung.

## 7. Checklist nhanh trÆ°á»›c khi commit

- [ ] KhÃ´ng cÃ³ mÃ£ mÃ u hex/rgba viáº¿t tay ngoÃ i `src/theme/`.
- [ ] KhÃ´ng cÃ³ sá»‘ spacing/radius viáº¿t tay ngoÃ i há»‡ 4px/token.
- [ ] KhÃ´ng cÃ³ URL, base path API viáº¿t tay ngoÃ i `src/config/`.
- [ ] KhÃ´ng cÃ³ API key/secret/token trong source.
- [ ] KhÃ´ng cÃ³ route string viáº¿t tay ngoÃ i `src/constants/routes.ts`.
