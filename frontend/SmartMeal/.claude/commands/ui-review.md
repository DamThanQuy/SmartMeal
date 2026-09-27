---
description: Review UI/UX cá»§a diff hiá»‡n táº¡i so vá»›i docs/design.md vÃ  design-review checklist
argument-hint: [tÃªn mÃ n hÃ¬nh/feature, tuá»³ chá»n]
---

Review cÃ¡c thay Ä‘á»•i UI hiá»‡n táº¡i trong `frontend/SmartMeal/` ($ARGUMENTS náº¿u cÃ³ nÃªu mÃ n hÃ¬nh/feature cá»¥ thá»ƒ, khÃ´ng thÃ¬ dÃ¹ng `git diff` working tree) Ä‘á»‘i chiáº¿u vá»›i `docs/design.md`, Ä‘áº·c biá»‡t checklist á»Ÿ má»¥c 57:

### Structure
- Screen cÃ³ má»™t má»¥c tiÃªu chÃ­nh, primary action rÃµ rÃ ng, ná»™i dung nhÃ³m logic, khÃ´ng cÃ³ section dÆ° thá»«a.

### Visual
- Chá»‰ dÃ¹ng design tokens (`docs/design.md` má»¥c 4/6/7/8/9/58), khÃ´ng thÃªm mÃ u/spacing/radius tuá»³ Ã½.
- Typography nháº¥t quÃ¡n, khÃ´ng dÃ¹ng quÃ¡ nhiá»u cá»¡ chá»¯ trÃªn má»™t mÃ n hÃ¬nh.
- Shadow nháº¹, khÃ´ng neumorphism toÃ n app.

### Mobile UX
- Touch target â‰¥ 44px (iOS) / 48dp (Android), khoáº£ng cÃ¡ch giá»¯a action â‰¥ 8px.
- CÃ³ safe area, cÃ³ scroll náº¿u ná»™i dung dÃ i, khÃ´ng nhá»“i quÃ¡ nhiá»u ná»™i dung má»™t mÃ n hÃ¬nh.

### State
- CÃ³ Ä‘á»§ Loading / Empty / Error / Success / Disabled khi mÃ n hÃ¬nh cÃ³ dá»¯ liá»‡u báº¥t Ä‘á»“ng bá»™, dÃ¹ng `components/common` thay vÃ¬ tá»± viáº¿t inline.

### Accessibility
- Text dá»… Ä‘á»c, contrast Ä‘á»§, khÃ´ng phá»¥ thuá»™c hoÃ n toÃ n vÃ o mÃ u Ä‘á»ƒ truyá»n táº£i tráº¡ng thÃ¡i, icon cÃ³ accessibility label rÃµ rÃ ng.

### Consistency
- Component dÃ¹ng Ä‘Ãºng bá»™ chung (`components/ui`, `components/common`) thay vÃ¬ style riÃªng cho tá»«ng screen â€” náº¿u phÃ¡t hiá»‡n style riÃªng láº½ ra nÃªn dÃ¹ng component chung, coi Ä‘Ã³ lÃ  má»™t finding.

Tráº£ káº¿t quáº£ dáº¡ng danh sÃ¡ch ngáº¯n gá»n theo má»©c Ä‘á»™ nghiÃªm trá»ng (Blocking / Should fix / Note), kÃ¨m `file:line` vÃ  Ä‘á» xuáº¥t sá»­a cá»¥ thá»ƒ, khÃ´ng liá»‡t kÃª má»¥c khÃ´ng cÃ³ váº¥n Ä‘á».
