---
description: RÃ  soÃ¡t diff/branch hiá»‡n táº¡i cá»§a SmartMeal tÃ¬m component trÃ¹ng láº·p vÃ  giÃ¡ trá»‹ hard-code
argument-hint: [pháº¡m vi diff, máº·c Ä‘á»‹nh lÃ  working tree hiá»‡n táº¡i]
---

RÃ  soÃ¡t thay Ä‘á»•i hiá»‡n táº¡i trong `frontend/SmartMeal/` ($ARGUMENTS náº¿u cÃ³ chá»‰ Ä‘á»‹nh pháº¡m vi khÃ¡c, máº·c Ä‘á»‹nh dÃ¹ng `git diff`/`git status` working tree) Ä‘á»ƒ tÃ¬m:

1. **Component trÃ¹ng láº·p** â€” component má»›i cÃ³ chá»©c nÄƒng/giao diá»‡n tÆ°Æ¡ng tá»± component Ä‘Ã£ cÃ³ trong `src/components/ui/`, `src/components/common/`, hoáº·c feature khÃ¡c. Äá»c cáº£ hai Ä‘á»ƒ xÃ¡c nháº­n trÆ°á»›c khi káº¿t luáº­n trÃ¹ng.
2. **Hard-code** â€” mÃ u hex/rgba viáº¿t tay, sá»‘ spacing/radius tuá»³ Ã½ ngoÃ i há»‡ 4px, URL/base path API viáº¿t tay, API key/secret, route string viáº¿t tay thay vÃ¬ `src/constants/routes.ts`.
3. **Layering sai** â€” gá»i `axios`/`fetch` trá»±c tiáº¿p trong screen/component thay vÃ¬ qua feature service â†’ API client.
4. **Thiáº¿u state** â€” mÃ n hÃ¬nh cÃ³ dá»¯ liá»‡u báº¥t Ä‘á»“ng bá»™ nhÆ°ng thiáº¿u loading/error/empty state.

Tham chiáº¿u chi tiáº¿t: `.claude/rules/component-reuse.md`, `.claude/rules/no-hardcode.md`, `.claude/rules/architecture.md`.

Káº¿t quáº£ tráº£ vá» dáº¡ng danh sÃ¡ch ngáº¯n gá»n, sáº¯p xáº¿p theo má»©c Ä‘á»™ nghiÃªm trá»ng, kÃ¨m `file:line` vÃ  Ä‘á» xuáº¥t sá»­a cá»¥ thá»ƒ. KhÃ´ng cáº§n liá»‡t kÃª má»¥c khÃ´ng cÃ³ váº¥n Ä‘á». Viá»‡c nÃ y cÃ³ thá»ƒ giao cho agent `ui-consistency-reviewer` Ä‘á»ƒ review Ä‘á»™c láº­p (khÃ´ng tá»± sá»­a code).
