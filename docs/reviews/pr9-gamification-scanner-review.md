# Review PR #9 — nối API cho Bé Mầm, Fridge Scanner, kiểm tra an toàn

- **Gửi:** DamThanQuy
- **Phạm vi:** commit `d3b8980` (merge `c69fc09`, 10/10/2026) — 28 file, FE là chính.
- **Chuẩn đối chiếu:** backend nhánh `feat/be-api-gaps` (205 test tích hợp đạt). Hợp đồng API mới nằm ở `docs/SmartMeal_API_Contract.md` **trên nhánh đó**. *(Cập nhật 14/10: BE đã vào `main`, bản trên `main` giờ là bản đúng.)*
- **Cách đọc:** mục 🔴 là dữ liệu bịa hoặc sai an toàn, cần sửa trước khi coi PR xong. 🟠 là lệch so với BE. 🟡 là việc nhỏ.

## Trạng thái — cập nhật 14/10/2026

Mọi mục dưới đây đã được sửa trên `main` (cục bộ, chưa push). BE đã merge vào `main`, nên hợp đồng API trên `main` giờ là bản đúng. Phần review gốc bên dưới giữ nguyên để đối chiếu.

| # | Trạng thái | Cách sửa | Commit |
|---|---|---|---|
| S1 | ✅ | Barcode: quét bằng `expo-camera` hoặc nhập tay. Tra qua `check-safety {barcode}`; BE tra trong CSDL, không cho AI đoán. 404 thì sang ProductNotFound với đúng mã vừa quét. Không còn hằng số. | FE `9f926f9`, BE `67d8e01` |
| S2 | ✅ | OCR: gửi ảnh nhãn thật tới `POST /ai/scan-label`. Trường nhãn không ghi thì để trống và đánh dấu "không rõ". | FE `9f926f9`, BE `67d8e01` |
| S3 | ✅ | Fridge: chỉ dùng tối đa 4 ảnh thật; huỷ chụp không tính ảnh; không có ảnh mẫu. Mọi nguyên liệu chờ người dùng xác nhận. | `9f926f9` |
| S4 | ✅ | `allergyIds` là trường bắt buộc; thiếu thì báo lỗi, không coi là "không dị ứng". | `ce2e822` |
| S5 | ✅ | Có banner demo ở OCR và Fridge; AI Snap/Voice vẫn dùng `AiDemoNotice`. | `9f926f9` |
| G1–G5 | ✅ | Pet đọc `tasks/totalXp` của BE và truyền `?date=` theo ngày máy. Chuỗi ngày gắn nhãn theo `date`. Thử thách dùng `startDate/endDate/currentDay/isExpired`. Bỏ `completeChallenge`. Huy hiệu/trang phục nối `/badges`, `/costumes/*`. | `9916999` |
| N1, M1 | ✅ | Xoá fallback `/log/batch` và mã debug `navigationRef`. | `ce2e822` |
| M2 | ✅ | Viết lại test theo hợp đồng BE. Thêm test live (`gamification.live`, `scanner.live`), gồm cả gửi ảnh/ghi âm qua multipart thật. | `890b783`, `2bdd244`, `7bcbaa5` |
| M3 | ✅ | Đã tự mất khi merge BE (`c63b283`). | — |
| Phía BE | ✅ | `check-safety` với mã vạch tra CSDL, không cho AI đoán. | `67d8e01` |

## Tóm tắt

Phần nối đúng: gửi `multipart` cho `/ai/fridge-scanner` (field `image`), join thử thách qua `POST /gamification/challenges/{id}/join`, đọc `pet`/`streak`/`challenges`, có test cho từng service. Chưa ổn là hai chỗ:

1. **Scanner đang trả dữ liệu bịa** trong chế độ API: barcode cố định, OCR cố định, ảnh mẫu, hằng số dinh dưỡng. Người dùng sẽ thấy kết quả trông như thật. Vi phạm BR-054, BR-061, BR-130, BR-140.
2. **Gamification tự tính lại thứ mà BE đã tính**, nên số trên màn hình có thể lệch số BE đã cộng XP.

| # | Mức | Chỗ | Vấn đề |
|---|---|---|---|
| S1 | 🔴 | `scannerService.api.ts:13-42` | `scanBarcode` luôn gửi mã `8934567890123`, tên/dinh dưỡng/dị ứng là hằng số |
| S2 | 🔴 | `scannerService.api.ts:44-68` | `analyzeOcrLabel` gửi chuỗi OCR cố định; Protein, Carbs, Khẩu phần là hằng số |
| S3 | 🔴 | `scannerService.api.ts:71-103`, `FridgeCameraScreen.tsx:20-36` | Fridge: gửi ảnh mẫu khi không có ảnh, đếm ảnh dù chưa chụp, mặc định `confirmed` |
| S4 | 🔴 | `health.api.types.ts`, `metaLookup.ts` | Thiếu `allergyIds` bị coi là "không dị ứng" (fail-open) |
| S5 | 🟠 | `scanner.api.types.ts` | Bỏ qua `isDemo`: dữ liệu mẫu hiện như kết quả thật |
| G1 | 🟠 | `gamificationService.api.ts:28-60` | Tự tính nhiệm vụ, bỏ `tasks`/`totalXp` của BE; không truyền `?date=` nên 00:00–07:00 giờ VN tính nhầm sang hôm qua |
| G2 | 🟠 | `gamificationService.api.ts:90-92`, `PetScreen.tsx:24` | Chuỗi 7 ngày gắn nhãn T2…CN nhưng BE trả 7 ngày kết thúc hôm nay |
| G3 | 🟠 | `challengeService.api.ts:41-49` | `completeChallenge` cộng XP cục bộ; BE tự hoàn thành, không có endpoint "complete" |
| G4 | 🟠 | `challengeService.api.ts:11-30` | Khung ngày lấy từ "hôm nay", bỏ `startDate/endDate/currentDay/isExpired` |
| G5 | 🟠 | `badgeService.ts` | Huy hiệu/trang phục vẫn ở máy; `/badges`, `/costumes/*` chưa nối |
| N1 | 🟠 | `nutritionService.api.ts:66-95` | Nhánh fallback khi `/log/batch` 404 gửi sai payload, không bao giờ chạy đúng |
| M1 | 🟡 | `App.tsx:39-41` | Mã debug `(window as any).navigationRef` |
| M2 | 🟡 | `__tests__/**` | Test mock toàn bộ `api`, không test với BE thật |
| M3 | 🟡 | `DbInitializer.cs` | Thay đổi này không còn cần (xem cuối file) |

---

## 🔴 S1 — Barcode: gửi mã cố định, dựng sản phẩm bịa

**Hiện trạng.** `useScanBarcode` gọi `scannerService.scanBarcode()` không tham số (`useScanner.ts:6`, `BarcodeScreen.tsx:36` gọi `mutate(undefined)`). Bản API gửi cứng `barcode: '8934567890123'` tới `POST /ai/check-safety` và dựng `ScannedProduct` từ kết quả, với giá trị thay thế khi thiếu: tên `'Bánh ngũ cốc dinh dưỡng'`, `240` kcal, `Hộp 100g`, `allergenIds: ['peanut']` khi có cảnh báo dị ứng (`:29-39`).

**Vì sao sai.**
- Mọi sản phẩm quét ra đều là cùng một sản phẩm. Người dùng sẽ ghi nhầm vào nhật ký.
- `allergenIds: ['peanut']` là đoán. Nếu cảnh báo thật là sữa hay hải sản, màn hình vẫn nói "đậu phộng" (BR-140).
- BE `check-safety` nhận **mã vạch trần** thì chỉ nhờ AI đoán sản phẩm từ dãy số, không tra database. Đó là hạn chế phía BE (tôi sẽ xử lý), nên FE đừng dựa vào đường này để tra mã vạch.

**Cách sửa.**
1. Truyền mã thật từ màn hình xuống: `mutationFn: (code: string) => scannerService.scanBarcode(code)`. Mã lấy từ `CameraView` của `expo-camera` (`onBarcodeScanned`, chạy được trên Expo Go) hoặc ô nhập tay. Nút "giả lập" chỉ giữ cho chế độ mock.
2. Tra bằng `GET /foods/barcode/{code}` (8–14 chữ số):
   - `404` → trả `null` để sang `ProductNotFound` (BE ghi rõ: "không đoán số liệu").
   - Có → map `FoodItemDto`: `caloriesPer100g`, `proteinPer100g`, `carbsPer100g`, `fatPer100g`, `sugarPer100g`, `sodiumMgPer100g`, `isVerified`.
3. Dị ứng: so `FoodItemDto.allergyIds` với dị ứng của người dùng (đổi id → `code` qua `getMetaCatalog()` như các chỗ khác). Nếu món chưa rõ thành phần thì hiện "chưa rõ thành phần" thay vì "an toàn" (BR-290/291).
4. Không dùng giá trị thay thế kiểu `?? 240`. Thiếu dữ liệu thì để trống hoặc báo thiếu.

## 🔴 S2 — OCR: văn bản cố định, số liệu hằng số

**Hiện trạng.** `analyzeOcrLabel` gửi `ocrRawText: 'Năng lượng 240 kcal, Đường 18g, … Đậu phộng rang'` (`:48`). Các trường `Khẩu phần 100`, `Protein 7.2`, `Carbs 32.5` là hằng số vì `ExtractedNutritionFactsDto` không có chúng (`:60-66`). `isUncertain: hasAllergy` gắn cờ "không chắc" của **đường** theo cảnh báo **dị ứng** (`:65`) — hai thứ không liên quan.

**Vì sao sai.** BR-130 cần người dùng kiểm tra số bóc tách từ nhãn thật. Ở đây số hiện lên như thể đã đọc từ nhãn, nhưng thực ra là hằng số.

**Cách sửa.**
- Expo Go không có OCR thật (ML Kit cần Dev Client). Chọn một trong hai:
  - (a) Bản API **không** định nghĩa `analyzeOcrLabel`, để `selectService` rơi về mock, và UI ghi rõ đây là bản thử; hoặc
  - (b) Cho người dùng dán/nhập văn bản nhãn rồi gửi văn bản đó.
- Chỉ điền những trường BE thật sự trả (`caloriesPerServing`, `servingSize`, `sugarGrams`, `sodiumMg`, `totalFatGrams`). Trường không có thì để trống và `isUncertain: true`.

## 🔴 S3 — Fridge Scanner: ảnh mẫu, đếm ảnh ảo, tự "confirmed"

**Hiện trạng.**
- `scanFridge` dùng `imageUri || SAMPLE_FRIDGE_IMAGE_DATA_URI` (`:72`): không có ảnh thì **tải ảnh mẫu lên BE**.
- `FridgeCameraScreen.handleCapture` (`:20-36`): nếu người dùng bấm huỷ camera hoặc camera lỗi, code rơi xuống `setPhotoCount(+1)` ở cuối (`:35`) mặc dù không có ảnh. Bấm "Xong" khi đó đi tới `FRIDGE` với `imageUri: undefined` → rơi vào ảnh mẫu.
- `selectedUri` chỉ giữ ảnh cuối, trong khi bộ đếm cho phép nhiều ảnh (`MAX_PHOTOS`).
- Mỗi nguyên liệu gắn `status: 'confirmed'` và `quantityLabel: '1 phần'` (`:102-103`).

**Vì sao sai.**
- Mỗi lượt gọi thành công trừ 1 trong 5 lượt AI/ngày của Free. Gửi ảnh mẫu là tốn lượt để nhận kết quả không liên quan tới tủ lạnh của người dùng.
- BR-054/BR-080: nguyên liệu AI nhận diện phải được người dùng xác nhận trước khi dùng gợi ý món. Mặc định `confirmed` bỏ qua bước đó.
- Số lượng "1 phần" là bịa; BE không trả số lượng.

**Cách sửa.**
- Không có `imageUri` thì **không gọi** API; báo lỗi/yêu cầu chụp ảnh. Bỏ `sampleFridgeImage.ts` khỏi đường API (giữ cho mock).
- Chỉ tăng `photoCount` khi thực sự có `assets[0].uri`. Nếu cho nhiều ảnh thì gom danh sách ảnh; nếu chỉ gửi một ảnh thì giới hạn UI còn 1.
- Mặc định `status` là chưa xác nhận; chỉ thành `confirmed` khi người dùng bấm. Bỏ `quantityLabel` cố định.
- BE còn trả `suggestedRecipes` (tiêu đề, calo, nguyên liệu khớp/thiếu); hiện bị bỏ đi.

## 🔴 S4 — Thiếu `allergyIds` bị hiểu là "không dị ứng"

**Hiện trạng.** `HealthProfileDto.allergyIds/medicalConditionIds/dietaryPreferenceIds` đổi thành optional, thêm `allergies?: string[]`; `toMetaIds`/`toMetaCodes` trả `[]` khi `undefined/null` (`metaLookup.ts`). Có vẻ viết để chịu được BE cũ.

**Vì sao sai.** Nếu BE vì lý do nào đó không trả trường này, FE sẽ coi người dùng là không có dị ứng và hiển thị món chứa chất gây dị ứng như an toàn. Dị ứng là ràng buộc bắt buộc (BR-101/102).

**Cách sửa.** BE mới **luôn** trả các mảng id. Trả lại kiểu bắt buộc (`number[]`); nếu thiếu thì báo lỗi, không đoán `[]`.

## 🟠 S5 — Bỏ qua `isDemo`

Mọi kết quả AI của BE có `isDemo`. Khi chưa cấu hình Gemini ở môi trường Development, BE trả dữ liệu **mẫu** với `isDemo: true`. `scanner.api.types.ts` không khai báo `isDemo`, nên dữ liệu mẫu hiện như thật. Cách `ai.mapper.ts` xử lý (`AiDemoNotice`) là mẫu để theo; nếu là Fridge/Safety thì ít nhất phải có thông báo "dữ liệu mẫu".

## 🟠 G1 — Nhiệm vụ trong ngày: BE đã trả sẵn

BE `GET /gamification/pet` trả `tasks` (`breakfast`, `protein`, `water`) kèm `progressCurrent/progressTarget/unit/completed`, cùng `totalXp`, `xpIntoLevel`, `xpPerLevel`. XP được cộng ở phía server khi đọc, mỗi sự kiện một lần (BR-202).

Bản hiện tại gọi thêm `getDiaryDay`, `getDaySummary`, `getChallenges` rồi tự tính 3 nhiệm vụ với XP cố định 10/20/10 (`:10-12, :28-60`). Hai nguồn có thể lệch: định nghĩa "đạt protein" là của BE, và ngày "hôm nay" của hai bên có thể khác nhau (xem dưới). Màn hình có thể ghi "xong" trong khi BE chưa cộng XP, hoặc ngược lại. Dùng thẳng `petDto.tasks`; bỏ ba lời gọi thừa.

**Truyền `?date=`.** Khi không có tham số `date`, BE xác định "hôm nay" theo **ngày UTC** (riêng hạn mức AI mới đổi ngày theo UTC+7). Với người dùng ở Việt Nam, từ 00:00 đến 07:00 giờ địa phương, `pet`/`streak`/`challenges`/`badges` vẫn tính cho ngày hôm qua. BE cho phép `?date=yyyy-MM-dd` lệch ±1 ngày so với ngày UTC, nên FE gọi `/gamification/pet?date=${todayIso()}` (ngày theo máy, `@/utils/date`) cho cả bốn endpoint đọc.

## 🟠 G2 — Chuỗi ngày gắn sai nhãn

BE trả `recentActivity`: **7 ngày liên tiếp kết thúc hôm nay**, cũ nhất trước, mỗi phần tử có `date` và `dayOfWeek` (`Mon`, `Tue`…). Code đọc theo chỉ số (`streakDto.recentActivity?.[i]`) rồi `PetScreen` gắn nhãn cố định `['T2'…'CN']` (`PetScreen.tsx:24`). Chỉ khi hôm nay là Chủ nhật thì nhãn mới đúng; hôm nay là thứ Tư thì ô cuối cùng (hôm nay) bị gắn nhãn "CN". Nên truyền cả `date` ra UI và lấy nhãn từ `date`, hoặc đặt ô theo thứ trong tuần. Test hiện tại (`gamificationService.api.test.ts:53`) khẳng định đúng cách ánh xạ theo chỉ số, nên cần sửa theo.

## 🟠 G3 — Hoàn thành thử thách cộng XP ở máy

BE không có endpoint "complete": thử thách tự hoàn thành khi `completedDays` đạt `durationDays`, và XP thưởng do server cộng. `completeChallenge` ở FE vẫn gọi `awardXpOnce('challenge-<id>', xpReward)` (`:45`) — cộng vào sổ XP cục bộ. Hai sổ sẽ lệch nhau, và `badgeService` đọc sổ cục bộ này để mở huy hiệu. Ở chế độ API: không cộng cục bộ; chỉ đọc lại `GET /gamification/challenges` và để `ChallengeCompleteScreen` hiển thị phần thưởng từ BE.

## 🟠 G4 — Khung ngày của thử thách

`mapChallengeDto` đặt `startIso = hôm nay`, `endIso = hôm nay + duration`, `dayCurrent = completedDays || 1`, `windowState` chỉ `active/ended`. BE trả sẵn: `startDate`, `endDate` (kết thúc = bắt đầu + durationDays − 1), `currentDay` (0 khi chưa tham gia), `isExpired` (hết khung mà chưa hoàn thành → tham gia lại sẽ bắt đầu khung mới), cùng `category` và `targetValuePerDay`. Hậu quả: mở lại app sau vài ngày thì khung dịch theo ngày mở; thử thách hết hạn vẫn hiện "đang diễn ra"; `dayCurrent` là số ngày đã đạt chứ không phải ngày thứ mấy.

## 🟠 G5 — Huy hiệu và trang phục

`GET /gamification/badges`, `POST /gamification/costumes/{id}/equip`, `DELETE /gamification/costumes/equipped` đã có trên BE (và đã khai báo trong `endpoints.ts`) nhưng `badgeService.ts` vẫn tính ở máy từ sổ XP cục bộ. Cần `badgeService.api.ts` theo cùng mẫu `selectService`.

## 🟠 N1 — Fallback `/log/batch`

Nhánh `catch` khi lỗi `NOT_FOUND` ghi từng món qua `POST /nutritiondiary/log` với `planDate`, `customFoodName`, `servingSizeGrams`, `carbs`, `protein`, `fat`. BE hiện tại nhận `LogMealRequestDto`: `foodName`, `servingSize`, `unit` (bắt buộc), `logDate`, `carbsGrams`, `proteinGrams`, `fatGrams`. Payload này luôn bị `400`. Ngoài ra `404` từ `/log/batch` có thể là lỗi thật (ví dụ món không tồn tại), không phải "BE chưa có endpoint". Xoá nhánh fallback; `/log/batch` đã có trên BE.

## 🟡 M1 — Mã debug trong `App.tsx`

`(window as any).navigationRef = navigationRef;` vi phạm quy tắc không dùng `any` của dự án và để lộ điều hướng ra `window`. Xoá, hoặc bọc trong `__DEV__` và dùng kiểu cụ thể.

## 🟡 M2 — Test

Cả ba file test mock `@/services/api`, nên chỉ kiểm tra chuỗi URL và ánh xạ do chính người viết giả định. Lỗi như G2 qua được vì test khẳng định đúng giả định sai. `scanBarcode` và `analyzeOcrLabel` chưa có test. Thêm test live theo mẫu `test-utils/live.ts` (`describeLive`, `installLiveBackend`, `uniqueEmail`), chạy với `LIVE_API_URL=http://127.0.0.1:<cổng>/api`:
- đăng ký → mở `pet` ngày đầu → ghi bữa sáng → mở lại `pet` thì `tasks[breakfast].completed` và `totalXp` tăng đúng một lần;
- `join` hai lần cho cùng thử thách trả cùng một bản;
- `GET /foods/barcode/<mã không có>` trả 404 → `scanBarcode` trả `null`.

## 🟡 M3 — `DbInitializer.cs`

PR sửa khối seed hồ sơ sức khỏe để build được với entity cũ trên `main`. Nhánh BE đã viết lại khối này và dùng cùng tên (`LoseWeight`, `DailyCaloriesTarget`, `BMR/TDEE/BMI`), nên khi merge BE thì thay đổi này tự mất. Không cần làm gì thêm; lần sau việc phía BE nên đi qua nhánh BE để khỏi xung đột.

---

## Checklist trước khi đóng

- [x] S1–S4: không còn hằng số dinh dưỡng, mã vạch, văn bản OCR, ảnh mẫu trong đường API; thiếu dữ liệu thì báo thiếu.
- [x] S5: có thông báo khi `isDemo: true`.
- [x] G1–G5: Pet dùng `tasks/totalXp` của BE và truyền `?date=` theo ngày máy, nhãn chuỗi ngày theo `date`, thử thách dùng `startDate/endDate/currentDay/isExpired`, không cộng XP cục bộ khi `EXPO_PUBLIC_USE_MOCK_API=false`, huy hiệu nối BE.
- [x] N1, M1: xoá fallback `/log/batch` và mã debug.
- [x] `npx tsc --noEmit`, `npx expo lint`, `npx jest` sạch; thêm test live (M2).
- [x] Cập nhật `docs/ui-progress.md` (Definition of Done) cho các màn bị chạm.

## Phía BE (tôi xử lý, không cần bạn làm)

`POST /ai/check-safety` với mã vạch trần đang để AI đoán sản phẩm. Tôi sẽ đổi để tra database trước và không đoán khi không có (nhất quán với `GET /foods/barcode/{code}`). Trong lúc đó FE không nên gọi `check-safety` bằng mã vạch (xem S1).

## Chưa review

Dịch vụ recipes / meal-planner / grocery từ commit `1a7bced` ("fetch api") không thuộc PR này, chưa đối chiếu với BE mới. Riêng hai hàm PR #9 thêm vào đã kiểm: `groceryService.deleteItem` (`DELETE /grocery/items/{id}`) và `recipeService.addRecipeToCollection` (`POST /recipes/collections/{id}/items`, body `{recipeId}`) khớp hợp đồng.
