---
name: smartmeal-dev-workflow
description: Quy trÃ¬nh chuáº©n khi implement báº¥t ká»³ mÃ n hÃ¬nh/feature/component nÃ o cho SmartMeal mobile (React Native + TypeScript) â€” Ä‘á»c Ä‘Ãºng thá»© tá»± tÃ i liá»‡u nguá»“n, kiá»ƒm tra tÃ¡i sá»­ dá»¥ng component, trÃ¡nh hard-code, Ä‘áº·t code Ä‘Ãºng layer, vÃ  tá»± cháº¥m Definition of Done trÆ°á»›c khi bÃ¡o hoÃ n thÃ nh. DÃ¹ng skill nÃ y báº¥t cá»© khi nÃ o lÃ m viá»‡c trong frontend/SmartMeal, Ä‘áº·c biá»‡t khi thÃªm/sá»­a screen, component, hook hoáº·c service.
---

# SmartMeal â€” Quy trÃ¬nh phÃ¡t triá»ƒn Frontend chuáº©n

DÃ¹ng skill nÃ y cho má»i task cháº¡m vÃ o `frontend/SmartMeal/` â€” thÃªm feature, thÃªm screen, sá»­a component, thÃªm logic nghiá»‡p vá»¥.

## BÆ°á»›c 0 â€” Náº¡p context báº¯t buá»™c

Náº¿u chÆ°a cÃ³ trong context cá»§a phiÃªn lÃ m viá»‡c, Ä‘á»c:

- `frontend/SmartMeal/CLAUDE.md`
- `.claude/rules/component-reuse.md`, `.claude/rules/no-hardcode.md`, `.claude/rules/typescript-mobile.md`, `.claude/rules/architecture.md`, `.claude/rules/state-and-api.md`

## BÆ°á»›c 1 â€” Äá»c tÃ i liá»‡u nguá»“n theo Ä‘Ãºng thá»© tá»±

```
docs/business_rule.md â†’ docs/design.md â†’ docs/structure_system.md â†’ docs/tech_stack.md
```

Chá»‰ Ä‘á»c pháº§n liÃªn quan Ä‘áº¿n task, nhÆ°ng pháº£i Ä‘á»c `business_rule.md` trÆ°á»›c khi Ä‘á»™ng vÃ o báº¥t ká»³ logic tÃ­nh toÃ¡n/luá»“ng xÃ¡c nháº­n nÃ o (Ä‘áº·c biá»‡t: BMI/BMR/TDEE, AI confirmation flow, allergy/safety priority, premium gating).

Náº¿u task khÃ´ng rÃµ nghiá»‡p vá»¥ hoáº·c mÃ¢u thuáº«n vá»›i docs â†’ dá»«ng láº¡i, há»i ngÆ°á»i dÃ¹ng, khÃ´ng tá»± suy diá»…n hoáº·c "lÃ m cho xong".

## BÆ°á»›c 2 â€” Kiá»ƒm tra tÃ¡i sá»­ dá»¥ng trÆ°á»›c khi viáº¿t báº¥t ká»³ file má»›i nÃ o

Thá»© tá»± kiá»ƒm tra báº¯t buá»™c, dÃ¹ng `Glob`/`Grep` Ä‘á»ƒ tÃ¬m, khÃ´ng chá»‰ Ä‘oÃ¡n theo tÃªn:

1. `src/components/ui/`
2. `src/components/common/`
3. `src/features/<feature-hiá»‡n-táº¡i>/components|hooks|services/`
4. `src/services/`, `src/utils/`, `src/constants/`

NguyÃªn táº¯c: **Reuse > Extend > Create new**. Chá»‰ táº¡o file má»›i sau khi xÃ¡c nháº­n khÃ´ng cÃ³ gÃ¬ tÃ¡i sá»­ dá»¥ng hoáº·c má»Ÿ rá»™ng Ä‘Æ°á»£c.

## BÆ°á»›c 3 â€” Implement Ä‘Ãºng layer

```
Screen â†’ Hook â†’ Feature Service â†’ API Client / Native Service â†’ Backend / Native API
```

- UI má»›i â†’ Ä‘Ãºng layer (`components/ui` / `components/common` / `features/<feature>/components`), theo `.claude/rules/component-reuse.md`.
- KhÃ´ng hard-code mÃ u/spacing/radius/URL/route/secret â€” theo `.claude/rules/no-hardcode.md`.
- TypeScript strict, props interface rÃµ rÃ ng, NativeWind cho style, accessibility Ä‘áº§y Ä‘á»§ â€” theo `.claude/rules/typescript-mobile.md`.
- Server state qua TanStack Query, client state qua Zustand, API qua Axios client chung, form qua RHF+Zod â€” theo `.claude/rules/state-and-api.md`.
- Má»i mÃ n hÃ¬nh dá»¯ liá»‡u báº¥t Ä‘á»“ng bá»™ cÃ³ Ä‘á»§ Loading/Success/Empty/Error.

## BÆ°á»›c 4 â€” Náº¿u chÆ°a ná»‘i API tháº­t (nhÃ¡nh mock-ui)

- Mock data cÃ´ láº­p trong `mocks/`/`__mocks__`, shape khá»›p `docs/SmartMeal_API_Contract.md`.
- Váº«n implement Ä‘Ãºng layer Hook â†’ Service, chá»‰ service táº¡m tráº£ mock, Ä‘Ã¡nh dáº¥u 1 chá»— duy nháº¥t `// TODO: replace mock with real API`.
- KhÃ´ng hard-code mock trá»±c tiáº¿p trong screen/component dÃ¹ng chung.

## BÆ°á»›c 5 â€” Tá»± cháº¥m Definition of Done trÆ°á»›c khi bÃ¡o hoÃ n thÃ nh

- [ ] ÄÃºng `business_rule.md`, Ä‘Ãºng `design.md`, Ä‘Ãºng cáº¥u trÃºc thÆ° má»¥c `structure_system.md`.
- [ ] KhÃ´ng táº¡o component/service trÃ¹ng láº·p (Ä‘Ã£ kiá»ƒm tra á»Ÿ BÆ°á»›c 2).
- [ ] KhÃ´ng gá»i API trá»±c tiáº¿p tá»« UI; khÃ´ng hard-code URL/secret/mÃ u/spacing/route.
- [ ] CÃ³ loading/error/empty state khi cáº§n.
- [ ] TypeScript khÃ´ng lá»—i, khÃ´ng `any` khÃ´ng cáº§n thiáº¿t, `npm run lint` sáº¡ch.
- [ ] KhÃ´ng import path quÃ¡ sÃ¢u, dÃ¹ng alias `@/`; khÃ´ng circular dependency.
- [ ] Test/verify logic quan trá»ng náº¿u cÃ³ (BMI/BMR/TDEE, validation, macro...).

Náº¿u cÃ³ pháº§n nÃ o khÃ´ng Ä‘áº¡t hoáº·c bá» qua cÃ³ lÃ½ do, nÃ³i rÃµ lÃ½ do khi bÃ¡o cÃ¡o káº¿t quáº£ thay vÃ¬ im láº·ng bá» qua.

## Khi nÃ o giao cho agent/command thay vÃ¬ tá»± lÃ m trá»±c tiáº¿p

- Táº¡o/má»Ÿ rá»™ng component dÃ¹ng chung â†’ agent `rn-component-builder` hoáº·c `/new-component`.
- Dá»±ng khung feature má»›i â†’ agent `rn-feature-scaffolder` hoáº·c `/new-feature`.
- Review láº¡i trÆ°á»›c khi merge (khÃ´ng tá»± sá»­a) â†’ agent `ui-consistency-reviewer` hoáº·c `/check-reuse`, `/ui-review`.
