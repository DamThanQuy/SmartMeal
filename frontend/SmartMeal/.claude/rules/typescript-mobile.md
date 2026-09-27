# Rule â€” TypeScript/TSX cho React Native (mobile)

## Types

- Báº­t strict mode (káº¿ thá»«a `@react-native/typescript-config`), khÃ´ng táº¯t strict Ä‘á»ƒ nÃ© lá»—i.
- KhÃ´ng dÃ¹ng `any`. Náº¿u thá»±c sá»± chÆ°a biáº¿t shape, dÃ¹ng `unknown` + narrow, hoáº·c khai bÃ¡o type táº¡m rÃµ rÃ ng kÃ¨m `// TODO` giáº£i thÃ­ch lÃ½ do.
- Má»i props cá»§a component pháº£i cÃ³ `interface <ComponentName>Props`, Ä‘áº·t ngay trÃªn component, export náº¿u screen/hook khÃ¡c cáº§n dÃ¹ng láº¡i.
- Type dÃ¹ng chung toÃ n app â†’ `src/types/`. Type riÃªng feature â†’ `src/features/<feature>/types/`. KhÃ´ng Ä‘áº·t type dÃ¹ng chung trong 1 feature cá»¥ thá»ƒ.
- Naming file type riÃªng: `something.types.ts` (theo `docs/structure_system.md` má»¥c 19).
- Dá»¯ liá»‡u tá»« API pháº£i cÃ³ type khá»›p `docs/SmartMeal_API_Contract.md`; khÃ´ng dÃ¹ng object literal tuá»³ Ã½ rá»“i Ã©p kiá»ƒu (`as any`, `as SomeType` khi shape khÃ´ng khá»›p tháº­t).

## Component

- Function component, arrow function, named export (trá»« `App.tsx`/entry file theo yÃªu cáº§u cá»§a React Native).
- KhÃ´ng viáº¿t business logic trong component UI â€” xem `@.claude/rules/component-reuse.md` vÃ  `@.claude/rules/state-and-api.md`.
- Props destructure ngay trong signature, cÃ³ default value rÃµ rÃ ng thay vÃ¬ `??`/`||` ráº£i rÃ¡c trong thÃ¢n hÃ m.
- KhÃ´ng táº¡o component vÃ´ danh lá»“ng bÃªn trong component khÃ¡c (Ä‘á»‹nh nghÄ©a 1 component má»—i file, trá»« sub-component ná»™i bá»™ ráº¥t nhá» vÃ  khÃ´ng tÃ¡i sá»­ dá»¥ng).

## Styling (NativeWind)

- Æ¯u tiÃªn `className` (NativeWind) cho layout/spacing/color/typography/border/radius/flex.
- DÃ¹ng `StyleSheet.create` chá»‰ cho style Ä‘á»™ng/phá»©c táº¡p NativeWind chÆ°a há»— trá»£ tá»‘t (vÃ­ dá»¥ transform phá»©c táº¡p vá»›i Reanimated).
- KhÃ´ng dÃ¹ng inline style object literal láº·p láº¡i nhiá»u nÆ¡i â€” náº¿u láº·p láº¡i â‰¥ 2 chá»—, tÃ¡ch thÃ nh style/token dÃ¹ng chung.

## Performance

- `FlatList`/`FlashList`: luÃ´n cÃ³ `keyExtractor` á»•n Ä‘á»‹nh, trÃ¡nh táº¡o function/object má»›i trong `renderItem` khi danh sÃ¡ch dÃ i (Ä‘Æ°a ra ngoÃ i hoáº·c `useCallback`).
- DÃ¹ng `React.memo` cho component hiá»ƒn thá»‹ trong list láº·p láº¡i nhiá»u (`MealCard`, `RecipeCard`...) khi props á»•n Ä‘á»‹nh.
- Animation dÃ¹ng Reanimated/Gesture Handler cháº¡y trÃªn UI thread; khÃ´ng tá»± viáº¿t animation báº±ng `setInterval`/`setState` liÃªn tá»¥c náº¿u Reanimated xá»­ lÃ½ Ä‘Æ°á»£c (theo `docs/tech_stack.md` má»¥c 10).
- KhÃ´ng gá»i API trong vÃ²ng láº·p render; fetch qua hook + TanStack Query.

## Null-safety & lá»—i

- KhÃ´ng dÃ¹ng non-null assertion (`!`) Ä‘á»ƒ nÃ© lá»—i TypeScript trá»« khi cháº¯c cháº¯n 100% vÃ  cÃ³ comment giáº£i thÃ­ch invariant.
- Optional chaining (`?.`) + nullish coalescing (`??`) khi dá»¯ liá»‡u cÃ³ thá»ƒ thiáº¿u (Ä‘áº·c biá»‡t dá»¯ liá»‡u tá»« AI/estimate â€” xem business rule BR-054, BR-061).
- Má»i request async (API, native module) pháº£i cÃ³ try/catch hoáº·c Ä‘Æ°á»£c TanStack Query quáº£n lÃ½ lá»—i; khÃ´ng Ä‘á»ƒ Promise reject khÃ´ng Ä‘Æ°á»£c xá»­ lÃ½.

## Accessibility & Mobile UX (báº¯t buá»™c theo `docs/design.md`)

- Má»i pháº§n tá»­ tap Ä‘Æ°á»£c: `accessibilityRole`, `accessibilityLabel` khi khÃ´ng cÃ³ text hiá»ƒn thá»‹ rÃµ (icon button).
- Touch target tá»‘i thiá»ƒu 44Ã—44 (iOS) / 48Ã—48dp (Android) â€” khÃ´ng thu nhá» icon button dÆ°á»›i má»©c nÃ y.
- TÃ´n trá»ng safe area (`react-native-safe-area-context`) cho má»i screen, khÃ´ng hard-code padding-top Ä‘á»ƒ nÃ© notch.
- KhÃ´ng dÃ¹ng mÃ u lÃ  tÃ­n hiá»‡u duy nháº¥t (success/error) â€” luÃ´n kÃ¨m icon hoáº·c text.

## Platform-specific code

- Logic khÃ¡c biá»‡t Android/iOS xá»­ lÃ½ qua `Platform.select`/`Platform.OS`, hoáº·c file `.ios.tsx`/`.android.tsx` náº¿u khÃ¡c biá»‡t lá»›n â€” khÃ´ng ráº½ nhÃ¡nh platform ráº£i rÃ¡c trong nhiá»u component khÃ´ng liÃªn quan.

## Import

- DÃ¹ng alias tuyá»‡t Ä‘á»‘i `@/...` (theo `docs/structure_system.md` má»¥c 20), trÃ¡nh `../../../..`.
- Feature khÃ¡c chá»‰ import qua `features/<feature>/index.ts` (public entry point), khÃ´ng import tháº³ng file ná»™i bá»™ cá»§a feature khÃ¡c.

## Lint & format

- Code pháº£i pass `npm run lint` (ESLint `@react-native` config) vÃ  Prettier (`singleQuote`, `trailingComma: all`, `arrowParens: avoid`) trÆ°á»›c khi coi lÃ  xong.
- KhÃ´ng dÃ¹ng `// eslint-disable` Ä‘á»ƒ nÃ© lá»—i trá»« khi cÃ³ lÃ½ do rÃµ rÃ ng kÃ¨m comment.
