---
name: smartmeal-dev-workflow
description: Quy trình chuẩn khi implement bất kỳ màn hình/feature/component nào cho SmartMeal mobile (React Native + TypeScript + NativeWind) — đọc đúng thứ tự tài liệu nguồn và artboard trong design/, kiểm tra tái sử dụng component, dùng token thay vì hard-code, đặt code đúng layer, dùng mock data đúng cách trên nhánh feat/mock-ui, và tự chấm Definition of Done trước khi báo hoàn thành. Dùng skill này bất cứ khi nào làm việc trong frontend/SmartMeal, đặc biệt khi thêm/sửa screen, component, hook, service hoặc mock.
---

# SmartMeal — Quy trình phát triển Frontend chuẩn

Dùng cho mọi task chạm vào `frontend/SmartMeal/`: thêm feature, thêm screen, sửa component, thêm logic nghiệp vụ, dựng UI từ design.

## Bước 0 — Nạp context bắt buộc

Nếu chưa có trong phiên làm việc, đọc:

- `CLAUDE.md` (đặc biệt §4 kiến trúc, §6 styling, §8 mock UI, §9 dựng UI, §10 chia đợt)
- `.claude/rules/component-reuse.md`, `no-hardcode.md`, `typescript-mobile.md`, `architecture.md`, `state-and-api.md`
- `docs/ui-progress.md` — xem màn nào đã xong, đang làm đợt nào

## Bước 1 — Đọc tài liệu nguồn đúng thứ tự

```
docs/business_rule.md → docs/design.md → design/*.dc.html → docs/structure_system.md
→ docs/tech_stack.md → docs/SmartMeal_API_Contract.md
```

- Chỉ đọc phần liên quan, nhưng **luôn đọc `business_rule.md` trước** khi đụng vào tính toán hoặc luồng
  xác nhận (BMI/BMR/TDEE, AI confirmation, allergy/safety priority, premium gating). Ghi lại mã BR-xxx.
- Artboard `design/*.dc.html` (tra tên trong `design/screens.json`): lấy bố cục, thứ tự section, nội dung,
  số liệu mẫu, điều hướng (`href="X.dc.html"`). Bỏ qua `<x-dc>`, `<helmet>`, `<script type="text/x-dc">`.
  Không copy HTML/CSS.
- Nghiệp vụ không rõ hoặc mâu thuẫn với docs/design → **dừng lại và hỏi**, không tự suy diễn hay "làm cho xong".

## Bước 2 — Kiểm tra tái sử dụng trước khi tạo file

Dùng `Glob`/`Grep` (không đoán theo tên), theo thứ tự:

1. `src/components/ui/`
2. `src/components/common/`
3. `src/features/<feature-hiện-tại>/{components,hooks,services,mocks}/`
4. `src/services/`, `src/utils/`, `src/constants/`, `src/theme/`

Nguyên tắc: **Reuse > Extend > Create new**. Chỉ tạo mới khi chắc chắn không dùng lại hoặc mở rộng được.

## Bước 3 — Implement đúng layer

```
Screen → Hook → Feature Service → API Client / Native Service → Backend / Native API
```

- **Screen**: chỉ render UI + gọi hook + điều hướng + Loading / Success / Empty / Error
  (`ScreenContainer`, `LoadingState`, `EmptyState`, `ErrorState`). Không business logic, không axios, không import mocks.
- **Component**: đúng layer (`components/ui` / `components/common` / `features/<feature>/components`)
  theo `component-reuse.md`.
- **Styling**: NativeWind className token ngữ nghĩa (`bg-surface`, `text-text-secondary`, `p-md`,
  `rounded-card`, `text-h3`…). Không hex, không màu Tailwind mặc định, không giá trị tùy ý,
  không `dark:` cho màu token. Màu dùng trong JS (icon, placeholder, chart, StatusBar) lấy từ `useTheme()`.
- **TypeScript**: strict, `<Name>Props` interface, không `any`, alias `@/`, accessibility đầy đủ, touch target ≥ 44.
- **State**: server state qua TanStack Query; client state (auth, theme, preferences) qua Zustand;
  form qua React Hook Form + Zod; storage qua MMKV; token qua Keychain.
- **Navigation**: route trong `src/constants/routes.ts`, param type trong `src/navigation/types.ts`;
  bottom sheet/dialog trong design làm dạng modal.
- **Nghiệp vụ hiển thị trên UI**:
  - Kết quả AI ghi "ước tính" (≈) và cần user xác nhận/chỉnh sửa trước khi lưu (BR-054, BR-061, BR-062).
  - Dị ứng: lọc khỏi gợi ý hoặc cảnh báo rõ (BR-102, BR-140).
  - Không khẳng định "an toàn tuyệt đối", không thay thế tư vấn y tế (BR-112, BR-291).
  - Premium chỉ mở khi thanh toán thành công (BR-241).
- Hiển thị đúng ở cả **light và dark**.

## Bước 4 — Mock UI (nhánh `feat/mock-ui`)

- Mock data trong `src/features/<feature>/mocks/*.mock.ts`, có type, shape khớp `docs/SmartMeal_API_Contract.md`.
- Service trả Promise từ mock, delay 400–800 ms, xử lý theo `MOCK_SCENARIO` trong `src/config/mock.ts`
  (`success | empty | error | slow`).
- Đúng **1** comment `// TODO: replace mock with real API` mỗi service; chữ ký hàm giữ như bản gọi API thật.
- Hook: `useQuery` để đọc, `useMutation` cho hành động (lưu, xóa, xác nhận, check-off), cập nhật cache.
- Không axios, không URL backend, không gọi native thật. Camera/mic/barcode/Health: chỉ UI + nút "giả lập kết quả".
- Không hard-code mock trong screen hoặc component dùng chung.

## Bước 5 — Tự chấm Definition of Done

- [ ] Đúng `business_rule.md`, `design.md`, artboard tương ứng, đúng cấu trúc `structure_system.md`.
- [ ] Không tạo component/service trùng lặp (đã kiểm tra ở Bước 2).
- [ ] Không gọi API/mock trực tiếp từ UI; không hard-code URL/secret/màu/spacing/route.
- [ ] Có Loading / Empty / Error khi cần; xem được mọi state qua `MOCK_SCENARIO`.
- [ ] Đúng ở light và dark mode.
- [ ] `npx tsc --noEmit` và `npm run lint` sạch; không `any` thừa.
- [ ] Import dùng `@/`, không `../../../`; không circular dependency.
- [ ] Có test cho logic quan trọng (BMI/BMR/TDEE, macro, validation) nếu task chạm tới.
- [ ] `docs/ui-progress.md` đã cập nhật.

Mục nào không đạt hoặc bỏ qua có lý do → ghi rõ trong báo cáo, không im lặng bỏ qua.

## Bước 6 — Báo cáo

```
## Kết quả
- Artboard: ...
- File tạo/sửa: screens / hooks / services / mocks / types / navigation / components
- Tái sử dụng: ...   · Mới tạo: ...
- BR đã áp dụng: BR-xxx, ...
- Lệch so với design: ...
- tsc: pass/fail · lint: pass/fail
- Cần xác nhận: ...
```

## Khi nào giao cho agent/command

- Tạo/mở rộng component dùng chung → agent `rn-component-builder` hoặc `/new-component`.
- Dựng khung feature hoặc màn mới → agent `rn-feature-scaffolder` hoặc `/new-feature`.
- Review trước khi merge hoặc cuối mỗi đợt (không tự sửa) → agent `ui-consistency-reviewer`,
  `/check-reuse`, `/ui-review`.
- Làm theo đợt: mỗi lần 1 đợt trong `CLAUDE.md` §10, xong thì dừng và báo cáo;
  giữa các đợt dùng `/clear`.