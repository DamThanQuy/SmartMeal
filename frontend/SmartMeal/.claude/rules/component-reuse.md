# Rule â€” Reuse-first UI (Ä‘á»“ng bá»™ component)

Má»¥c tiÃªu: má»i mÃ n hÃ¬nh trÃ´ng vÃ  hoáº¡t Ä‘á»™ng nháº¥t quÃ¡n vÃ¬ dÃ¹ng chung má»™t bá»™ component, khÃ´ng pháº£i vÃ¬ "style giá»‘ng nhau do copy-paste".

## Thá»© tá»± báº¯t buá»™c kiá»ƒm tra trÆ°á»›c khi viáº¿t UI má»›i

1. `src/components/ui/` â€” UI primitive dÃ¹ng chung toÃ n app.
2. `src/components/common/` â€” component chung cÃ³ logic hiá»ƒn thá»‹ cao hÆ¡n primitive (loading/empty/error/screen wrapper).
3. `src/features/<feature-hiá»‡n-táº¡i>/components/` â€” component Ä‘áº·c thÃ¹ Ä‘Ã£ cÃ³ trong feature Ä‘ang lÃ m.
4. Chá»‰ khi khÃ´ng cÃ³ gÃ¬ phÃ¹ há»£p â†’ táº¡o má»›i, vÃ  táº¡o Ä‘Ãºng layer (xem má»¥c "Äáº·t component á»Ÿ Ä‘Ã¢u" bÃªn dÆ°á»›i).

NguyÃªn táº¯c: **Reuse > Extend (thÃªm prop/variant) > Create new**. KhÃ´ng bao giá» copy má»™t component cÃ³ sáºµn rá»“i Ä‘á»•i tÃªn Ä‘á»ƒ chá»‰nh style riÃªng.

## `components/ui/` â€” UI primitive

Chá»©a: `AppButton`, `AppCard`, `AppInput`, `AppText`, `AppChip`, `AppIconButton`, `AppBottomSheet`.

RÃ ng buá»™c báº¯t buá»™c vá»›i má»i component trong `ui/`:

- KhÃ´ng gá»i API, khÃ´ng chá»©a business logic.
- KhÃ´ng phá»¥ thuá»™c má»™t feature cá»¥ thá»ƒ (khÃ´ng import gÃ¬ tá»« `features/*`).
- Nháº­n toÃ n bá»™ dá»¯ liá»‡u/hÃ nh vi qua props, khÃ´ng tá»± fetch, khÃ´ng tá»± biáº¿t "Ä‘ang á»Ÿ mÃ n hÃ¬nh nÃ o".
- Biáº¿n thá»ƒ (variant, size, state) pháº£i xá»­ lÃ½ báº±ng prop (`variant="primary" | "secondary" | "outline"`), khÃ´ng táº¡o file má»›i cho má»—i biáº¿n thá»ƒ (khÃ´ng táº¡o `PrimaryButton.tsx`, `GreenButton.tsx`...).

## `components/common/` â€” generic component cÃ³ logic hiá»ƒn thá»‹

Chá»©a: `EmptyState`, `ErrorState`, `LoadingState`, `ScreenContainer`, `SectionHeader`.

Má»i screen cÃ³ dá»¯ liá»‡u báº¥t Ä‘á»“ng bá»™ (gá»i API/AI) pháº£i dÃ¹ng `LoadingState` / `ErrorState` / `EmptyState` tá»« Ä‘Ã¢y thay vÃ¬ tá»± viáº¿t loading/error UI riÃªng trong tá»«ng screen.

## Component Ä‘áº·c thÃ¹ nghiá»‡p vá»¥

Äáº·t trong `src/features/<feature>/components/`, vÃ­ dá»¥ `MealCard` â†’ `features/nutrition/components/`, `RecipeCard` â†’ `features/recipes/components/`. Component nÃ y Ä‘Æ°á»£c build **tá»«** cÃ¡c primitive trong `components/ui` (vÃ­ dá»¥ `MealCard` dÃ¹ng `AppCard` + `AppText` bÃªn trong), khÃ´ng viáº¿t láº¡i `View`/`Text` thÃ´ náº¿u primitive tÆ°Æ¡ng á»©ng Ä‘Ã£ tá»“n táº¡i.

## Naming

Theo chá»©c nÄƒng, khÃ´ng theo hÃ¬nh thá»©c hoáº·c theo screen:

```
ÄÃºng: AppButton, AppCard, NutritionCard, MealCard, RecipeCard, PetCard
Sai:  GreenButton1, DashboardButton, SpecialCard, CustomCard2, NewGreenButton
```

## Card system

Chá»‰ cÃ³ cÃ¡c loáº¡i card sau, táº¥t cáº£ build trÃªn cÃ¹ng `AppCard` (cÃ¹ng radius/shadow/padding/typography â€” xem `docs/design.md` má»¥c 42):

```
Standard Card, Nutrition Card, Recipe Card, Meal Card, Pet Card, Alert Card
```

KhÃ´ng táº¡o card má»›i náº¿u má»™t trong cÃ¡c loáº¡i trÃªn cÃ³ thá»ƒ má»Ÿ rá»™ng báº±ng prop/slot Ä‘á»ƒ dÃ¹ng láº¡i.

## TrÆ°á»›c khi táº¡o file component má»›i, tá»± há»i

1. Component tÆ°Æ¡ng tá»± Ä‘Ã£ tá»“n táº¡i á»Ÿ `ui/`, `common/`, hoáº·c feature khÃ¡c chÆ°a? (grep theo tÃªn/chá»©c nÄƒng, khÃ´ng chá»‰ theo tÃªn file).
2. CÃ³ thá»ƒ thÃªm prop/variant vÃ o component cÃ³ sáºµn Ä‘á»ƒ Ä‘Ã¡p á»©ng use-case má»›i khÃ´ng?
3. Náº¿u báº¯t buá»™c táº¡o má»›i: nÃ³ thuá»™c `ui/` (khÃ´ng business logic, generic) hay thuá»™c feature (gáº¯n vá»›i nghiá»‡p vá»¥)?

Náº¿u khÃ´ng cháº¯c, dÃ¹ng agent `ui-consistency-reviewer` hoáº·c command `/check-reuse` Ä‘á»ƒ rÃ  soÃ¡t trÆ°á»›c khi merge.
