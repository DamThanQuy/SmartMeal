# CLAUDE.md â€” SmartMeal Mobile (React Native + TypeScript)

HÆ°á»›ng dáº«n nÃ y Ã¡p dá»¥ng cho toÃ n bá»™ code trong `frontend/SmartMeal/`. Äá»c file nÃ y trÆ°á»›c khi implement báº¥t ká»³ mÃ n hÃ¬nh, component hay logic nÃ o.

## 1. Dá»± Ã¡n lÃ  gÃ¬

SmartMeal lÃ  mobile app (React Native + TypeScript) vá» dinh dÆ°á»¡ng, AI meal logging, sá»©c khá»e, meal planning vÃ  gamification. Backend lÃ  ASP.NET Core .NET 8 + PostgreSQL â€” mobile **khÃ´ng** bao giá» gá»i trá»±c tiáº¿p database hoáº·c AI provider.

NhÃ¡nh hiá»‡n táº¡i `feat/mock-ui` Ä‘ang dá»±ng UI báº±ng dá»¯ liá»‡u giáº£ láº­p trÆ°á»›c khi ná»‘i API tháº­t â€” xem má»¥c 8 (Mock data) Ä‘á»ƒ biáº¿t cÃ¡ch lÃ m Ä‘Ãºng.

## 2. TÃ i liá»‡u nguá»“n (Source of Truth) â€” báº¯t buá»™c Ä‘á»c trÆ°á»›c khi code

| Thá»© tá»± | TÃ i liá»‡u | Ná»™i dung |
|---|---|---|
| 1 | `docs/business_rule.md` | Nghiá»‡p vá»¥: auth, health profile, nutrition, AI, premium... |
| 2 | `docs/design.md` | Design system, mÃ u, spacing, typography, UI/UX rules |
| 3 | `docs/structure_system.md` | Kiáº¿n trÃºc thÆ° má»¥c, feature-based structure, layering |
| 4 | `docs/tech_stack.md` | CÃ´ng nghá»‡ dÃ¹ng cho tá»«ng pháº§n, Definition of Done |

Quy trÃ¬nh báº¯t buá»™c khi implement 1 feature:

```
business_rule.md â†’ design.md â†’ structure_system.md â†’ tech_stack.md â†’ implementation
```

KhÃ´ng tá»± Ã½ thay Ä‘á»•i nghiá»‡p vá»¥ hoáº·c design Ä‘á»ƒ "code cho dá»…". Náº¿u tÃ i liá»‡u thiáº¿u hoáº·c mÃ¢u thuáº«n vá»›i yÃªu cáº§u, há»i láº¡i thay vÃ¬ tá»± suy diá»…n.

## 3. Tech stack chÃ­nh

React Native Â· TypeScript Â· NativeWind (styling) Â· React Navigation Â· TanStack Query (server state) Â· Zustand (client state) Â· Axios Â· React Hook Form + Zod Â· Reanimated + Gesture Handler Â· MMKV (storage) Â· React Native Keychain (secure storage) Â· Vision Camera + ML Kit (camera/OCR/barcode) Â· Notifee Â· react-native-gifted-charts Â· date-fns Â· Lucide React Native (icons).

KhÃ´ng tá»± Ã½ thÃªm Redux, MobX, Apollo/GraphQL, Firebase, UI framework lá»›n, hoáº·c Expo náº¿u khÃ´ng cÃ³ yÃªu cáº§u rÃµ rÃ ng. TrÆ°á»›c khi thÃªm package má»›i: kiá»ƒm tra Ä‘Ã£ cÃ³ package tÆ°Æ¡ng Ä‘Æ°Æ¡ng chÆ°a, cÃ³ tÆ°Æ¡ng thÃ­ch RN/Android/iOS khÃ´ng, cÃ³ cáº§n native setup khÃ´ng.

## 4. Kiáº¿n trÃºc & luá»“ng phá»¥ thuá»™c

```
Screen â†’ Hook â†’ Feature Service â†’ API Client / Native Service â†’ Backend / Native API
```

- Screen chá»‰ render UI, gá»i hook, xá»­ lÃ½ navigation vÃ  loading/error/empty. KhÃ´ng chá»©a business logic phá»©c táº¡p, khÃ´ng gá»i Axios trá»±c tiáº¿p.
- Business logic thuá»™c vá» feature service tÆ°Æ¡ng á»©ng (`features/<feature>/services/`).
- Server state luÃ´n qua TanStack Query. Client/global state (auth, theme, preferences) qua Zustand â€” khÃ´ng dá»“n toÃ n bá»™ server data vÃ o Zustand.
- Chi tiáº¿t Ä‘áº§y Ä‘á»§: `@.claude/rules/architecture.md`.

## 5. Cáº¥u trÃºc thÆ° má»¥c má»¥c tiÃªu

```
src/
â”œâ”€â”€ assets/
â”œâ”€â”€ components/{ui,common}/
â”œâ”€â”€ config/
â”œâ”€â”€ constants/
â”œâ”€â”€ features/<feature>/{components,hooks,screens,services,types,index.ts}
â”œâ”€â”€ hooks/
â”œâ”€â”€ navigation/
â”œâ”€â”€ services/{api,storage,permissions,notifications,analytics}
â”œâ”€â”€ state/{auth,app}
â”œâ”€â”€ theme/
â”œâ”€â”€ types/
â””â”€â”€ utils/
```

`src/` chÆ°a tá»“n táº¡i â€” táº¡o dáº§n theo nhu cáº§u feature, khÃ´ng táº¡o sáºµn toÃ n bá»™ khi chÆ°a cáº§n. TrÆ°á»›c khi táº¡o file má»›i: kiá»ƒm tra `components/ui` â†’ `components/common` â†’ feature hiá»‡n táº¡i â†’ `services`/`utils`. NguyÃªn táº¯c: **Reuse > Extend > Create new**.

## 6. Bá»‘n nguyÃªn táº¯c báº¯t buá»™c (khÃ´ng Ä‘Æ°á»£c vi pháº¡m)

1. **UI Ä‘á»“ng bá»™ qua shared component** â€” luÃ´n táº­n dá»¥ng `components/ui` (AppButton, AppCard, AppInput, AppText, AppChip, AppIconButton, AppBottomSheet) vÃ  `components/common` (EmptyState, ErrorState, LoadingState, ScreenContainer, SectionHeader) trÆ°á»›c khi viáº¿t UI má»›i. Chi tiáº¿t: `@.claude/rules/component-reuse.md`.
2. **KhÃ´ng hard-code** â€” mÃ u/spacing/radius/font pháº£i láº¥y tá»« `src/theme`, API base URL tá»« `src/config`, route name tá»« `src/constants/routes.ts`, khÃ´ng hard-code secret/API key. Chi tiáº¿t: `@.claude/rules/no-hardcode.md`.
3. **TypeScript/TSX chuáº©n mobile** â€” strict types, khÃ´ng dÃ¹ng `any`, props qua interface, tá»‘i Æ°u re-render, accessibility, safe area. Chi tiáº¿t: `@.claude/rules/typescript-mobile.md`.
4. **State & API Ä‘Ãºng layer** â€” TanStack Query / Zustand / Axios / RHF+Zod Ä‘Ãºng vai trÃ², khÃ´ng gá»i API trá»±c tiáº¿p trong component. Chi tiáº¿t: `@.claude/rules/state-and-api.md`.

## 7. CÃ´ng cá»¥ há»— trá»£ trong `.claude/`

- **Skill** `smartmeal-dev-workflow` â€” quy trÃ¬nh Ä‘áº§y Ä‘á»§ khi thÃªm feature/screen má»›i (Ä‘á»c docs â†’ check reuse â†’ implement â†’ checklist). Gá»i báº±ng `/smartmeal-dev-workflow`.
- **Commands**:
  - `/new-feature <tÃªn-feature>` â€” scaffold Ä‘Ãºng cáº¥u trÃºc `features/<feature>/`.
  - `/new-component <tÃªn>` â€” táº¡o component má»›i sau khi Ä‘Ã£ kiá»ƒm tra reuse, Ä‘áº·t Ä‘Ãºng layer (ui/common/feature).
  - `/check-reuse` â€” rÃ  soÃ¡t diff hiá»‡n táº¡i tÃ¬m component trÃ¹ng láº·p vÃ  style hard-code.
  - `/ui-review` â€” review diff so vá»›i `docs/design.md` + rules (loading/error/empty state, token, touch target...).
- **Agents**:
  - `rn-component-builder` â€” xÃ¢y/má»Ÿ rá»™ng shared component Ä‘Ãºng design system, khÃ´ng hard-code.
  - `rn-feature-scaffolder` â€” dá»±ng khung 1 feature má»›i theo `structure_system.md`.
  - `ui-consistency-reviewer` â€” review-only, tÃ¬m vi pháº¡m reuse/hard-code/layering, khÃ´ng tá»± sá»­a code.

## 8. Mock data (nhÃ¡nh `feat/mock-ui`)

Khi chÆ°a ná»‘i API tháº­t:

- Mock data Ä‘áº·t trong `__mocks__/` hoáº·c `src/features/<feature>/mocks/`, khÃ´ng trá»™n vÃ o component/hook tháº­t.
- Shape cá»§a mock data pháº£i khá»›p vá»›i `docs/SmartMeal_API_Contract.md` (root `docs/`) Ä‘á»ƒ khi ná»‘i API tháº­t chá»‰ cáº§n thay implementation cá»§a service, khÃ´ng sá»­a UI.
- Hook/service váº«n pháº£i Ä‘i qua Ä‘Ãºng layer (`useX()` â†’ `xService.getX()`), chá»‰ khÃ¡c lÃ  `xService` táº¡m thá»i tráº£ mock thay vÃ¬ gá»i Axios. ÄÃ¡nh dáº¥u rÃµ báº±ng comment `// TODO: replace mock with real API` táº¡i Ä‘Ãºng 1 chá»— (service), khÃ´ng ráº£i rÃ¡c nhiá»u nÆ¡i.
- KhÃ´ng hard-code mock data trá»±c tiáº¿p trong Screen/UI component.

## 9. Definition of Done (trÆ°á»›c khi coi 1 feature/PR lÃ  xong)

- ÄÃºng `business_rule.md`, Ä‘Ãºng `design.md`, Ä‘Ãºng cáº¥u trÃºc thÆ° má»¥c.
- KhÃ´ng táº¡o component/service trÃ¹ng láº·p; khÃ´ng gá»i API trá»±c tiáº¿p tá»« UI; khÃ´ng hard-code URL/secret/mÃ u/spacing.
- CÃ³ loading / error / empty state khi mÃ n hÃ¬nh cÃ³ dá»¯ liá»‡u báº¥t Ä‘á»“ng bá»™.
- TypeScript khÃ´ng lá»—i, khÃ´ng dÃ¹ng `any` khÃ´ng cáº§n thiáº¿t.
- KhÃ´ng cÃ³ import path quÃ¡ sÃ¢u (`../../../..`), dÃ¹ng alias `@/`.
- ÄÃ£ test logic quan trá»ng (BMI/BMR/TDEE, validation, macro calculation...).

Chi tiáº¿t Ä‘áº§y Ä‘á»§: `docs/tech_stack.md` má»¥c 34, `docs/structure_system.md` má»¥c 34.
