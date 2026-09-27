---
description: Scaffold má»™t feature module má»›i cho SmartMeal (src/features/<feature>/) Ä‘Ãºng kiáº¿n trÃºc feature-based + layered
argument-hint: <tÃªn-feature>
---

YÃªu cáº§u: dá»±ng khung feature `$ARGUMENTS` cho app SmartMeal (`frontend/SmartMeal/`) theo `docs/structure_system.md`.

Thá»±c hiá»‡n theo Ä‘Ãºng thá»© tá»±:

1. Äá»c `frontend/SmartMeal/CLAUDE.md`, `.claude/rules/architecture.md`, `.claude/rules/state-and-api.md`.
2. Äá»c pháº§n liÃªn quan trong `docs/business_rule.md` (nghiá»‡p vá»¥, rÃ ng buá»™c, thá»© tá»± Æ°u tiÃªn an toÃ n/dá»‹ á»©ng náº¿u Ã¡p dá»¥ng) vÃ  `docs/design.md` (layout, states cáº§n cÃ³) cho feature nÃ y.
3. Kiá»ƒm tra feature nÃ y cÃ³ khá»›p vá»›i danh sÃ¡ch feature chuáº©n á»Ÿ `docs/structure_system.md` má»¥c 5 khÃ´ng (auth, dashboard, nutrition, recipes, meal-planner, grocery, health, scanner, ai, gamification, premium) â€” náº¿u Ä‘Ã£ cÃ³ tÃªn tÆ°Æ¡ng á»©ng, dÃ¹ng Ä‘Ãºng tÃªn Ä‘Ã³, khÃ´ng táº¡o feature trÃ¹ng Ã½ nghÄ©a.
4. Táº¡o cáº¥u trÃºc chuáº©n, chá»‰ táº¡o thÆ° má»¥c con thá»±c sá»± cáº§n dÃ¹ng ngay:
   ```
   src/features/<feature>/
   â”œâ”€â”€ components/
   â”œâ”€â”€ hooks/
   â”œâ”€â”€ screens/
   â”œâ”€â”€ services/
   â”œâ”€â”€ types/
   â””â”€â”€ index.ts
   ```
5. Service gá»i qua `src/services/api/client.ts` (táº¡o layer nÃ y náº¿u chÆ°a cÃ³), khÃ´ng gá»i axios trá»±c tiáº¿p.
6. Screen chá»‰ render UI + gá»i hook + xá»­ lÃ½ loading/error/empty báº±ng component trong `src/components/common/` (táº¡o náº¿u chÆ°a cÃ³).
7. ThÃªm route vÃ o `src/constants/routes.ts` vÃ  káº¿t ná»‘i `src/navigation/`, khÃ´ng hard-code route string.
8. Náº¿u cáº§n state dÃ¹ng chung nhiá»u feature, Ä‘áº·t vÃ o `src/state/{auth,app}`; náº¿u chá»‰ feature nÃ y dÃ¹ng, giá»¯ trong feature.
9. BÃ¡o cÃ¡o láº¡i: file Ä‘Ã£ táº¡o, component/service dÃ¹ng chung Ä‘Ã£ tÃ¡i sá»­ dá»¥ng, Ä‘iá»ƒm nÃ o trong `business_rule.md`/`design.md` cÃ²n mÆ¡ há»“ cáº§n xÃ¡c nháº­n thÃªm.

Viá»‡c nÃ y cÃ³ thá»ƒ giao cho agent `rn-feature-scaffolder`.
