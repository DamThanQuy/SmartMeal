# Rule â€” Kiáº¿n trÃºc & Feature Boundary

TÃ³m táº¯t thá»±c thi tá»« `docs/structure_system.md`. Khi cÃ³ xung Ä‘á»™t, `structure_system.md` lÃ  nguá»“n chuáº©n.

## Layering báº¯t buá»™c

```
Screen â†’ Hook â†’ Feature Service â†’ API Client / Native Service â†’ Backend / Native API
```

```tsx
// Sai â€” gá»i Axios trá»±c tiáº¿p trong Screen
const response = await axios.get('/meals');

// ÄÃºng
const { data } = useMeals();          // hook
// useMeals() â†’ mealService.getMeals() â†’ apiClient.get(endpoints.meals)
```

- Screen: chá»‰ render UI + gá»i hook + xá»­ lÃ½ navigation + loading/error/empty. KhÃ´ng chá»©a business logic phá»©c táº¡p.
- Hook (`features/<feature>/hooks/`): káº¿t ná»‘i UI vá»›i service/state (TanStack Query, Zustand).
- Service (`features/<feature>/services/`): business/data logic, gá»i API client chung â€” khÃ´ng gá»i Axios trá»±c tiáº¿p bÃªn ngoÃ i `services/api/`.
- Native service (`services/permissions`, hoáº·c `features/<feature>/services/` cho camera/OCR/health): cÃ´ láº­p toÃ n bá»™ native API, khÃ´ng gá»i native API trá»±c tiáº¿p tá»« nhiá»u Screen khÃ¡c nhau.

## Feature module chuáº©n

```
features/<feature>/
â”œâ”€â”€ components/   # component chá»‰ phá»¥c vá»¥ feature nÃ y
â”œâ”€â”€ hooks/
â”œâ”€â”€ screens/
â”œâ”€â”€ services/
â”œâ”€â”€ types/
â””â”€â”€ index.ts      # public entry point
```

Chá»‰ táº¡o cÃ¡c thÆ° má»¥c con khi thá»±c sá»± cáº§n (khÃ´ng táº¡o rá»—ng cho Ä‘á»§ bá»™).

## Feature boundary

- Feature A khÃ´ng import tháº³ng file ná»™i bá»™ cá»§a feature B (`nutrition â†’ recipes/screens/SomeInternalScreen.tsx` lÃ  sai).
- Muá»‘n dÃ¹ng gÃ¬ tá»« feature khÃ¡c â†’ export qua `index.ts` cá»§a feature Ä‘Ã³ rá»“i import tá»« entry point.
- TrÃ¡nh circular dependency giá»¯a cÃ¡c feature.

## State placement

| Loáº¡i state | NÆ¡i Ä‘áº·t |
|---|---|
| Server data (meals, recipes, user...) | TanStack Query (trong hook cá»§a feature) |
| Global client state (auth, theme, language, preference) | `src/state/{auth,app}` (Zustand) |
| State chá»‰ 1 feature dÃ¹ng | Trong chÃ­nh feature Ä‘Ã³, khÃ´ng Ä‘áº©y lÃªn global |
| Component-local state | `useState`/`useReducer` |
| Form state | React Hook Form |

Chá»‰ Ä‘Æ°a vÃ o global store khi **nhiá»u feature thá»±c sá»± cáº§n** â€” khÃ´ng máº·c Ä‘á»‹nh Ä‘áº©y má»i thá»© lÃªn Zustand.

## TrÆ°á»›c khi thÃªm feature má»›i

1. XÃ¡c Ä‘á»‹nh nghiá»‡p vá»¥ trong `docs/business_rule.md`.
2. XÃ¡c Ä‘á»‹nh UI/UX trong `docs/design.md`.
3. Táº¡o `src/features/<feature-name>/` theo cáº¥u trÃºc chuáº©n á»Ÿ trÃªn.
4. Káº¿t ná»‘i navigation (`src/navigation/`), API (`src/services/api/`), xá»­ lÃ½ loading/error/empty.
5. Test flow chÃ­nh.

CÃ³ thá»ƒ dÃ¹ng command `/new-feature` hoáº·c agent `rn-feature-scaffolder` Ä‘á»ƒ dá»±ng khung nhanh, nhÆ°ng váº«n pháº£i Ä‘iá»n Ä‘Ãºng ná»™i dung nghiá»‡p vá»¥ theo docs.

## Checklist kiáº¿n trÃºc trÆ°á»›c khi merge

- [ ] Code náº±m Ä‘Ãºng feature, khÃ´ng láº«n sang feature khÃ¡c.
- [ ] KhÃ´ng gá»i API trá»±c tiáº¿p tá»« UI/component.
- [ ] KhÃ´ng cÃ³ circular dependency, khÃ´ng import sÃ¢u xuyÃªn feature.
- [ ] Global store chá»‰ chá»©a state thá»±c sá»± dÃ¹ng chung.
- [ ] Native API Ä‘Æ°á»£c cÃ´ láº­p qua service, khÃ´ng ráº£i rÃ¡c trong Screen.
