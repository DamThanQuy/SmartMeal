# SmartMeal — Business Rules

> **Project:** SmartMeal
> **Version:** V2
> **Purpose:** Business Rules & Business Logic Specification
> **Project Type:** PRM — Mobile Programming, FPT University
> **Primary Goal:** Hỗ trợ người dùng theo dõi dinh dưỡng, quản lý sức khỏe, lập thực đơn và mua sắm thực phẩm thông minh.

---

# 1. Mục đích tài liệu

Tài liệu này định nghĩa các **quy tắc nghiệp vụ chính** của SmartMeal.

Business Rule là nguồn tham chiếu chung cho:

* Mobile Application
* Backend API
* Database
* AI Services
* Authentication
* Health Integration
* Premium Membership
* Gamification
* Notification

Mọi tính năng được triển khai phải tuân thủ các quy tắc trong tài liệu này.

## Nguyên tắc

1. Không tự ý thay đổi nghiệp vụ khi triển khai UI hoặc API.
2. Một nghiệp vụ chỉ được định nghĩa một lần.
3. Frontend không được tự quyết định các quy tắc quan trọng thuộc về backend.
4. AI chỉ đưa ra kết quả **ước tính/gợi ý**, không được mặc định xem là dữ liệu chính xác tuyệt đối.
5. Dữ liệu sức khỏe và dị ứng của người dùng phải được ưu tiên khi đưa ra đề xuất.
6. Người dùng luôn có quyền chỉnh sửa hoặc xác nhận dữ liệu do AI tạo ra trước khi lưu chính thức.
7. Tính năng Premium chỉ được sử dụng khi tài khoản đáp ứng điều kiện Premium tương ứng.

---

# 2. Đối tượng sử dụng

SmartMeal có một số nhóm người dùng chính:

## 2.1. Guest

Người chưa đăng nhập.

Có thể:

* Xem một phần nội dung công khai.
* Khám phá công thức.
* Xem giới thiệu ứng dụng.
* Đăng ký tài khoản.
* Đăng nhập.

Không thể thực hiện các nghiệp vụ yêu cầu dữ liệu cá nhân như:

* Lưu nhật ký dinh dưỡng.
* Lưu công thức cá nhân.
* Đồng bộ Health.
* Theo dõi tiến độ cá nhân.
* Sử dụng dữ liệu sức khỏe cá nhân hóa.
* Sử dụng các tính năng Premium.

---

## 2.2. Free User

Người dùng đã đăng ký tài khoản nhưng chưa có Premium.

Có thể sử dụng các tính năng cơ bản theo giới hạn của hệ thống.

Ví dụ:

* Quản lý hồ sơ.
* Theo dõi dinh dưỡng.
* Ghi nhật ký thủ công.
* Xem công thức.
* Lưu công thức.
* Lập thực đơn.
* Quản lý grocery list.
* Gamification cơ bản.

Các tính năng AI/Premium có thể bị giới hạn số lượt sử dụng.

---

## 2.3. Premium User

Người dùng đang có gói Premium còn hiệu lực.

Được sử dụng các tính năng Premium theo gói hiện tại.

Ví dụ:

* AI Snap & Track nâng cao.
* Fridge Scanner.
* AI meal recommendation nâng cao.
* Phân tích sức khỏe chuyên sâu.
* Các giới hạn AI cao hơn hoặc không giới hạn tùy gói.

---

# 3. Nguyên tắc dữ liệu người dùng

## BR-001 — Mỗi tài khoản có một hồ sơ người dùng

Mỗi tài khoản phải có một hồ sơ cá nhân tương ứng.

Hồ sơ có thể bao gồm:

* Họ tên.
* Avatar.
* Ngày sinh/tuổi.
* Giới tính.
* Chiều cao.
* Cân nặng.
* Mục tiêu cân nặng.
* Mức độ vận động.
* Chế độ ăn.
* Dị ứng.
* Bệnh lý.
* Mục tiêu dinh dưỡng.

---

## BR-002 — Dữ liệu sức khỏe là dữ liệu cá nhân

Các thông tin liên quan đến:

* Cân nặng.
* Bệnh lý.
* Dị ứng.
* BMI.
* BMR.
* TDEE.
* Calorie target.
* Macro target.

phải thuộc về từng người dùng và không được sử dụng làm dữ liệu công khai.

---

## BR-003 — Người dùng có quyền cập nhật hồ sơ

Người dùng có thể thay đổi các thông tin cá nhân và sức khỏe.

Khi các thông tin ảnh hưởng đến tính toán dinh dưỡng thay đổi, hệ thống phải tính toán lại các chỉ số liên quan.

Ví dụ:

```text
Weight thay đổi
        ↓
BMI thay đổi
        ↓
BMR có thể thay đổi
        ↓
TDEE thay đổi
        ↓
Calorie Target thay đổi
        ↓
Macro Target được cập nhật
```

---

# 4. Authentication

## BR-010 — Đăng ký

Người dùng có thể tạo tài khoản bằng:

* Email/Username + Password.
* Google Sign-In.

Nếu hệ thống yêu cầu xác minh:

```text
Register
   ↓
OTP Verification
   ↓
Account Activated
```

Tài khoản chưa hoàn tất bước xác minh sẽ không được xem là tài khoản hoạt động đầy đủ.

---

## BR-011 — Email phải duy nhất

Một email chỉ được liên kết với một tài khoản SmartMeal.

---

## BR-012 — Google Account

Một Google Account chỉ được liên kết với một tài khoản SmartMeal tương ứng.

---

## BR-013 — Đăng nhập

Người dùng chỉ được đăng nhập khi:

* Tài khoản tồn tại.
* Thông tin xác thực hợp lệ.
* Tài khoản không bị khóa.

---

## BR-014 — Session

Sau khi đăng nhập thành công, hệ thống cấp session/token để xác thực các request cần đăng nhập.

Khi token hết hạn, người dùng phải thực hiện cơ chế refresh hoặc đăng nhập lại tùy thiết kế hệ thống.

---

# 5. Health Profile

## BR-020 — Hoàn thành Health Profile

Người dùng nên hoàn thành thông tin sức khỏe trước khi sử dụng các tính năng cá nhân hóa.

Thông tin tối thiểu để tính toán dinh dưỡng có thể gồm:

* Tuổi.
* Giới tính.
* Chiều cao.
* Cân nặng.
* Mức độ vận động.
* Mục tiêu.

---

## BR-021 — BMI

BMI được tính dựa trên:

```text
BMI = Weight / Height²
```

Trong đó:

* Weight tính bằng kg.
* Height tính bằng mét.

BMI chỉ là chỉ số tham khảo và không được xem là chẩn đoán y khoa.

---

## BR-022 — BMR

BMR được tính dựa trên thông tin cơ thể của người dùng theo công thức được hệ thống lựa chọn.

Công thức phải được thống nhất giữa Mobile và Backend.

Không để mỗi nền tảng tự sử dụng một công thức khác nhau.

---

## BR-023 — TDEE

TDEE được xác định dựa trên:

```text
TDEE = BMR × Activity Factor
```

Activity Factor phụ thuộc vào mức độ vận động của người dùng.

---

## BR-024 — Calorie Target

Calorie Target được xác định dựa trên:

* TDEE.
* Mục tiêu người dùng.

Ví dụ:

```text
Weight Loss
→ Calorie Target thấp hơn TDEE

Maintenance
→ Calorie Target xấp xỉ TDEE

Weight Gain
→ Calorie Target cao hơn TDEE
```

Giá trị cụ thể phải được thống nhất trong hệ thống.

---

# 6. Macro Nutrition

## BR-030 — Macro Target

Hệ thống có thể xác định mục tiêu:

* Protein.
* Carbohydrate.
* Fat.

Macro Target phải phù hợp với Calorie Target và chế độ ăn của người dùng.

---

## BR-031 — Daily Nutrition Target

Mỗi ngày người dùng có một mục tiêu dinh dưỡng.

Ví dụ:

```text
Calories
Protein
Carbs
Fat
Water
```

Mục tiêu có thể được tính lại khi Health Profile thay đổi.

---

# 7. Dynamic Calorie Budget

## BR-040 — Calorie Budget cơ bản

Calorie Budget ban đầu dựa trên Calorie Target.

Ví dụ:

```text
Daily Target = 2,000 kcal

Food consumed = 1,200 kcal

Remaining = 800 kcal
```

---

## BR-041 — Active Calories

Nếu Health Integration cung cấp Active Calories, hệ thống có thể sử dụng dữ liệu này để điều chỉnh ngân sách calo.

Khái niệm:

```text
Adjusted Budget
=
Base Calorie Target
+
Eligible Active Calories
```

Hệ thống phải tránh cộng trùng dữ liệu vận động.

---

## BR-042 — Không được tính trùng Active Calories

Nếu cùng một khoảng thời gian có dữ liệu từ nhiều nguồn:

```text
Apple Health
Health Connect
Smartwatch
```

hệ thống phải xác định nguồn dữ liệu hợp lệ hoặc cơ chế ưu tiên để tránh cộng cùng một hoạt động nhiều lần.

---

# 8. Nutrition Diary

## BR-050 — Mỗi Meal Log thuộc về một User

Một bản ghi dinh dưỡng phải xác định:

* User.
* Ngày.
* Bữa ăn.
* Food/Recipe.
* Khối lượng hoặc serving.
* Nutrition information.

---

## BR-051 — Loại bữa ăn

Hệ thống hỗ trợ tối thiểu:

* Breakfast.
* Lunch.
* Dinner.
* Snack.

Có thể mở rộng thêm loại bữa ăn trong tương lai.

---

## BR-052 — Ghi nhận thủ công

Người dùng có thể:

1. Tìm món ăn/thực phẩm.
2. Chọn serving.
3. Điều chỉnh khối lượng.
4. Xác nhận.
5. Lưu vào nhật ký.

---

## BR-053 — Người dùng có thể chỉnh sửa

Sau khi tạo Meal Log, người dùng có thể:

* Chỉnh sửa.
* Thay đổi serving.
* Thay đổi thời gian.
* Xóa bản ghi.

---

## BR-054 — Không được tự động lưu AI Result

Kết quả AI không được mặc định trở thành dữ liệu chính thức.

Flow:

```text
AI Analysis
     ↓
Detected Food
     ↓
Estimated Nutrition
     ↓
User Review
     ↓
User Confirm
     ↓
Nutrition Diary
```

---

# 9. AI Snap & Track

## BR-060 — AI Food Recognition

Người dùng có thể chụp ảnh món ăn.

AI có thể nhận diện:

* Tên món.
* Thành phần có thể nhận biết.
* Khẩu phần ước tính.
* Calories ước tính.
* Protein.
* Carbs.
* Fat.

---

## BR-061 — AI Result là Estimate

Kết quả AI phải được đánh dấu là:

```text
Estimated
```

hoặc tương đương.

Không được trình bày kết quả AI như một phép đo chính xác tuyệt đối.

---

## BR-062 — User Confirmation

Người dùng phải có khả năng:

* Xác nhận.
* Chỉnh sửa món ăn.
* Chỉnh sửa khối lượng.
* Xóa món AI nhận diện sai.
* Thêm món AI bỏ sót.

---

# 10. AI Voice Logging

## BR-070 — Natural Language Input

Người dùng có thể nói mô tả bữa ăn tự nhiên.

Ví dụ:

```text
"Sáng nay tôi ăn một tô bún bò và uống một ly nước cam."
```

AI sẽ chuyển thành các thành phần có cấu trúc.

Ví dụ:

```text
Breakfast
- Bún bò
- Nước cam
```

---

## BR-071 — Voice Result phải được Review

AI không được tự động lưu kết quả nếu chưa có bước xác nhận của người dùng.

---

## BR-072 — Không hiểu được dữ liệu

Nếu AI không chắc chắn về món ăn hoặc khối lượng:

```text
AI → Ask User / Require Confirmation
```

Không tự ý đưa ra dữ liệu có độ tin cậy thấp mà không thông báo.

---

# 11. Fridge Scanner

## BR-080 — Scan Ingredients

Người dùng chụp ảnh tủ lạnh/nguyên liệu.

AI xác định các nguyên liệu có khả năng xuất hiện trong ảnh.

---

## BR-081 — Ingredient Detection

Kết quả có thể bao gồm:

```text
Ingredient
Confidence
Estimated Quantity
```

---

## BR-082 — User Confirmation

Người dùng có thể:

* Xác nhận nguyên liệu.
* Xóa nguyên liệu sai.
* Thêm nguyên liệu còn thiếu.
* Chỉnh sửa số lượng.

---

## BR-083 — Recipe Recommendation

Sau khi xác nhận nguyên liệu, hệ thống đề xuất các món có thể nấu.

Món ăn phải ưu tiên:

1. Sử dụng nguyên liệu đang có.
2. Phù hợp mục tiêu dinh dưỡng.
3. Không chứa chất gây dị ứng.
4. Phù hợp chế độ ăn.
5. Phù hợp các giới hạn sức khỏe đã khai báo.

---

# 12. Food & Recipe

## BR-090 — Food Database

Mỗi food item có thể có:

* Name.
* Category.
* Serving Unit.
* Calories.
* Protein.
* Carbs.
* Fat.
* Other nutrition information.

---

## BR-091 — Recipe

Một Recipe có thể bao gồm:

* Tên món.
* Hình ảnh.
* Thời gian nấu.
* Độ khó.
* Ingredients.
* Instructions.
* Nutrition.
* Tags.
* Dietary information.

---

## BR-092 — Recipe Nutrition

Nutrition của recipe phải được xác định theo serving.

Ví dụ:

```text
Recipe: Chicken Salad

Total recipe:
1,200 kcal

Servings:
4

Per serving:
300 kcal
```

---

# 13. Dietary Restrictions

## BR-100 — Dietary Preference

Người dùng có thể lựa chọn:

* Eat Clean.
* Keto.
* Low-Carb.
* Vegan.
* Vegetarian.
* Các chế độ khác được hệ thống hỗ trợ.

---

## BR-101 — Allergy

Người dùng có thể khai báo dị ứng.

Ví dụ:

* Hải sản.
* Đậu phộng.
* Sữa.
* Trứng.
* Gluten.

---

## BR-102 — Allergy là Constraint bắt buộc

Nếu một món chứa thành phần nằm trong danh sách dị ứng của người dùng, món đó không được xem là lựa chọn an toàn.

Hệ thống phải:

* Loại khỏi đề xuất; hoặc
* Hiển thị cảnh báo rõ ràng.

Không được coi món có chất gây dị ứng là một đề xuất bình thường.

---

# 14. Disease / Health Restriction

## BR-110 — Health Conditions

Người dùng có thể khai báo các tình trạng sức khỏe được hệ thống hỗ trợ.

Ví dụ:

* Diabetes.
* Gout.
* High Blood Pressure.

---

## BR-111 — Health-based Recommendation

Các tình trạng sức khỏe được sử dụng như một **constraint** khi đề xuất món ăn.

Ví dụ:

```text
Health Profile
      ↓
Disease / Allergy
      ↓
Recipe Filtering
      ↓
Safe Candidate Recipes
      ↓
Recommendation
```

---

## BR-112 — Không thay thế tư vấn y tế

SmartMeal chỉ cung cấp thông tin và gợi ý dựa trên dữ liệu đã khai báo.

Hệ thống không được tuyên bố:

* Chẩn đoán bệnh.
* Chữa bệnh.
* Thay thế bác sĩ.
* Đảm bảo một món ăn phù hợp tuyệt đối về mặt y khoa.

---

# 15. Barcode Scanner

## BR-120 — Barcode

Người dùng có thể quét barcode của sản phẩm thực phẩm.

Nếu sản phẩm tồn tại:

```text
Barcode
↓
Product
↓
Nutrition Information
```

---

## BR-121 — Product Not Found

Nếu barcode không tồn tại trong database:

Người dùng có thể:

* Nhập thủ công.
* Sử dụng OCR.
* Bỏ qua.

Không được tự tạo dữ liệu sản phẩm không có căn cứ.

---

# 16. OCR Nutrition Scanner

## BR-130 — Nutrition Label OCR

Người dùng có thể chụp bảng Nutrition Facts.

OCR có thể nhận diện:

* Calories.
* Protein.
* Carbohydrates.
* Fat.
* Sugar.
* Sodium.
* Serving Size.

---

## BR-131 — OCR Result

OCR result phải được hiển thị cho người dùng kiểm tra trước khi lưu.

---

## BR-132 — OCR không chắc chắn

Nếu dữ liệu OCR không rõ ràng:

```text
OCR
 ↓
Low Confidence
 ↓
User Review
```

Không được âm thầm lưu dữ liệu sai.

---

# 17. Smart Safety Alert

## BR-140 — Allergy Alert

Khi người dùng quét sản phẩm, hệ thống phải kiểm tra:

```text
Product Ingredients
        ↓
User Allergies
        ↓
Match?
        ↓
Warning
```

Nếu phát hiện thành phần có khả năng gây dị ứng, phải hiển thị cảnh báo.

---

## BR-141 — Nutrition Warning

Hệ thống có thể cảnh báo nếu sản phẩm có:

* Sugar cao.
* Sodium cao.
* Calories cao.
* Các chỉ số khác vượt ngưỡng do hệ thống cấu hình.

Các cảnh báo phải được hiểu là **cảnh báo dinh dưỡng**, không phải chẩn đoán y khoa.

---

# 18. Favorites & Collections

## BR-150 — Favorite

Người dùng có thể thêm/xóa Recipe khỏi Favorites.

Một Recipe không được xuất hiện nhiều lần trong Favorites của cùng User.

---

## BR-151 — Collection

Người dùng có thể tạo Collection.

Ví dụ:

```text
Bữa sáng nhanh
Món giảm cân
Món cuối tuần
```

---

## BR-152 — Collection Ownership

Collection thuộc về User tạo nó.

Người dùng chỉ có quyền chỉnh sửa/xóa Collection của chính mình.

---

# 19. Meal Planner

## BR-160 — Weekly Meal Plan

Người dùng có thể lập kế hoạch:

* Breakfast.
* Lunch.
* Dinner.
* Snack.

cho từng ngày trong tuần.

---

## BR-161 — Nutrition Target

Meal Planner nên ưu tiên thực đơn phù hợp:

```text
Calorie Target
Protein Target
Carbs Target
Fat Target
Dietary Preference
Allergy
Health Restrictions
```

---

## BR-162 — Meal Conflict

Một Meal Plan không được tạo ra món ăn chứa thành phần nằm trong danh sách dị ứng của người dùng.

---

## BR-163 — User Override

Người dùng có quyền thay đổi món được AI/hệ thống đề xuất.

Việc thay đổi của người dùng không được tự động bị ghi đè nếu hệ thống chưa được yêu cầu regenerate.

---

# 20. Smart Grocery List

## BR-170 — Generate Grocery List

Grocery List có thể được tạo từ Meal Plan.

Flow:

```text
Weekly Meal Plan
       ↓
Recipe Ingredients
       ↓
Aggregate Ingredients
       ↓
Grocery List
```

---

## BR-171 — Aggregate Ingredients

Nếu nhiều món cùng sử dụng một nguyên liệu, hệ thống cộng dồn số lượng.

Ví dụ:

```text
Chicken
Recipe A: 200g
Recipe B: 300g

Total: 500g
```

---

## BR-172 — Category

Nguyên liệu được nhóm theo category.

Ví dụ:

```text
Rau củ
Thịt cá
Sữa
Ngũ cốc
Gia vị
Đồ khô
```

---

## BR-173 — Check-off

Người dùng có thể đánh dấu nguyên liệu đã mua.

Trạng thái:

```text
Pending
Purchased
```

---

## BR-174 — Estimated Cost

Hệ thống có thể tính:

```text
Estimated Cost
=
Σ Ingredient Quantity × Average Price
```

Đây chỉ là chi phí ước tính, không phải giá bán thực tế tại mọi cửa hàng.

---

# 21. Health Connect / Apple Health

## BR-180 — Health Permission

Người dùng phải cấp quyền trước khi SmartMeal đọc dữ liệu sức khỏe từ thiết bị.

---

## BR-181 — Health Data

SmartMeal có thể sử dụng:

* Steps.
* Distance.
* Active Calories.

theo quyền được cấp.

---

## BR-182 — Permission Denied

Nếu người dùng từ chối quyền:

* Ứng dụng vẫn phải hoạt động với các tính năng không cần Health Data.
* Không được giả lập dữ liệu thiết bị.

---

## BR-183 — Health Data Sync

Dữ liệu Health có thể được đồng bộ định kỳ.

Hệ thống phải tránh tạo duplicate record cho cùng một dữ liệu.

---

# 22. Dashboard

## BR-190 — Dashboard Daily Summary

Dashboard hiển thị tổng quan:

* Calories consumed.
* Calories remaining.
* Protein.
* Carbs.
* Fat.
* Water nếu có.
* Activity.
* Pet status.

---

## BR-191 — Nutrition Calculation

Dashboard được tính dựa trên các Meal Logs đã được xác nhận.

Không sử dụng bản ghi AI chưa được xác nhận để tính số liệu chính thức.

---

# 23. Gamification

## BR-200 — Pet

Mỗi User có thể có một Health Pet.

Pet phản ánh hành vi tích cực của người dùng.

Ví dụ:

* Hoàn thành mục tiêu calorie.
* Đạt protein target.
* Uống đủ nước.
* Duy trì streak.
* Hoàn thành challenge.

---

## BR-201 — Pet Progress

Pet có thể có:

```text
XP
Level
Mood / Status
Unlocked Items
```

---

## BR-202 — XP

XP chỉ được cộng khi người dùng hoàn thành một hành động hợp lệ.

Không cộng XP nhiều lần cho cùng một sự kiện nếu event đó chỉ được phép tính một lần.

---

## BR-203 — Streak

Streak biểu thị số ngày liên tiếp người dùng hoàn thành điều kiện streak.

Ví dụ:

```text
Day 1 → Completed
Day 2 → Completed
Day 3 → Completed

Streak = 3
```

---

## BR-204 — Streak

Hệ thống phải xác định rõ một ngày được xem là "completed" dựa trên các điều kiện đã cấu hình.

Không được tính streak chỉ vì người dùng mở ứng dụng.

---

# 24. Challenges

## BR-210 — Challenge

Challenge có:

* Name.
* Description.
* Start Date.
* End Date.
* Goal.
* Reward.
* Status.

---

## BR-211 — Join Challenge

User có thể tham gia Challenge nếu:

```text
Current Date >= Start Date
AND
Current Date <= End Date
```

và challenge cho phép người dùng tham gia.

---

## BR-212 — Challenge Completion

Challenge chỉ được hoàn thành khi đạt đủ điều kiện.

Khi hoàn thành:

```text
Challenge Completed
       ↓
Reward
       ↓
XP / Badge / Pet Reward
```

---

# 25. Notification

## BR-220 — Meal Reminder

Hệ thống có thể nhắc:

* Breakfast.
* Lunch.
* Dinner.
* Snack.

---

## BR-221 — Water Reminder

Hệ thống có thể nhắc uống nước theo lịch hoặc mục tiêu người dùng.

---

## BR-222 — Notification Permission

Nếu người dùng không cấp quyền notification, ứng dụng không được giả định rằng notification đã được gửi thành công.

---

# 26. Premium Membership

## BR-230 — Membership Status

User có thể có trạng thái:

```text
Free
Premium
Expired
Cancelled
```

---

## BR-231 — Premium Access

User chỉ được sử dụng tính năng Premium khi:

```text
Membership Status = Premium
AND
Current Date < Expiration Date
```

---

## BR-232 — Expired Subscription

Khi gói hết hạn:

```text
Premium
   ↓
Expired
   ↓
Free Access
```

Dữ liệu cũ của người dùng không bị xóa chỉ vì Premium hết hạn.

---

## BR-233 — AI Usage Limit

Nếu tài khoản Free bị giới hạn AI:

```text
AI Usage
   ↓
Check Limit
   ↓
Available?
   ├── Yes → Execute
   └── No  → Show Upgrade / Limit Message
```

---

# 27. Payment

## BR-240 — Subscription Purchase

Một giao dịch thanh toán phải có trạng thái.

Ví dụ:

```text
Pending
Success
Failed
Cancelled
Expired
```

---

## BR-241 — Không kích hoạt Premium khi Payment chưa thành công

Chỉ giao dịch được xác nhận thành công mới có thể kích hoạt Premium.

Không kích hoạt Premium dựa trên:

* Client callback không đáng tin cậy.
* Screenshot thanh toán.
* User tự khai báo đã thanh toán.

---

## BR-242 — Payment Verification

Backend phải là nơi xác định trạng thái giao dịch cuối cùng.

---

# 28. AI General Rules

## BR-250 — AI không phải nguồn dữ liệu tuyệt đối

AI có thể sai.

Các kết quả AI liên quan đến:

* Food recognition.
* Portion estimation.
* Nutrition estimation.
* Recipe recommendation.
* Voice parsing.
* Fridge scanning.

phải được xem là kết quả hỗ trợ.

---

## BR-251 — Human Confirmation

Đối với dữ liệu ảnh hưởng trực tiếp đến Nutrition Diary, người dùng phải có khả năng review và chỉnh sửa.

---

## BR-252 — AI Failure

Nếu AI không thể xử lý:

```text
AI Failed
↓
Thông báo lỗi thân thiện
↓
Cho phép Manual Input
```

Ứng dụng không được chặn hoàn toàn chức năng ghi nhật ký chỉ vì AI thất bại.

---

# 29. Data Consistency

## BR-260 — Backend là nguồn dữ liệu chính

Đối với dữ liệu đồng bộ online:

```text
Backend
    ↓
Source of Truth
```

Mobile local storage chỉ dùng cho:

* Cache.
* Offline data.
* Temporary state.
* User preferences.

---

## BR-261 — Offline Sync

Khi offline, người dùng có thể thực hiện các thao tác được hỗ trợ offline.

Khi có mạng trở lại:

```text
Local Changes
     ↓
Sync Queue
     ↓
Backend
     ↓
Sync Result
```

---

## BR-262 — Duplicate Prevention

Một thao tác không được tạo duplicate record chỉ vì:

* Retry request.
* Network timeout.
* App restart.
* Offline sync.

---

# 30. Data Ownership

## BR-270 — User Data Isolation

User A không được đọc hoặc chỉnh sửa dữ liệu riêng tư của User B.

Các dữ liệu cần bảo vệ gồm:

* Nutrition Diary.
* Health Profile.
* Weight History.
* Meal Plan.
* Grocery List.
* Favorites.
* Collections.
* Gamification Progress.
* Premium Membership.

---

## BR-271 — Delete Data

Khi người dùng xóa dữ liệu cá nhân, hệ thống phải xác định rõ:

* Dữ liệu nào bị xóa.
* Dữ liệu nào được giữ lại vì yêu cầu hệ thống.
* Dữ liệu nào được anonymize.

Không được tự ý xóa dữ liệu liên quan khác.

---

# 31. Search & Recommendation

## BR-280 — Search

Recipe/Food search có thể hỗ trợ:

* Keyword.
* Category.
* Cooking Time.
* Calories.
* Dietary Type.

---

## BR-281 — Recommendation Priority

Recommendation có thể ưu tiên theo thứ tự logic:

```text
Safety Constraints
        ↓
Dietary Restrictions
        ↓
Health Constraints
        ↓
Nutrition Goal
        ↓
Available Ingredients
        ↓
User Preference
        ↓
General Recommendation
```

**Safety constraints luôn được ưu tiên trước preference.**

---

# 32. Recipe Safety

## BR-290 — Allergy Safety

Nếu Recipe chứa ingredient nằm trong Allergy Profile:

```text
Recipe
  ↓
Allergy Check
  ↓
Conflict
  ↓
Unsafe / Warning
```

---

## BR-291 — Unknown Ingredients

Nếu hệ thống không xác định được thành phần hoặc ingredient information không đầy đủ, hệ thống không được khẳng định rằng recipe "an toàn tuyệt đối".

---

# 33. Dashboard Pet Status

Pet có thể phản ánh trạng thái tổng quan của ngày.

Ví dụ:

```text
Good Day
→ Nutrition goals mostly completed

Needs Attention
→ Nutrition significantly incomplete

Active
→ User has sufficient physical activity

Hydration Needed
→ Water target is incomplete
```

Các trạng thái này chỉ mang tính gamification và hỗ trợ trải nghiệm, không phải đánh giá y tế.

---

# 34. Business Flow tổng quát

## 34.1. First-time User

```text
Open App
    ↓
Register / Login
    ↓
Health Profile
    ↓
Calculate BMI / BMR / TDEE
    ↓
Calculate Nutrition Targets
    ↓
Dashboard
```

---

## 34.2. Daily Nutrition Flow

```text
Dashboard
    ↓
Quick Log
    ↓
Choose Input Method
    ├── Manual
    ├── AI Photo
    └── Voice
          ↓
      Analyze
          ↓
      User Review
          ↓
      Confirm
          ↓
      Nutrition Diary
          ↓
      Update Dashboard
          ↓
      Update Gamification
```

---

## 34.3. Smart Meal Flow

```text
User Goal
    ↓
Health Profile
    ↓
Allergy / Disease Constraints
    ↓
Available Ingredients
    ↓
Recipe Filtering
    ↓
Recipe Recommendation
    ↓
User Selection
    ↓
Meal Plan
```

---

## 34.4. Smart Grocery Flow

```text
Meal Plan
    ↓
Extract Ingredients
    ↓
Merge Duplicate Ingredients
    ↓
Group by Category
    ↓
Estimate Cost
    ↓
Grocery List
    ↓
Check Items
```

---

## 34.5. Product Scanner Flow

```text
Barcode / OCR
      ↓
Product Information
      ↓
Nutrition Data
      ↓
Allergy Check
      ↓
Health Constraint Check
      ↓
Safety Alert
```

---

# 35. Business Priority

Khi có xung đột giữa các hệ thống recommendation, thứ tự ưu tiên nghiệp vụ là:

```text
1. Safety / Allergy
2. Health Restrictions
3. User Nutrition Goal
4. Dietary Preference
5. Available Ingredients
6. User Preference
7. General Recommendation
```

Không được ưu tiên sở thích cá nhân cao hơn một constraint an toàn đã được người dùng khai báo.

---

# 36. MVP Scope

Do SmartMeal là dự án môn học, các tính năng nên được triển khai theo mức độ ưu tiên.

## Core MVP

* Authentication.
* User Profile.
* Health Profile.
* BMI / BMR / TDEE.
* Nutrition Diary.
* Manual Food Logging.
* Dashboard.
* Recipe Search.
* Recipe Detail.
* Favorites.
* Meal Planner.
* Grocery List.
* Basic Gamification.

## AI Features

* AI Snap & Track.
* AI Voice Logging.
* Fridge Scanner.

## Smart Scanner

* Barcode Scanner.
* OCR Nutrition Scanner.
* Safety Alert.

## Health Integration

* Health Connect.
* Apple Health.

## Premium

* Membership.
* AI Usage Limit.
* Payment.

---

# 37. Rule khi mở rộng hệ thống

Khi thêm tính năng mới:

### Bước 1

Xác định nghiệp vụ mới.

### Bước 2

Kiểm tra nghiệp vụ có trùng với Business Rule hiện tại không.

### Bước 3

Nếu có:

```text
Reuse Existing Rule
```

Không tạo rule mới có cùng ý nghĩa.

### Bước 4

Nếu cần thay đổi rule hiện tại:

* Ghi rõ Rule ID bị ảnh hưởng.
* Ghi rõ lý do.
* Kiểm tra ảnh hưởng tới Mobile.
* Kiểm tra ảnh hưởng tới Backend.
* Kiểm tra ảnh hưởng tới Database.
* Kiểm tra ảnh hưởng tới AI.

### Bước 5

Chỉ triển khai sau khi Business Rule đã được thống nhất.

---

# 38. Rule ID Convention

Mỗi Business Rule sử dụng format:

```text
BR-XXX
```

Ví dụ:

```text
BR-001
BR-002
BR-010
BR-050
BR-230
```

Không được reuse một Rule ID cho nghiệp vụ khác.

Khi xóa một rule cũ, ID đó không được tái sử dụng cho rule mới.

---

# 39. Nguyên tắc quan trọng nhất

SmartMeal phải tuân thủ 5 nguyên tắc cốt lõi:

### 1. Safety First

Dị ứng và các giới hạn sức khỏe được ưu tiên trước sở thích.

### 2. User Confirmation

Dữ liệu AI quan trọng phải được người dùng xác nhận trước khi trở thành dữ liệu chính thức.

### 3. Backend Source of Truth

Backend là nguồn dữ liệu chính cho dữ liệu online.

### 4. No Silent Data Changes

Hệ thống không được âm thầm thay đổi dữ liệu người dùng hoặc kết quả đã xác nhận.

### 5. Business Rule Before Implementation

Không triển khai một nghiệp vụ mới chỉ dựa trên UI hoặc ý tưởng code.

Phải xác định Business Rule trước.

---

# 40. Tóm tắt kiến trúc nghiệp vụ

```text
                         SMARTMEAL
                             │
             ┌───────────────┴───────────────┐
             │                               │
       USER & HEALTH                    FOOD & MEAL
             │                               │
      Health Profile                  Food Database
      BMI / BMR / TDEE                Recipe
      Calorie Target                  Meal Planner
      Macro Target                    Grocery List
      Allergy / Disease
             │                               │
             └───────────────┬───────────────┘
                             │
                       SMART ENGINE
                             │
          ┌──────────────────┼──────────────────┐
          │                  │                  │
        AI Vision          AI Voice          OCR / Barcode
          │                  │                  │
          └──────────────────┼──────────────────┘
                             │
                      RECOMMENDATION
                             │
                  ┌──────────┴──────────┐
                  │                     │
             Safety Check          User Preference
                  │                     │
                  └──────────┬──────────┘
                             │
                        USER RESULT
                             │
            ┌────────────────┼────────────────┐
            │                │                │
        Dashboard       Gamification      Health Sync
            │                │                │
            └────────────────┼────────────────┘
                             │
                         PREMIUM
                             │
                      AI / Advanced
                        Features
```

---

# 41. Source of Truth Hierarchy

Khi các thành phần trong hệ thống có dữ liệu khác nhau, áp dụng thứ tự:

```text
1. Confirmed User Data
2. Backend Stored Data
3. Verified Food Database
4. External Health Data
5. AI Estimated Data
6. Temporary Local Cache
```

AI Estimate không được ghi đè dữ liệu người dùng đã xác nhận nếu chưa có hành động xác nhận mới.

---

# 42. Kết luận

Business Rules của SmartMeal được xây dựng để đảm bảo:

* Mobile và Backend hiểu cùng một nghiệp vụ.
* AI không tự ý quyết định dữ liệu cuối cùng.
* Dữ liệu sức khỏe được sử dụng đúng mục đích.
* Allergy và health constraints được ưu tiên.
* Nutrition Diary có dữ liệu nhất quán.
* Meal Planner và Grocery List liên kết với nhau.
* Gamification dựa trên hành vi thực tế.
* Premium kiểm soát quyền truy cập rõ ràng.
* Offline không làm mất hoặc nhân đôi dữ liệu.
* Hệ thống có thể mở rộng mà không phá vỡ nghiệp vụ hiện tại.

> **Business Rule là nền tảng. Mọi implementation về sau phải tuân thủ tài liệu này hoặc cập nhật tài liệu trước khi thay đổi nghiệp vụ.**
