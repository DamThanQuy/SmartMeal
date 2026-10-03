# SmartMeal Mobile — Nối API thật · Phần 2/2: Nội dung & tính năng thông minh

| | |
|---|---|
| Đối tượng đọc | Dev FE (Expo/React Native) phụ trách Phần 2; người phụ trách BE đọc §8 |
| Phạm vi | `recipes` (+ yêu thích/bộ sưu tập), `meal-planner`, `grocery`, `ai` + `scanner`, `gamification` (pet/challenge/badge), `premium` |
| Phần trước | [Phần 1 — Nền tảng & luồng cốt lõi](./part1_foundation_core.md) — **đọc §0, §3, §4 trước** (ký hiệu 🟢🟡🔴, quy ước BE, hạ tầng) |
| Nguồn sự thật | Code BE (`Controllers`, `DTOs`, `Services`), không phải `docs/SmartMeal_API_Contract.md` |
| Đối chiếu với | `main` @ `6370a62` · 2026-10-02 · chưa chạy BE thật — chỗ nào suy ra từ code mà chưa chạy thử đều ghi rõ |

---

## 0. Đọc trước

### 0.1 Phụ thuộc vào Phần 1

| Cần | Phần 1 cung cấp ở | Khi chưa có |
|---|---|---|
| `apiClient`, `ENDPOINTS`, `unwrap`, `ApiError`, `queryClient` | P1 §4 (PR nền tảng) | Viết `*.api.types.ts`, `*.mapper.ts` và test (chỉ phụ thuộc type) |
| Token + trạng thái đăng nhập (`useAuthStore`, `user.isPro`) | P1 §4.7, §5 | — |
| `getCurrentUserAllergyIds()` có dữ liệu thật + `metaMapping` (id ↔ slug dị ứng/tag) | P1 §6.4, §6.5 | Dùng dữ liệu mock |
| `toApiMealType` / `fromApiMealType` | P1 §4.10 | — |
| `ENV.useMockApi`, `ENV.aiTimeoutMs`, `API_CONFIG.aiTimeout` | P1 §4.2 | — |
| `useHealthSyncDaily(dateIso)` (calo vận động hôm nay) | P1 §8 | — |
| Pattern "mock fallback" `xxxService.mock/api/selector` (nhớ giữ export phụ) | P1 §4.9 | — |

### 0.2 Quyết định cần chốt trước khi code

| # | Vấn đề | Đề xuất |
|---|---|---|
| D7 | Lọc dị ứng công thức: BE không lọc và `RecipeDto` không có thông tin dị ứng | Tạm dựng "chỉ mục dị ứng nguyên liệu" từ `/foods` (§1.4), **fail-closed**; xin BE trả `allergyIds` (P2-BE-01) |
| D8 | Pet/XP: BE chưa cộng XP (`exp` không bao giờ đổi) | Nối phần thật (streak, danh sách + tham gia thử thách); **giữ XP/level/nhiệm vụ/huy hiệu cục bộ** |
| D9 | Tên pet: BE `Dino Healthy`, thiết kế "Bé Mầm" | Giữ "Bé Mầm" ở FE, không hiển thị `petName` của BE |
| D10 | Kích hoạt Pro khi chưa có cổng thanh toán | Dùng `activate-mock` **chỉ khi** `ENV.appEnv !== 'production'`, sau đó vẫn đi qua bước "xác nhận từ BE" (§6) |
| D11 | AI cần **ảnh thật** nhưng camera/picker hiện chỉ là nút giả lập | Dùng `expo-image-picker` (chạy Expo Go) trước; `expo-camera` preview làm sau |
| D12 | Voice Logging: BE chỉ nhận **text**, không nhận audio | Nối đường "gõ bữa ăn"; mic thật giữ mock tới khi BE có STT (P2-BE-06) |

### 0.3 Quy tắc áp dụng

Giống Phần 1 §0.3. Thêm: mọi thay đổi **chữ ký hàm** đều ghi "đổi chữ ký" trong bảng và cập nhật hook + screen gọi nó trong cùng PR.

### 0.4 Chỗ FE đang đi vòng qua tầng service (phần thuộc Phần 2)

Kết quả quét `src/` — các nơi này sẽ hiện dữ liệu giả hoặc vỡ nếu chỉ sửa service:

| File | Đang làm | Khi nối API |
|---|---|---|
| `recipes/state/favoritesStore.ts` | Store Zustand **seed** 2 món yêu thích + 3 bộ sưu tập giả, id slug mock | Thay bằng server state (§1.5/§1.6); bỏ seed |
| `recipes/screens/{DiscoveryScreen, RecipeDetailScreen, FavoritesScreen, CollectionDetailScreen, CreateCollectionScreen}.tsx` | Đọc/ghi thẳng `useFavoritesStore` | Chuyển sang hook server (`useFavoriteRecipes`, `useToggleFavorite`, `useCollections`, `useCreateCollection`) |
| `recipes/screens/{FavoritesScreen, CollectionDetailScreen}.tsx` | Tra `RECIPE_DATABASE_MOCK` theo `recipeIds` | BE trả sẵn `RecipeDto[]` trong yêu thích/bộ sưu tập → bỏ tra cứu, map trực tiếp |
| `meal-planner/screens/SlotPickerScreen.tsx` | Import `RECIPE_DATABASE_MOCK` + `useFavoritesStore` | Dùng `useFavoriteRecipes()` / `useCollections()` / `useRecipes` |
| `meal-planner/screens/PlannerRegenerateScreen.tsx` | Import `CURRENT_USER_DAILY_TARGET`, `TODAY_ACTIVITY_CALORIES_BURNED_MOCK` từ `@/features/nutrition` | Mục tiêu calo ← `useUserProfileStore.result.calorieTarget`; calo vận động ← `useHealthSyncDaily(todayIso())` |
| `meal-planner/services/mealPlannerService.ts`, `grocery/services/groceryService.ts` | Dùng thẳng `RECIPE_DATABASE_MOCK` | Thay hoàn toàn bằng API (§2, §3) |
| `{recipes,meal-planner,premium}/index.ts` | `export * from './mocks/…'` → lộ mock cho feature khác | Bỏ re-export khi tắt mock |
| `premium/screens/{PremiumScreen, PaymentMethodScreen, PaymentPendingScreen, PaymentSuccessScreen, SubscriptionScreen}.tsx` | Import `BILLING_PLAN_OPTIONS`, `PAYMENT_METHOD_OPTIONS`, `FEATURE_COMPARISON_MOCK` từ `mocks/premium.mock` | Giá/gói ← `useSubscriptionPlans()` (§6). `PAYMENT_METHOD_OPTIONS` và `FEATURE_COMPARISON_MOCK` là cấu hình UI tĩnh → chuyển sang `constants/` hoặc `premium/constants/` (không còn là "mock") |
| `gamification/screens/ChallengeCompleteScreen.tsx` | Import `BADGE_DEFINITIONS_MOCK`, `COSTUME_DEFINITIONS_MOCK` | Giữ (huy hiệu/trang phục là mock-only, §5) |
| `ai/screens/{AIAnalyzingScreen, VoiceLogScreen, VoicePermissionScreen}.tsx` | `onError` chỉ xử lý `AiRecognitionFailedError` — lỗi khác **không làm gì** (màn treo spinner) | Phải xử lý `ApiError` (NETWORK/TIMEOUT/SERVER) → chuyển `StateAIFailed` (không trừ quota) hoặc ErrorState có "Thử lại" (§4) |
| `scanner/screens/{FridgeScreen, BarcodeScreen, OCRReviewScreen}.tsx` | Bắt `CameraPermissionDeniedError` (mock) | Giữ lớp lỗi này cho quyền camera thật; thêm xử lý `ApiError` |
| `scanner/screens/BarcodeScreen.tsx` | Import `UNKNOWN_BARCODE_MOCK` | Giữ (barcode là mock-only) |

---

## 1. Recipes (`features/recipes`)

| FE hiện tại | → BE | | Ghi chú |
|---|---|---|---|
| `recipeService.getRecommended(filters)` | `GET /recipes?search&tag&difficulty&maxCalories` | 🟡 | BE trả **toàn bộ**, không phân trang, không lọc dị ứng, không lọc thời gian nấu → lọc `cookTime`, khoảng calo, dị ứng ở FE |
| `recipeService.getRecipeById(id)` | `GET /recipes/{id}` | 🟢 | `id` phải là GUID (slug mock → 404 rỗng). Trả `undefined` khi 404 để giữ chữ ký |
| `recipeService.getRecipesForIngredients(names)` | `POST /recipes/suggest-by-pantry { availableIngredients }` | 🟡 | BE xếp theo số nguyên liệu khớp, tối đa 10, **không** trả `matchedCount` → FE tự tính. Danh sách rỗng → HTTP 200 + `success:false` |
| `useFavoritesStore.toggleFavorite / isFavorite / favoriteIds` | `POST /recipes/{id}/favorite`, `GET /recipes/favorites` | 🟢 | §1.5 |
| `useFavoritesStore.collections` (đọc) | `GET /recipes/collections` | 🟡 | Trả cả bộ sưu tập **công khai của người khác**, không có `ownerId` (§1.6) |
| `useFavoritesStore.createCollection(name)` | `POST /recipes/collections` | 🟢 | **Đổi chữ ký**: từ đồng bộ (trả id) sang `Promise` — `CreateCollectionScreen` điều hướng ở `onSuccess` |
| `renameCollection`, `deleteCollection`, `removeRecipeFromCollection` | — | 🔴 | BE chưa có (P2-BE-03) |
| Thêm món vào bộ sưu tập | `POST /recipes/collections/{id}/items { recipeId }` | 🟢 | UI chưa có hành động này (`CollectionDetail` → "Thêm món" chỉ điều hướng về Khám phá); nối khi có UI chọn bộ sưu tập |
| Chia sẻ bộ sưu tập | — | 🔴 | |

### 1.1 `RecipeDto` → `Recipe`

| BE | FE | Quy đổi |
|---|---|---|
| `id` | `id` | GUID |
| `title` | `name` | |
| `prepTimeMinutes + cookTimeMinutes` | `durationMinutes` | |
| — | `rating` | BE không có → ẩn rating trên UI |
| `servings` | `servings` | |
| `caloriesPerServing` / `proteinPerServing` / `carbsPerServing` / `fatPerServing` | `nutritionPerServing.{calories, proteinG, carbsG, fatG}` | |
| `tags: string[]` (tên) | `tags: RecipeTag[]` | §1.2 — bỏ tag không có slug |
| `ingredients[] { ingredientId, name, amount, unit, estimatedPriceVnd }` | `ingredients[] { name, amount (string), allergenId? }` | `amount` = `${amount} ${unit}` (bỏ phần thập phân khi tròn); `allergenId` từ §1.4; `unknownComposition` BE không có → `undefined` (BR-291 chỉ hiển thị khi có dữ liệu) |
| `instructions: string` — các bước ngăn bằng `\n`, thường có tiền tố `1. ` | `steps: RecipeStep[]` | `split('\n')` → bỏ dòng rỗng → bỏ tiền tố `^\d+[.)]\s*` → `{ order: i + 1, instruction }` |
| — | `allergenIds` | §1.4 |
| `imageUrl`, `difficulty`, `isPremium`, `description` | (chưa có trong type FE) | Thêm `imageUrl?` (thay placeholder), `difficulty?`, `isPremium?` khi UI cần. Công thức `isPremium` → gate Premium ở FE (BE **không** chặn) |

### 1.2 Tag & bộ lọc

Tham số `tag` của BE so khớp **nguyên văn tên tag** (không phân biệt hoa/thường) — lấy tên từ `GET /meta/tags` theo id (P1 §6.4) thay vì hard-code chuỗi. Axios `params` tự encode dấu/ngoặc.

| `RecipeTag` FE | Tên tag BE |
|---|---|
| `eatClean` | `Eat Clean` |
| `keto` | `Keto` |
| `vegan` | `Thuần Chay (Vegan)` |
| `quick` | `Nhanh Gọn (< 15 phút)` |
| `lowCarb`, `vegetarian` | không có tag trên BE → ẩn chip (không có dữ liệu để lọc) |

| `RecipeFilters` FE | Cách lọc |
|---|---|
| `tag` | `tag=<tên tag BE>` |
| `calorie = under300` | `maxCalories=299` |
| `calorie = 300to500` | `maxCalories=500` + lọc FE `calories >= 300` |
| `calorie = over500` | lọc FE `calories > 500` |
| `cookTime = 15/30/60` | lọc FE `durationMinutes <= n` (BE không có tham số) |

BE có 6 công thức seed nên lọc phía FE ổn; không scale — xem P2-BE-02.

### 1.3 Hook & query key

Giữ `['recipes', 'recommended', filters]`, `['recipes', 'detail', id]`, `['recipes', 'fridge', names]`. Thêm: `['recipes', 'favorites']`, `['recipes', 'collections']`, `['foods', 'allergy-index']`. `staleTime` gợi ý: recipes 5 phút, allergy-index 24h.

### 1.4 Lọc dị ứng — BR-101/102 là **bắt buộc** (D7)

BE không lọc theo dị ứng người dùng ở `GET /recipes`/`suggest-by-pantry`, và `RecipeDto` không có thông tin dị ứng. Cách tạm:

1. Lấy "chỉ mục dị ứng nguyên liệu" từ `GET /foods` (lặp `page` với `pageSize=100` đến hết): `Map<ingredientId, allergyId | null>`; key `['foods', 'allergy-index']`.
2. Với mỗi recipe: `allergenIds = unique(ingredients.map(i => allergySlug(index.get(i.ingredientId))))` (id→slug theo P1 §6.4). Gắn `allergenId` cho từng nguyên liệu để UI cảnh báo.
3. `filterOutUserAllergens(recipes)` (có sẵn) chạy trên kết quả này với `getCurrentUserAllergyIds()`.

**Fail-closed:** chỉ mục phải sẵn sàng trước khi hiển thị danh sách (hiển thị Loading); nếu tải chỉ mục lỗi thì coi cả danh sách là lỗi — **không bao giờ** hiển thị công thức chưa lọc dị ứng. Mục tiêu dài hạn: BE trả `allergyIds` (P2-BE-01) rồi bỏ bước này.

Dữ liệu seed để kiểm thử: *Cá hồi áp chảo…* chứa Cá hồi (dị ứng 1 Hải sản); *Trứng cuộn rau củ…* chứa Trứng gà (4 Trứng); *Cháo yến mạch ức gà…* chứa Yến mạch (5 Gluten); *Canh đậu hũ non…* chứa Đậu hũ non (6 Đậu nành).

### 1.5 Yêu thích

- Bỏ phần `favoriteIds` của `favoritesStore`. Thay bằng server state:
  - `useFavoriteRecipes()` ← `GET /recipes/favorites` (key `['recipes','favorites']`, trả đủ `RecipeDto[]` → map sang `Recipe[]`).
  - `useToggleFavorite()` ← `POST /recipes/{id}/favorite` → `{ isFavorite, totalFavorites }`, **optimistic update** (cập nhật cache, rollback khi lỗi).
  - `useIsFavorite(recipeId)` = `favoriteIds.has(recipeId)` suy ra từ query `favorites`.
- `RecipeCard`, `DiscoveryScreen`, `RecipeDetailScreen`, `FavoritesScreen`, `SlotPickerScreen` đổi từ `useFavoritesStore` sang các hook trên (§0.4).
- Guest: không gọi API (giữ nhánh `isGuest → GUEST_PROMPT` như hiện tại).
- `DiscoveryScreen`/`FavoritesScreen` sẽ có thêm trạng thái Loading cho yêu thích.

### 1.6 Bộ sưu tập

- Đọc: `RecipeCollectionDto { id, name, description, coverImageUrl, recipeCount, isPublic, recipes[] }` → `RecipeCollection { id, name, recipeIds }` với `recipeIds = recipes.map(r => r.id)`; có thể kèm `setQueryData(['recipes','detail',id], …)` để mở chi tiết ngay.
- Tạo: `POST /recipes/collections { name, isPublic: false }` — **luôn gửi `isPublic:false`** vì BE trả cả bộ sưu tập công khai của người khác nhưng không có `ownerId`, FE không phân biệt được "của tôi" và "của người khác" (BR-152). `description`/`coverImageUrl` tùy chọn.
- `rename`/`delete`/`removeRecipe`/chia sẻ: **ẩn hoặc vô hiệu hóa** các nút này ở chế độ API thật (kèm nhãn "Sắp có"); **không** mock-sửa dữ liệu server ở máy (sẽ lệch khi tải lại).

---

## 2. Meal planner (`features/meal-planner`)

| FE hiện tại | → BE | | Ghi chú |
|---|---|---|---|
| `getWeekPlan(weekStartIso)` | `GET /mealplanner/week?startDate=` | 🟢 | Gửi **thứ Hai** (`weekStartIso`); BE trả đúng 7 ngày từ `startDate` (thiếu tham số → hôm nay theo UTC). `dayOfWeek` BE là tiếng Việt ("Thứ Hai") — nhãn UI tính từ `date` |
| `setSlot(weekStartIso, dateIso, mealType, recipeId)` | `POST /mealplanner/assign { planDate, mealType, recipeId }` | 🟢 | Upsert theo (ngày, bữa), trả `PlannedMealItemDto` |
| (mới) `clearSlot(mealPlanId)` | `DELETE /mealplanner/{mealPlanId}` | 🟢 | Cần `mealPlanId` → mở rộng `PlannedMealSlot` thêm `mealPlanId` và `isCompleted?` |
| `autoFillWeek(weekStartIso)` — "Giữ các bữa tôi đã chọn" (BR-163) | — | 🟡 | BE `auto-generate` **luôn xóa & ghi đè cả tuần** → FE tự làm: `GET week` → với ô Sáng/Trưa/Tối còn trống chọn recipe (đã lọc dị ứng §1.4) → `POST assign` từng ô |
| `regenerateWeek(weekStartIso)` — "Tạo lại toàn bộ tuần" | `POST /mealplanner/auto-generate { startDate, includeSnack:false }` | 🟡 | Trả `WeeklyMealPlanDto`. BE lọc dị ứng phía server nhưng **fallback về mọi recipe** khi không có món an toàn (vi phạm BR-102) → FE kiểm tra lại kết quả bằng §1.4 và cảnh báo (P2-BE-01) |
| `getSlotSuggestions()` | — | 🟡 | Tự dựng từ `GET /recipes` + lọc dị ứng; `reasonLabel` từ tag; tab "Yêu thích" từ `useFavoriteRecipes`, tab "Bộ sưu tập" từ `useCollections` (nay có dữ liệu thật) |

`WeeklyMealPlanDto` → `WeekPlan`:

- `weekStartIso ← startDate`; `calorieTarget ← targetDailyCalories` (nguồn là hồ sơ sức khỏe → đồng bộ với Dashboard/Diary, BR-022).
- `days[i] = { dateIso ← date, plannedCalories ← totalCalories, meals }` với `meals: Record<MealType, PlannedMealSlot | null>` dựng từ `meals[]` theo `fromApiMealType(mealType)`: `{ recipeId, recipeName ← recipeTitle, durationMinutes ← cookingTimeMinutes, calories, mealPlanId, isCompleted }`; ô không có → `null`.
- Gate Premium ("Gợi ý AI") giữ ở FE bằng `isPremiumActive()`; BE không chặn.

Invalidation: sau mọi thay đổi planner → `['meal-plan', weekStartIso]` **và** đánh dấu danh sách đi chợ đã cũ (§3.2). Hook `useInvalidateWeekPlan` hiện đang invalidate `['grocery', weekStartIso]` — giữ.

---

## 3. Grocery (`features/grocery`)

BE giữ **một danh sách duy nhất cho mỗi user** (không theo tuần), sinh bằng `generate-from-plan` rồi lưu DB. FE hiện tính danh sách "live" từ meal plan theo `weekStartIso`.

| FE hiện tại | → BE | | Ghi chú |
|---|---|---|---|
| `getGroceryList(weekStartIso)` | `GET /grocery` | 🟡 | `weekStartIso` chỉ còn dùng để quyết định tự sinh (§3.2) |
| (sinh danh sách) | `POST /grocery/generate-from-plan { startDate, endDate, clearExisting }` | 🟡 | `startDate` = thứ Hai, `endDate` = Chủ nhật của `weekStartIso`. `clearExisting:true` xóa **mọi** món của user (cả món tự thêm). Tuần chưa có thực đơn → 400 "Không tìm thấy thực đơn…" |
| `toggleItemStatus(weekStartIso, itemId)` | `PATCH /grocery/items/{id}/check { isChecked }` | 🟢 | BE cần giá trị đích → **đổi chữ ký**: `toggleItemStatus(weekStartIso, itemId, nextStatus)`; `useToggleGroceryItem` truyền `{ itemId, nextStatus }` lấy từ item đang hiển thị; optimistic update |
| `markAllPurchased(weekStartIso)` | `PATCH …/check` × số món chưa mua | 🟡 | Không có bulk (P2-BE-05): `Promise.all`, chỉ gọi cho món `isChecked=false` |
| `addManualItem(weekStartIso, input)` | `POST /grocery/items { ingredientName, amount, unit, category, estimatedPriceVnd? }` | 🟢 | Gửi đúng chuỗi nhóm FE vào `category` (BE lưu nguyên văn — §3.1) |
| `carryOverPendingItems(weekStartIso)` | `DELETE /grocery/clear-checked` rồi `POST /grocery/generate-from-plan` (tuần kế tiếp, `clearExisting:false`) | 🟡 | §3.3 |
| (mới, tùy chọn) xóa món | `DELETE /grocery/items/{id}` | 🟢 | |

### 3.1 `GrocerySummaryDto` → `GroceryList`

- `totalItems`; `purchasedItems ← checkedItems`; `estimatedTotalCostVnd ← totalEstimatedCostVnd`.
- `groups ← categories.map({ category ← categoryName, items })`; `item`: `id` (GUID), `name ← ingredientName`, `amountLabel ← formatAmountLabel(amount, unit)`, `status ← isChecked ? 'purchased' : 'pending'`, `estimatedCostVnd ← estimatedPriceVnd`, `mergedFromRecipeCount` BE không có → `1` (ẩn nhãn "Gộp từ N món").
- **Giữ 6 nhóm của thiết kế** (`GROCERY_CATEGORY_ORDER`: Rau củ · Thịt cá · Sữa · Ngũ cốc · Gia vị · Đồ khô — BR-172, `design/Grocery.dc.html`); không đổi thiết kế để khớp BE. BE lưu `category` là **chuỗi tự do** và tự sinh theo bộ tên riêng, nên cần quy đổi khi đọc:

  | `category` từ BE | Nhóm FE |
  |---|---|
  | `Rau củ & Trái cây` | `Rau củ` |
  | `Thịt & Thủy hải sản` | `Thịt cá` |
  | `Sữa & Trứng` | `Sữa` |
  | `Gia vị & Đồ khô` | phân loại lại theo tên bằng `categorizeIngredient(name)` (→ `Ngũ cốc` / `Gia vị` / `Đồ khô`) |
  | `Khác` hoặc chuỗi lạ | `categorizeIngredient(name)` |
  | một trong 6 nhóm FE (món tự thêm) | giữ nguyên |

  Khi tạo món thủ công gửi đúng chuỗi nhóm FE vào `category` (BE lưu nguyên văn). `categorizeIngredient` hiện chỉ có ít từ khóa — bổ sung từ khóa theo nguyên liệu seed của BE (cá hồi, ớt chuông, dưa leo, sốt mè…), nếu không chúng rơi vào `Đồ khô`. BE sắp nhóm theo chữ cái nên FE tự sắp theo `GROCERY_CATEGORY_ORDER`.
- `utils/groceryAggregation.ts` (gộp nguyên liệu, ước giá) không còn cần ở chế độ API (BE đã gộp) — giữ cho mock.

### 3.2 Khi nào sinh danh sách

BE không tự cập nhật khi planner đổi.

1. Có hành động rõ ràng "Tạo từ thực đơn".
2. Tự sinh một lần khi `GET /grocery` trả `totalItems = 0` **và** kế hoạch tuần có món.
3. Khi planner thay đổi sau lần sinh → hiện banner "Thực đơn đã đổi — Tạo lại danh sách" (lưu cục bộ `{ weekStartIso, generatedAt }`; planner mutation đánh dấu cũ).
4. Dùng `clearExisting:true` chỉ khi người dùng chủ động tạo lại và đã được cảnh báo "sẽ mất các món tự thêm".

### 3.3 "Giữ lại N món chưa mua" (`GroceryDoneScreen`)

Vì BE chỉ có một danh sách chung, "giữ lại" = giữ nguyên các món `pending`: gọi `DELETE /grocery/clear-checked` (bỏ món đã mua) rồi `POST /grocery/generate-from-plan` cho **tuần kế tiếp** với `clearExisting:false`. Lưu ý: nguyên liệu tuần sau **không được gộp** với món `pending` cùng tên (có thể trùng tên). Tuần sau chưa có thực đơn → BE trả 400: coi là thành công (món `pending` vẫn còn). "Không giữ" = `clear-checked` hoặc không làm gì — chốt với PO.

### 3.4 Ước tính giá (BR-174)

BE tính `giá = EstimatedPriceVnd × amount / 100` cho **mọi đơn vị**; với đơn vị "quả"/"muỗng" kết quả sai (vd. 2 quả trứng ≈ 80 đ). Giữ nhãn "chỉ mang tính ước tính" và ghi P2-BE-05.

---

## 4. AI & Scanner (`features/ai`, `features/scanner`)

**Tiền đề (D11):** API cần **file ảnh**, nhưng `AICameraScreen`, `FridgeCameraScreen`, `OCRCameraScreen` hiện chỉ có nút giả lập, `AIAnalyzing` chỉ nhận `mealType`. Cần:

- Lấy ảnh qua `expo-image-picker` (`launchCameraAsync` / `launchImageLibraryAsync`, `quality ≈ 0.6`, resize cạnh dài ≤ 1280 px) — chạy được trên Expo Go. Quyền camera/thư viện đi qua `services/permissions` (CLAUDE.md §9).
- `navigation/types.ts`: thêm `imageUri: string` vào params `AIAnalyzing`; `FridgeCamera → Fridge` truyền `imageUris: string[]`. (Đây là file dùng chung — Phần 2 sở hữu thay đổi này.)

| FE hiện tại | → BE | | Ghi chú |
|---|---|---|---|
| `aiService.analyzeMealPhoto(mealType)` | `POST /ai/snap-and-track` (multipart `image`) | 🟡 | **Đổi chữ ký** `(mealType, imageUri)`. BE trả **1 món**, không phải danh sách |
| `aiService.transcribeVoice(mealType)` | `POST /ai/voice-log { transcript }` | 🟡 | **Đổi chữ ký** `(mealType, transcript)`. Chỉ nhận **text**; nối đường "gõ bữa ăn" (`VoicePermissionScreen`); mic thật 🔴 (D12) |
| `scannerService.scanFridge()` | `POST /ai/fridge-scanner` (multipart `image`) | 🟡 | **Đổi chữ ký** `(imageUris)`. BE nhận **1 ảnh/request** mà `FridgeCamera` cho tối đa 4 ảnh → gọi tuần tự từng ảnh rồi gộp `detectedIngredients` (bỏ trùng) |
| `scannerService.scanBarcode()` | — | 🔴 | BE không có tra cứu sản phẩm; `check-safety` chỉ chuyển mã vạch cho Gemini (không đáng tin) → giữ mock |
| `scannerService.analyzeOcrLabel()` | `POST /ai/check-safety { ocrRawText }` | 🔴 | OCR trên máy cần ML Kit (không chạy Expo Go); BE không OCR từ ảnh → giữ mock (P2-BE-06) |
| Cảnh báo an toàn sản phẩm | `POST /ai/check-safety { barcode?, ocrRawText? }` | 🟡 | Dùng được khi đã có text; cảnh báo dị ứng chỉ đúng khi gửi kèm token |
| `aiQuotaStore` (5 lượt/ngày) | — | 🔴 | BE **không** giới hạn (BR-233) → quota vẫn do FE |

### 4.1 Upload ảnh

```ts
// ví dụ — service gọi, không phải screen
const form = new FormData();
form.append('image', { uri: imageUri, name: 'meal.jpg', type: 'image/jpeg' } as unknown as Blob);
const res = await apiClient.post<ApiEnvelope<SnapAndTrackResponse>>(ENDPOINTS.ai.snapAndTrack, form, {
  timeout: API_CONFIG.aiTimeout, // Gemini 5–20s; mặc định 15s sẽ cắt giữa chừng
  headers: { 'Content-Type': 'multipart/form-data' },
});
```

Tên trường **phải là `image`**. React Native `FormData` nhận `{ uri, name, type }` nên cần ép kiểu. Nếu BE báo thiếu boundary/415, thử bỏ header `Content-Type` để RN tự đặt.

### 4.2 Snap: `SnapAndTrackResponseDto` → `AIAnalysisResult`

- `items = [{ id: 'snap-1', name ← dishName, servingLabel ← `${estimatedGrams} g`, grams ← estimatedGrams, nutrition { calories, proteinG ← protein, carbsG ← carbs, fatG ← fat }, isUncertain ← confidenceScore < AI_UNCERTAIN_THRESHOLD }]` (đề xuất ngưỡng `0.6`, đặt hằng số). Không có `uncertainResolution` (BE không có danh sách ứng viên) → `AISnapUncertain` cho **nhập tên món thủ công**, không chọn ứng viên.
- Mở rộng `AIAnalysisResult` (trường tùy chọn): `allergyWarnings?: string[]`, `healthTips?: string`, `detectedIngredients?: string[]`. **Phải hiển thị `allergyWarnings`** (BR-102/140) bằng `InlineBanner` kèm icon (không chỉ dựa vào màu).
- Giữ nguyên luồng Review → Confirm → Save (BR-054/061/062): nhãn "≈ ước tính", cho sửa/xóa/thêm. Lưu sau Confirm qua `nutritionService.addLogEntries` với `logMethod: 'AiImage'` (P1 §7.3).
- **BE "luôn thành công":** khi chưa cấu hình `Gemini__ApiKey` hoặc Gemini lỗi, BE vẫn trả HTTP 200 với **dữ liệu mẫu cố định** (`message` chứa "Mock Demo mode"/"Fallback mode"). FE không phân biệt được thất bại thật; `StateAIFailed` chỉ kích hoạt khi lỗi mạng/timeout/400. Đừng dùng kết quả này làm dữ liệu thật trong demo nếu BE chưa cấu hình khóa (P2-BE-06).
- Sửa `AIAnalyzingScreen`/`VoiceLogScreen`/`VoicePermissionScreen`: `onError` phải xử lý `ApiError` — `NETWORK`/`TIMEOUT`/`SERVER` → chuyển `StateAIFailed` (không `consumeQuota`), còn `AiRecognitionFailedError` giữ cho trường hợp BE báo lỗi nghiệp vụ.

### 4.3 Voice: `VoiceLogResponseDto` → `VoiceLogResult`

`mealType ← fromApiMealType(mealType)`; `transcript` = chuỗi người dùng đã gõ (BE không trả lại); `items ← extractedItems.map({ id, name ← foodName, servingLabel ← portionDescription, grams ← portionGrams, nutrition { calories, proteinG ← protein, carbsG ← carbs, fatG ← fat } })`; `portionQuestion` bỏ (BE không hỏi lại). Vẫn qua Review/Confirm (BR-054, BR-070). Lưu với `logMethod: 'Voice'`.

### 4.4 Fridge

`FridgeScannerResponseDto.detectedIngredients: string[]` → `FridgeIngredient[]` = `{ id: `fridge-${i}`, name, quantityLabel: '', status: 'confirmed' }` (BE không có số lượng/độ chắc chắn). Người dùng xác nhận (BR-080) rồi `recipeService.getRecipesForIngredients(names)` (§1) — dùng công thức **trong DB** để có `recipeId` đưa vào planner. `suggestedRecipes` do AI sinh (không có `recipeId`) không dùng trong luồng hiện tại. Gate Pro (BR-230/231) giữ ở FE.

### 4.5 Check-safety

`CheckSafetyResponseDto { isSafe, alerts[{ type, message, severity }], detectedIngredients, extractedNutrition }`: `severity DANGER` → cảnh báo đỏ + icon; `extractedNutrition` (`caloriesPerServing`, `servingSize`, `sugarGrams`, `sodiumMg`, `totalFatGrams`) dùng điền sẵn `OCRReview`. Không khẳng định "an toàn tuyệt đối" (BR-112/291).

### 4.6 Quota (BR-233)

Vẫn do FE. Nâng cấp `aiQuotaStore` từ "in-memory, khởi tạo `usedToday = 2`" sang lưu theo ngày và theo user trong AsyncStorage (khóa `ai.quota.<userId>.<yyyy-MM-dd>`); `consumeQuota()` chỉ khi phân tích **thành công**; `isPro` bỏ qua quota.

---

## 5. Gamification (`features/gamification`, không gồm nước)

| FE hiện tại | → BE | | Ghi chú |
|---|---|---|---|
| `gamificationService.getPetState()` | `GET /gamification/pet` + `GET /gamification/streak` | 🟡 | §5.1 |
| `challengeService.getChallenges()` | `GET /gamification/challenges` | 🟡 | §5.2 |
| `challengeService.joinChallenge(id)` | `POST /gamification/challenges/{id}/join` | 🟡 | Idempotent (đã tham gia thì trả lại bản ghi cũ) |
| `challengeService.completeChallenge(id)` | — | 🔴 | BE không có tiến độ/hoàn thành |
| `badgeService.*`, `equipCostume` | — | 🔴 | Mock-only |
| `xpLedger` / `awardXpOnce` | — | 🔴 | BE không bao giờ cộng XP |
| Nước (`waterService`) | — | — | Thuộc Phần 1 §10 |

### 5.1 Pet & streak (D8, D9)

- BE `HealthPetStatusDto { petName, petType, level, exp, nextLevelExp (= level × 100), stage, mood, statusMessage, currentOutfit, nutritionScoreToday }`. Pet được tạo lười ở lần gọi đầu với `exp: 20` và **không bao giờ cập nhật** `exp`/`level`.
- Nối phần thật: `streakDays ← currentStreak`; `weekCompletion` ← `recentActivity` (7 ngày kết thúc **hôm nay**, `hasLogged`) sắp lại thành Thứ Hai → Chủ nhật theo `date`; `message ← statusMessage`.
- **Streak của BE luôn ≥ 1** (`currentStreak`, `totalActiveDays` bị ép tối thiểu 1 kể cả khi chưa ghi gì) → nếu `recentActivity` không có ngày nào `hasLogged` thì hiển thị streak **0**.
- Giữ cục bộ: `level`/`xpIntoLevel`/`xpPerLevel` (500) từ `xpLedger`, `tasks` (tính từ diary + nước như hiện tại), `challenge` (lấy thử thách đang tham gia từ §5.2). Tên giữ "Bé Mầm".
- BE tính streak/`hasLoggedToday` theo ngày **UTC** → từ 00:00–07:00 giờ VN có thể lệch một ngày.

### 5.2 `ChallengeDto` → `Challenge`

| BE | FE | Ghi chú |
|---|---|---|
| `id`, `title`, `description` | cùng tên | `imageUrl` dùng cho thẻ nếu muốn |
| `durationDays` | `dayTotal` | |
| `completedDays` | `dayCurrent` | BE đặt `1` ngay khi tham gia và **không bao giờ tăng** |
| `rewardExp` | `xpReward` | |
| `rewardBadge` (chuỗi nhãn) | `badgeId` | Không khớp id trong `BADGE_DEFINITIONS_MOCK` → tạm không map |
| `isJoined` / `isCompleted` | `joined` / `completed` | |
| — | `startIso`, `endIso`, `windowState` | BE không có khung ngày → coi `windowState = 'active'`, bỏ kiểm tra BR-211 phía FE (P2-BE-07) |

BE bug cần biết: `JoinChallengeAsync` không gán `StartDate` (mặc định `0001-01-01`). Hoàn thành thử thách (`ChallengeCompleteScreen`, `completeChallenge`) giữ mock + `awardXpOnce` cục bộ. Seed: 3 thử thách (7 ngày uống 2L nước · Eat Clean 14 ngày · 10.000 bước/ngày).

### 5.3 Huy hiệu & trang phục

Giữ mock-only. `badgeService.computeUnlockedBadgeIds` đọc `waterService`/`groceryService`/`challengeService` qua selector nên khi các service đó nối API nó tự đọc dữ liệu thật; lưu ý nó gọi `groceryService.getGroceryList(currentWeekStartIso())` → ở chế độ API là `GET /grocery`.

---

## 6. Premium (`features/premium`, `state/premium`)

| FE hiện tại | → BE | | Ghi chú |
|---|---|---|---|
| Bảng giá `BILLING_PLAN_OPTIONS` | `GET /subscription/plans` | 🟢 | `PRO_MONTHLY` 79.000 đ · `PRO_YEARLY` 699.000 đ (khớp giá mock). Hook `useSubscriptionPlans()` thay import mock ở 5 screen (§0.4) |
| `premiumService.checkout(planId, paymentMethodId)` | `POST /subscription/create-checkout-session { planId, paymentMethod }` | 🟡 | Trả `{ sessionId, paymentUrl, qrCodeUrl, amountVnd, message }`. `paymentUrl` là **sandbox giả**, BE không có webhook/xác minh thanh toán |
| Bước "BE xác nhận" (BR-241/242) | `GET /auth/me` → `isPro` | 🟡 | §6.1 |
| Kích hoạt Pro (D10) | `POST /subscription/activate-mock { planId }` | 🔴 | **Chỉ DEV** (`ENV.appEnv !== 'production'`). BE không kiểm tra thanh toán — mọi user đăng nhập tự nâng cấp được (P2-BE-08) |
| `premiumStore.status` | `GET /auth/me` → `isPro` | 🟡 | `isPro ? 'premium' : 'free'` |
| `expired` / `cancelled` / `autoRenew` / `expiresAtIso` / `transactions` | — | 🔴 | BE chỉ có `isPro: boolean` |

### 6.1 Luồng checkout giữ nguyên chữ ký

`PaymentPendingScreen` đang chờ `useCheckoutPremium()` resolve rồi mới `activatePremium(...)` và chuyển `PaymentSuccess` với `CheckoutResult` — giữ nguyên. Đưa toàn bộ việc "chờ BE xác nhận" vào trong `premiumService.checkout()`:

1. `POST create-checkout-session` → mở `paymentUrl` bằng `expo-web-browser` (đã cài).
2. DEV: gọi `activate-mock` để mô phỏng cổng thanh toán xác nhận.
3. Poll `GET /auth/me` (mỗi ~3 s, tối đa ~60 s) tới khi `isPro = true` → resolve `CheckoutResult`; hết hạn/lỗi → reject (screen đã có trạng thái "Thanh toán thất bại").

`CheckoutResult.expiresAtIso`: BE không có hạn dùng → hiển thị "dự kiến" (+1 tháng/+1 năm) và ghi rõ không phải dữ liệu từ BE, hoặc ẩn. `transactionId ← sessionId`.

Quy đổi id: `monthly↔PRO_MONTHLY`, `yearly↔PRO_YEARLY`; `vnpay→VNPAY`, `momo→MOMO`, `card→STRIPE`.

### 6.2 Đồng bộ trạng thái

- Thêm action `premiumStore.setFromServer(isPro)`; hook `usePremiumSync()` gắn vào `MainNavigator` (hoặc `AppContent`): khi `authStore.user.isPro` đổi → cập nhật `premiumStore`. Các gate hiện có (`isPremiumActive()` cho AI quota, Fridge, PlannerRegenerate) không phải sửa.
- `transactions` seed 5 giao dịch giả → bỏ ở chế độ API (hoặc chỉ lưu giao dịch do app này tạo, cục bộ). Không hiển thị lịch sử giả cho user thật.
- Token claim `isPro` cũ sau nâng cấp — chỉ tin `GET /auth/me` (P1 §3.4).

---

## 7. Luồng chính

**C. AI → Review → Confirm → Save (BR-054)**

```
QuickLog/Dashboard "Chụp ảnh" ─ expo-image-picker (lấy ảnh) ─▶ AIAnalyzing(imageUri)
  ─ POST /ai/snap-and-track (multipart, timeout 60s) ─▶ AISnapResult (Review: "≈ ước tính", sửa/xóa/thêm; hiện allergyWarnings)
  ─ Confirm ─ POST /nutritiondiary/log (logMethod=AiImage) ─▶ invalidate diary · progress · dashboard ─▶ Diary (SuccessToast)
  Lỗi mạng/timeout ─▶ StateAIFailed (KHÔNG trừ quota)
Voice : gõ bữa ăn ─ POST /ai/voice-log { transcript } ─▶ Review ─ Confirm ─ POST log (logMethod=Voice)
Fridge: ảnh × N ─ POST /ai/fridge-scanner (tuần tự, gộp) ─▶ danh sách nguyên liệu (người dùng xác nhận)
        ─ POST /recipes/suggest-by-pantry ─▶ gợi ý (đã lọc dị ứng, chỉ Pro)
```

**D. Công thức → thực đơn → đi chợ**

```
Discovery ─ GET /recipes + (GET /foods → allergy-index) ─▶ RecipeDetail ─ GET /recipes/{id}
  tim ─ POST /recipes/{id}/favorite (optimistic) ; Favorites ─ GET /recipes/favorites
  "Thêm vào thực đơn" ─ POST /mealplanner/assign ─▶ MealPlanner ─ GET /mealplanner/week?startDate=<Thứ Hai>
MealPlanner "Gợi ý bằng AI" (Pro) ─ POST /mealplanner/auto-generate ─▶ kế hoạch mới (kiểm tra lại dị ứng)
Grocery ─ GET /grocery ; rỗng + có thực đơn ─ POST /grocery/generate-from-plan ─▶ danh sách theo nhóm
  tick mua ─ PATCH /grocery/items/{id}/check { isChecked } ; "Hoàn tất" ─ PATCH × N / clear-checked
```

**E. Nâng cấp Premium**

```
Premium ─ GET /subscription/plans ─▶ PaymentMethod ─▶ PaymentPending
  POST /subscription/create-checkout-session ─ mở paymentUrl (expo-web-browser)
  (DEV: POST /subscription/activate-mock) ─ poll GET /auth/me tới isPro=true ─▶ PaymentSuccess
  → authStore.user.isPro=true → usePremiumSync → premiumStore.status='premium' → mở khóa AI/Fridge/PlannerRegenerate
```

---

## 8. Yêu cầu BE (Phần 2)

Ưu tiên: **P0** = chặn luồng hoặc rủi ro bảo mật/BR bắt buộc · **P1** = cần để khớp thiết kế/BR · **P2** = nên có.

| ID | Ưu tiên | Yêu cầu | Lý do / màn FE | FE tạm làm gì |
|---|---|---|---|---|
| P2-BE-01 | **P0** | Recipes trả `allergyIds` (mỗi nguyên liệu + tổng công thức) và hỗ trợ `excludeMyAllergens=true` khi có token (BR-101/102). `auto-generate` **không** được fallback về món chứa dị ứng khi không còn món an toàn — trả lỗi/danh sách rỗng kèm thông báo | Discovery, Fridge, SlotPicker, Planner | Chỉ mục dị ứng từ `/foods` (§1.4), fail-closed |
| P2-BE-02 | P1 | `GET /recipes`: phân trang (`page`, `pageSize`), `mealType`, `maxCookTimeMinutes`, cờ `isFavorite` khi có token; cân nhắc `rating` | Discovery, FilterSheet | Lọc phía FE |
| P2-BE-03 | P1 | Bộ sưu tập: `GET /recipes/collections/{id}`, đổi tên, xóa, bỏ món (`DELETE …/items/{recipeId}`), trả `isOwner`/`ownerId` (BR-152) | `CollectionDetail`, `Favorites` | Ẩn các nút chưa có API |
| P2-BE-04 | P1 | Planner: `auto-generate` có tùy chọn `keepExisting=true` (BR-163); `PATCH /mealplanner/{id}/complete` (cột `IsCompleted` đã có nhưng không có endpoint) | `PlannerRegenerate`, đánh dấu đã nấu | FE tự điền ô trống bằng `assign` |
| P2-BE-05 | P1 | Grocery: bulk check (`PATCH /grocery/items/check-all`), trả `mergedFromRecipeCount`, sửa ước tính giá theo đơn vị (hiện `giá × amount/100` cho mọi đơn vị), danh sách theo tuần hoặc cơ chế carry-over | `Grocery`, `GroceryDone` | `Promise.all`, ẩn nhãn "Gộp từ N món" |
| P2-BE-06 | P1 | AI: (a) trả **lỗi thật** khi Gemini lỗi/chưa cấu hình thay vì luôn HTTP 200 với dữ liệu mẫu; (b) quota + `GET /ai/quota` (BR-233); (c) nhận audio (STT) cho voice; (d) OCR nhãn từ ảnh; (e) ứng viên khi không chắc (BR-072); (f) tra cứu barcode | AI Snap, Voice, Barcode, OCR, `StateAILimit` | Quota ở FE; voice gõ tay; barcode/OCR mock |
| P2-BE-07 | P1 | Gamification: sự kiện cộng XP (ghi bữa ăn, nước, hoàn thành thử thách) cập nhật `Exp`/`Level`; tiến độ/hoàn thành thử thách, gán `StartDate` khi tham gia, khung `startDate/endDate`; huy hiệu + trang phục + equip; đồng bộ tên pet với thiết kế | `Pet`, `Challenges`, `Badges` | XP/huy hiệu cục bộ |
| P2-BE-08 | **P0** | Subscription: `activate-mock` **chỉ** ở Development (hiện bất kỳ user đăng nhập nào cũng tự nâng cấp Pro); xác minh thanh toán qua webhook/server-to-server (BR-241/242); `proExpiresAt`, trạng thái Free/Premium/Expired/Cancelled, lịch sử giao dịch | `Premium`, `Subscription` | `activate-mock` chỉ DEV, chỉ `isPro` |
| P2-BE-09 | P2 | (Nếu làm phía server) endpoint nhắc nhở/thông báo (BR-18x/22x) | `Reminders`, `Notifications` | Cục bộ (`expo-notifications`) |

---

## 9. Mock-only registry (Phần 2 — còn giữ mock sau khi nối)

| Hàm / màn | Lý do |
|---|---|
| `renameCollection`, `deleteCollection`, `removeRecipeFromCollection`, chia sẻ bộ sưu tập | P2-BE-03 → ẩn/vô hiệu hóa, không mock-sửa |
| Chip lọc `lowCarb`, `vegetarian`; hiển thị `rating` | BE không có dữ liệu |
| `scannerService.scanBarcode`, `analyzeOcrLabel` | P2-BE-06 |
| Voice bằng mic (`expo-av`) | P2-BE-06 (STT); đường gõ tay đã nối |
| `aiQuotaStore` | Quota do FE (P2-BE-06) |
| `challengeService.completeChallenge`, XP/level/nhiệm vụ Pet, `badgeService`, `equipCostume` | P2-BE-07 |
| `premiumStore.expired/cancelled/autoRenew/transactions`, `expiresAtIso` thật | P2-BE-08 |
| `activate-mock` | Chỉ DEV (D10) |
| `FEATURE_COMPARISON_MOCK`, `PAYMENT_METHOD_OPTIONS`, định nghĩa huy hiệu/trang phục | Cấu hình UI tĩnh, không phải dữ liệu server |

---

## 10. Thứ tự làm, Definition of Done, nghiệm thu

### 10.1 Thứ tự (mỗi bước = 1 PR nhỏ)

0. **Chờ PR nền tảng của Phần 1** — trong lúc chờ: viết `*.api.types.ts` (Phụ lục B), mapper + test fixture.
1. **Recipes đọc** (§1: list/detail/pantry + chỉ mục dị ứng + tag/filter mapping).
2. **Yêu thích + bộ sưu tập** (§1.5, §1.6) — gỡ `favoritesStore` khỏi screen, ẩn nút chưa hỗ trợ.
3. **Planner** (§2).
4. **Grocery** (§3) — kèm bảng quy đổi nhóm (§3.1) và đổi chữ ký `toggleItemStatus`.
5. **AI** (§4) — image picker + snap + voice (gõ tay) + fridge; xử lý `ApiError` ở 3 screen; sau cùng mới tới check-safety (tùy chọn).
6. **Premium** (§6) — plans, checkout + poll, `activate-mock` DEV, `usePremiumSync`.
7. **Gamification** (§5) — streak + pet (phần thật) + challenges list/join.

### 10.2 Definition of Done (mỗi PR)

Giống Phần 1 §14.2, thêm:

- [ ] Không còn Screen nào import `RECIPE_DATABASE_MOCK`, `BILLING_PLAN_OPTIONS`… (bảng §0.4) ở chế độ API.
- [ ] Mọi `onError` của mutation/query AI/scanner xử lý `ApiError` (không treo spinner).
- [ ] Chữ ký đã đổi (`createCollection`, `toggleItemStatus`, `analyzeMealPhoto`, `transcribeVoice`, `scanFridge`) được cập nhật ở hook + screen trong cùng PR.
- [ ] Hàm còn dùng mock được ghi vào §9.

### 10.3 Nghiệm thu Phần 2

- [ ] Discovery hiển thị 6 công thức seed với tài khoản không dị ứng; khai báo dị ứng "Hải sản" → *Cá hồi áp chảo…* biến mất ở Discovery, Fridge, SlotPicker **và** kết quả "Tạo lại toàn bộ tuần".
- [ ] Giả lập BE chậm/lỗi khi tải chỉ mục dị ứng → Discovery hiện lỗi (không hiện danh sách chưa lọc).
- [ ] Tim món → kill app → mở lại vẫn còn (lưu ở server). Tạo bộ sưu tập → có trong danh sách sau khi tải lại.
- [ ] Thêm món vào Thứ Tư/Bữa tối → tải lại vẫn còn; "Giữ các bữa tôi đã chọn" không đè ô đã chọn.
- [ ] Sinh danh sách đi chợ → tick mua → thoát/vào lại vẫn tick; tổng số món/tiền khớp màn hình.
- [ ] Chọn ảnh → AI → Review (hiện cảnh báo dị ứng nếu có) → Confirm → món xuất hiện ở Diary với `logMethod = AiImage`. Ngắt mạng giữa chừng → `StateAIFailed`, lượt AI không bị trừ.
- [ ] Free: Fridge/"Gợi ý bằng AI"/quota AI bị chặn đúng; sau nâng cấp (DEV) mở khóa; kill app → mở lại vẫn Pro (từ `GET /auth/me`).
- [ ] Pet hiển thị streak thật: tài khoản mới chưa ghi gì hiện streak 0; ghi 1 món → streak/ô hôm nay cập nhật.
- [ ] Tắt BE → mọi màn dữ liệu của Phần 2 hiện `ErrorState` có thử lại.

---

## Phụ lục B — DTO của BE (TypeScript, đặt vào `*.api.types.ts`)

`string` cho `Guid`/`DateOnly`/`DateTime`. Trường `?` có thể là `null`. `ApiEnvelope`/`PagedResult` xem Phụ lục A (Phần 1).

```ts
// recipes
export interface RecipeIngredientDto { ingredientId: string; name: string; amount: number; unit: string; estimatedPriceVnd: number }
export interface RecipeDto {
  id: string; title: string; description: string | null; imageUrl: string | null
  instructions: string; prepTimeMinutes: number; cookTimeMinutes: number; servings: number
  difficulty: string; isPremium: boolean
  caloriesPerServing: number; carbsPerServing: number; fatPerServing: number; proteinPerServing: number
  tags: string[]; ingredients: RecipeIngredientDto[]
}
export interface PantrySuggestionRequest { availableIngredients: string[] }
export interface CreateCollectionRequest { name: string; description?: string | null; coverImageUrl?: string | null; isPublic: boolean }
export interface AddRecipeToCollectionRequest { recipeId: string }
export interface RecipeCollectionDto {
  id: string; name: string; description: string | null; coverImageUrl: string | null
  recipeCount: number; isPublic: boolean; recipes: RecipeDto[]
}
export interface FavoriteToggleResponse { isFavorite: boolean; totalFavorites: number }

// meal planner
export interface PlannedMealItemDto {
  mealPlanId: string; mealType: string; recipeId: string; recipeTitle: string; recipeImageUrl: string | null
  calories: number; carbs: number; protein: number; fat: number; cookingTimeMinutes: number; isCompleted: boolean
}
export interface DailyPlanDto {
  date: string; dayOfWeek: string
  totalCalories: number; totalCarbs: number; totalProtein: number; totalFat: number
  meals: PlannedMealItemDto[]
}
export interface WeeklyMealPlanDto { startDate: string; endDate: string; targetDailyCalories: number; days: DailyPlanDto[] }
export interface AssignMealPlanRequest { planDate: string; mealType: string; recipeId: string }
export interface AutoGeneratePlanRequest { startDate?: string | null; dietTag?: string | null; targetDailyCalories?: number | null; includeSnack: boolean }

// grocery
export interface GroceryItemDto {
  id: string; ingredientName: string; amount: number; unit: string; category: string
  estimatedPriceVnd: number; isChecked: boolean; recipeTitle: string | null
}
export interface GroceryCategoryDto { categoryName: string; items: GroceryItemDto[] }
export interface GrocerySummaryDto { totalItems: number; checkedItems: number; totalEstimatedCostVnd: number; categories: GroceryCategoryDto[] }
export interface GenerateGroceryRequest { startDate: string; endDate: string; clearExisting: boolean }
export interface AddCustomGroceryItemRequest { ingredientName: string; amount: number; unit: string; category?: string | null; estimatedPriceVnd?: number | null }
export interface ToggleGroceryItemRequest { isChecked: boolean }

// ai
export interface SnapAndTrackResponse {
  dishName: string; estimatedGrams: number; confidenceScore: number
  calories: number; carbs: number; protein: number; fat: number
  detectedIngredients: string[]; allergyWarnings: string[]; healthTips: string | null
}
export interface FridgeRecipeSuggestionDto {
  title: string; description: string; calories: number; cookingTimeMinutes: number
  matchingIngredients: string[]; missingIngredients: string[]; quickInstructions: string
}
export interface FridgeScannerResponse { detectedIngredients: string[]; suggestedRecipes: FridgeRecipeSuggestionDto[] }
export interface VoiceLogRequest { transcript: string }
export interface ExtractedMealItemDto {
  foodName: string; portionDescription: string; portionGrams: number
  calories: number; carbs: number; protein: number; fat: number
}
export interface VoiceLogResponse {
  mealType: string; extractedItems: ExtractedMealItemDto[]
  totalCalories: number; totalCarbs: number; totalProtein: number; totalFat: number
}
export interface CheckSafetyRequest { barcode?: string | null; ocrRawText?: string | null }
export interface SafetyAlertDto { type: string; message: string; severity: string } // type: ALLERGY|HIGH_SODIUM|HIGH_SUGAR|MEDICAL_WARNING · severity: INFO|WARNING|DANGER
export interface ExtractedNutritionFactsDto { caloriesPerServing: number; servingSize: string; sugarGrams: number; sodiumMg: number; totalFatGrams: number }
export interface CheckSafetyResponse {
  isSafe: boolean; alerts: SafetyAlertDto[]; detectedIngredients: string[]; extractedNutrition: ExtractedNutritionFactsDto | null
}

// gamification
export interface HealthPetStatusDto {
  petName: string; petType: string; level: number; exp: number; nextLevelExp: number
  stage: string; mood: string; statusMessage: string; currentOutfit: string; nutritionScoreToday: number
}
export interface StreakDayDto { date: string; dayOfWeek: string; hasLogged: boolean } // dayOfWeek: "Mon"…"Sun"
export interface StreakStatusDto {
  currentStreak: number; longestStreak: number; totalActiveDays: number; hasLoggedToday: boolean; recentActivity: StreakDayDto[]
}
export interface ChallengeDto {
  id: string; title: string; description: string; imageUrl: string
  durationDays: number; completedDays: number; rewardExp: number; rewardBadge: string
  isJoined: boolean; isCompleted: boolean
}

// subscription
export interface SubscriptionPlanDto { id: string; name: string; priceVnd: number; billingCycle: string; features: string[]; isPopular: boolean }
export interface CreateCheckoutSessionRequest { planId: string; paymentMethod: string } // PRO_MONTHLY|PRO_YEARLY · VNPAY|MOMO|STRIPE
export interface CheckoutSessionResponse { sessionId: string; paymentUrl: string; qrCodeUrl: string | null; amountVnd: number; message: string }
```
