# Rule — Reuse-first UI (đồng bộ component)

Mục tiêu: mọi màn hình trông và hoạt động nhất quán vì dùng chung một bộ component, không phải vì "style giống nhau do copy-paste".

## Thứ tự bắt buộc kiểm tra trước khi viết UI mới

1. `src/components/ui/` — UI primitive dùng chung toàn app.
2. `src/components/common/` — component chung có logic hiển thị cao hơn primitive (loading/empty/error/screen wrapper).
3. `src/features/<feature-hiện-tại>/components/` — component đặc thù đã có trong feature đang làm.
4. Chỉ khi không có gì phù hợp → tạo mới, và tạo đúng layer (xem mục "Đặt component ở đâu" bên dưới).

Nguyên tắc: **Reuse > Extend (thêm prop/variant) > Create new**. Không bao giờ copy một component có sẵn rồi đổi tên để chỉnh style riêng.

## `components/ui/` — UI primitive

Chứa: `AppButton`, `AppCard`, `AppInput`, `AppText`, `AppChip`, `AppIconButton`, `AppBottomSheet`.

Ràng buộc bắt buộc với mọi component trong `ui/`:

- Không gọi API/mock, không chứa business logic.
- Không phụ thuộc một feature cụ thể (không import gì từ `features/*`).
- Nhận toàn bộ dữ liệu/hành vi qua props, không tự fetch, không tự biết "đang ở màn hình nào".
- Biến thể (variant, size, state) phải xử lý bằng prop (`variant="primary" | "secondary" | "outline"`)
  hoặc `cva`, không tạo file mới cho mỗi biến thể (không tạo `PrimaryButton.tsx`, `GreenButton.tsx`...).
- Style bằng NativeWind className token (`bg-surface`, `text-text-primary`, `p-md`, `rounded-card`…),
  không hex, không màu Tailwind mặc định — xem `.claude/rules/no-hardcode.md`.

## `components/common/` — generic component có logic hiển thị

Chứa: `EmptyState`, `ErrorState`, `LoadingState`, `ScreenContainer`, `SectionHeader`.

Mọi screen có dữ liệu bất đồng bộ (gọi service/mock/AI) phải dùng `LoadingState` / `ErrorState` /
`EmptyState` từ đây thay vì tự viết loading/error UI riêng trong từng screen.

## Component đặc thù nghiệp vụ

Đặt trong `src/features/<feature>/components/`, ví dụ `MealCard` → `features/nutrition/components/`,
`RecipeCard` → `features/recipes/components/`. Component này được build **từ** các primitive trong
`components/ui` (ví dụ `MealCard` dùng `AppCard` + `AppText` bên trong), không viết lại `View`/`Text`
thô nếu primitive tương ứng đã tồn tại.

## Naming

Theo chức năng, không theo hình thức hoặc theo screen:

```
Đúng: AppButton, AppCard, NutritionCard, MealCard, RecipeCard, PetCard
Sai:  GreenButton1, DashboardButton, SpecialCard, CustomCard2, NewGreenButton
```

## Card system

Chỉ có các loại card sau, tất cả build trên cùng `AppCard` (cùng radius/shadow/padding/typography —
xem `docs/design.md` mục 42):

```
Standard Card, Nutrition Card, Recipe Card, Meal Card, Pet Card, Alert Card
```

Không tạo card mới nếu một trong các loại trên có thể mở rộng bằng prop/slot để dùng lại.

## Trước khi tạo file component mới, tự hỏi

1. Component tương tự đã tồn tại ở `ui/`, `common/`, hoặc feature khác chưa? (grep theo tên/chức năng,
   không chỉ theo tên file).
2. Có thể thêm prop/variant vào component có sẵn để đáp ứng use-case mới không?
3. Nếu bắt buộc tạo mới: nó thuộc `ui/` (không business logic, generic) hay thuộc feature (gắn với
   nghiệp vụ)?

Nếu không chắc, dùng agent `ui-consistency-reviewer` hoặc command `/check-reuse` để rà soát trước khi merge.
