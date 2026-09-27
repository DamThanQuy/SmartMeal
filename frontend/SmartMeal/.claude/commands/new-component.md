---
description: Táº¡o má»›i hoáº·c má»Ÿ rá»™ng má»™t shared/feature component cho SmartMeal, Ä‘Ãºng reuse-first + no-hardcode rules
argument-hint: <tÃªn component> [ui|common|feature:<tÃªn-feature>]
---

YÃªu cáº§u: táº¡o hoáº·c má»Ÿ rá»™ng component `$ARGUMENTS` cho app SmartMeal (`frontend/SmartMeal/`).

Thá»±c hiá»‡n theo Ä‘Ãºng thá»© tá»±:

1. Äá»c `frontend/SmartMeal/CLAUDE.md` vÃ  `.claude/rules/component-reuse.md`, `.claude/rules/no-hardcode.md`, `.claude/rules/typescript-mobile.md` náº¿u chÆ°a cÃ³ trong context.
2. TÃ¬m kiáº¿m component Ä‘Ã£ tá»“n táº¡i cÃ³ thá»ƒ tÃ¡i sá»­ dá»¥ng hoáº·c má»Ÿ rá»™ng: grep/glob trong `src/components/ui/`, `src/components/common/`, vÃ  `src/features/*/components/`. Äá»c ká»¹ trÆ°á»›c khi káº¿t luáº­n lÃ  chÆ°a cÃ³.
3. Náº¿u Ä‘Ã£ cÃ³ component phÃ¹ há»£p hoáº·c gáº§n phÃ¹ há»£p â†’ má»Ÿ rá»™ng báº±ng prop/variant, KHÃ”NG táº¡o file má»›i.
4. Náº¿u thá»±c sá»± cáº§n táº¡o má»›i â†’ xÃ¡c Ä‘á»‹nh Ä‘Ãºng layer:
   - `components/ui/` náº¿u lÃ  primitive chung, khÃ´ng business logic.
   - `components/common/` náº¿u lÃ  generic UI cÃ³ logic hiá»ƒn thá»‹ (loading/empty/error/wrapper).
   - `features/<feature>/components/` náº¿u gáº¯n vá»›i nghiá»‡p vá»¥ cá»¥ thá»ƒ.
5. Äá»‘i chiáº¿u `docs/design.md` Ä‘á»ƒ láº¥y Ä‘Ãºng token mÃ u/spacing/radius/typography â€” khÃ´ng hard-code giÃ¡ trá»‹.
6. Viáº¿t component theo chuáº©n TypeScript/TSX trong `.claude/rules/typescript-mobile.md` (props interface, NativeWind className, accessibility, touch target).
7. BÃ¡o cÃ¡o láº¡i: Ä‘Ã£ tÃ¡i sá»­ dá»¥ng/má»Ÿ rá»™ng gÃ¬, Ä‘Ã£ táº¡o file gÃ¬, cÃ³ thÃªm token má»›i nÃ o khÃ´ng vÃ  vÃ¬ sao.

Náº¿u viá»‡c nÃ y phá»©c táº¡p (nhiá»u biáº¿n thá»ƒ, áº£nh hÆ°á»Ÿng nhiá»u nÆ¡i), cÃ³ thá»ƒ giao cho agent `rn-component-builder` Ä‘á»ƒ thá»±c hiá»‡n.
