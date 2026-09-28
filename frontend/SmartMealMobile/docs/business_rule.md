# SmartMeal — Business Rules

> **Project:** SmartMeal  
> **Version:** V2.1  
> **Purpose:** Business Rules & Business Logic Specification  
> **Project Type:** PRM — Mobile Programming, FPT University  
> **Primary Tech Stack:** React Native (Mobile), ASP.NET Core (Backend), PostgreSQL (Database)  
> **Primary Goal:** Hỗ trợ người dùng theo dõi dinh dưỡng, quản lý sức khỏe, lập thực đơn và mua sắm thực phẩm thông minh.

---

## 1. Mục đích tài liệu

Tài liệu này định nghĩa các **quy tắc nghiệp vụ chính** của SmartMeal.

Business Rule là nguồn tham chiếu chung cho:
* Mobile Application (React Native)
* Backend API (.NET Core)
* Database (PostgreSQL)
* AI Services
* Authentication
* Premium Membership
* Notification

Mọi tính năng được triển khai phải tuân thủ các quy tắc trong tài liệu này.

### Nguyên tắc
1. Không tự ý thay đổi nghiệp vụ khi triển khai UI hoặc API.
2. Một nghiệp vụ chỉ được định nghĩa một lần.
3. Frontend không được tự quyết định các quy tắc quan trọng thuộc về backend.
4. AI chỉ đưa ra kết quả **ước tính/gợi ý**, không được mặc định xem là dữ liệu chính xác tuyệt đối.
5. Dữ liệu sức khỏe và dị ứng của người dùng phải được ưu tiên khi đưa ra đề xuất.
6. Người dùng luôn có quyền chỉnh sửa hoặc xác nhận dữ liệu do AI tạo ra trước khi lưu chính thức.
7. Tính năng Premium chỉ được sử dụng khi tài khoản đáp ứng điều kiện Premium tương ứng.

---

## 2. Đối tượng sử dụng

### 2.1. Guest
Người chưa đăng nhập.
* **Có thể:** Xem một phần nội dung công khai, khám phá công thức, xem giới thiệu ứng dụng, đăng ký/đăng nhập.
* **Không thể:** Lưu nhật ký dinh dưỡng, lưu công thức cá nhân, theo dõi tiến độ cá nhân, sử dụng dữ liệu sức khỏe cá nhân hóa, dùng tính năng Premium.

### 2.2. Free User
Người dùng đã đăng ký tài khoản nhưng chưa nâng cấp Premium.
* **Có thể:** Quản lý hồ sơ, theo dõi dinh dưỡng, ghi nhật ký thủ công, xem/lưu công thức, lập thực đơn, quản lý danh sách mua sắm (grocery list).
* **Giới hạn:** Các tính năng AI/Premium bị giới hạn số lượt sử dụng.

### 2.3. Premium User
Người dùng đang có gói Premium còn hiệu lực.
* **Có thể:** AI Snap & Track nâng cao, Fridge Scanner, AI meal recommendation nâng cao, phân tích sức khỏe chuyên sâu, không giới hạn lượt dùng AI (tùy gói).

---

## 3. Nguyên tắc dữ liệu người dùng

* **BR-001 — Mỗi tài khoản có một hồ sơ người dùng:** Hồ sơ gồm họ tên, avatar, ngày sinh, giới tính, chiều cao, cân nặng, mục tiêu cân nặng, mức độ vận động, chế độ ăn, dị ứng, bệnh lý, mục tiêu dinh dưỡng.
* **BR-002 — Dữ liệu sức khỏe là dữ liệu cá nhân:** Cân nặng, bệnh lý, dị ứng, BMI, BMR, TDEE, Calorie/Macro target phải thuộc sở hữu cá nhân và bảo mật.
* **BR-003 — Cập nhật hồ sơ:** Khi các thông tin ảnh hưởng đến dinh dưỡng thay đổi (ví dụ: Cân nặng), hệ thống phải tự động tính toán lại BMI $\rightarrow$ BMR $\rightarrow$ TDEE $\rightarrow$ Calorie Target $\rightarrow$ Macro Target.

---

## 4. Authentication

* **BR-010 — Đăng ký:** Hỗ trợ Email/Password + OTP Verification hoặc Google Sign-In.
* **BR-011 — Email duy nhất:** Một email chỉ liên kết với một tài khoản SmartMeal.
* **BR-012 — Google Account:** Một Google Account chỉ liên kết với một tài khoản SmartMeal.
* **BR-013 — Đăng nhập:** Yêu cầu tài khoản tồn tại, đúng thông tin xác thực và không bị khóa.
* **BR-014 — Session Management:** Cấp Access/Refresh Token sau khi đăng nhập thành công.

---

## 5. Health Profile & Nutrition Targets

* **BR-020 — Hoàn thành Health Profile:** Người dùng cần cung cấp đủ thông tin (tuổi, giới tính, chiều cao, cân nặng, vận động, mục tiêu) để tính toán chỉ số.
* **BR-021 — BMI:** $\text{BMI} = \frac{\text{Weight (kg)}}{\text{Height (m)}^2}$ (chỉ mang tính tham khảo).
* **BR-022 — BMR:** Áp dụng công thức thống nhất giữa React Native App và Backend API.
* **BR-023 — TDEE:** $\text{TDEE} = \text{BMR} \times \text{Activity Factor}$.
* **BR-024 — Calorie Target:** Tính toán dựa trên TDEE và mục tiêu (Giảm cân / Giữ cân / Tăng cân).
* **BR-030 — Macro Target:** Xác định tỉ lệ Protein, Carbohydrate, Fat phù hợp với Calorie Target.
* **BR-031 — Daily Target:** Thiết lập mục tiêu hàng ngày về Calorie, Protein, Carbs, Fat, Water.

---

## 6. Nutrition Diary (Nhật ký dinh dưỡng)

* **BR-050 — Cấu trúc Meal Log:** Bản ghi gồm User, Ngày, Bữa ăn, Thực phẩm/Recipe, Khối lượng/Serving, Thông tin dinh dưỡng.
* **BR-051 — Loại bữa ăn:** Hỗ trợ tối thiểu 4 bữa: Breakfast, Lunch, Dinner, Snack.
* **BR-052 — Ghi nhận thủ công:** Tìm kiếm $\rightarrow$ Chọn serving/khối lượng $\rightarrow$ Xác nhận $\rightarrow$ Lưu nhật ký.
* **BR-053 — Quyền chỉnh sửa:** Người dùng được phép sửa khối lượng, thời gian hoặc xóa bản ghi đã tạo.
* **BR-054 — Luồng xác nhận AI:** Dữ liệu do AI nhận diện KHÔNG ĐƯỢC tự động lưu. Phải qua luồng: `AI Analysis` $\rightarrow$ `User Review` $\rightarrow$ `User Confirm` $\rightarrow$ `Save to Diary`.

---

## 7. Smart AI & Scanner Features

* **BR-060 — AI Snap & Track:** Chụp ảnh món ăn $\rightarrow$ AI ước tính tên món, khẩu phần, Calories, Protein, Carbs, Fat.
* **BR-061 — Nhãn AI Estimate:** Mọi kết quả từ AI phải hiển thị rõ nhãn "Ước tính / Estimated".
* **BR-070 — AI Voice Logging:** Cho phép nhập bằng giọng nói/ngôn ngữ tự nhiên (VD: *"Sáng nay tôi ăn một tô phở bò"*), AI tự bóc tách thành món ăn và lưu dạng nháp để người dùng review.
* **BR-080 — Fridge Scanner:** Chụp ảnh tủ lạnh $\rightarrow$ AI nhận diện các nguyên liệu hiện có $\rightarrow$ Đề xuất công thức phù hợp (không chứa chất gây dị ứng, đúng mục tiêu calo).
* **BR-120 — Barcode Scanner:** Quét mã vạch sản phẩm để lấy thông tin dinh dưỡng từ database. Nếu chưa có, cho phép người dùng nhập thủ công hoặc dùng OCR.
* **BR-130 — OCR Nutrition Label:** Chụp nhãn Nutrition Facts $\rightarrow$ OCR bóc tách Calo, Đường, Muối, Protein, Fat $\rightarrow$ Hiển thị cho người dùng kiểm tra trước khi lưu.
* **BR-140 — Smart Safety Alert:** Cảnh báo ngay lập tức nếu sản phẩm quét chứa thành phần thuộc danh sách dị ứng hoặc vượt ngưỡng Calo/Đường/Muối được cấu hình.

---

## 8. Food, Recipe & Dietary Restrictions

* **BR-090 — Food & Recipe Database:** Lưu trữ chi tiết thông tin dinh dưỡng theo khẩu phần (serving size).
* **BR-100 — Dietary Preference:** Hỗ trợ Eat Clean, Keto, Low-Carb, Vegan, Vegetarian,...
* **BR-101 & BR-102 — Allergy Constraint (Bắt buộc):** Nếu món ăn chứa thành phần gây dị ứng của người dùng, hệ thống **bắt buộc loại bỏ khỏi đề xuất** hoặc cảnh báo nghiêm ngặt.
* **BR-110 & BR-111 — Health Conditions:** Hỗ trợ giới hạn thực phẩm cho người có bệnh lý (Tiểu đường, Gút, Cao huyết áp).
* **BR-112 — Tuyên bố miễn trừ trách nhiệm:** SmartMeal không thay thế chẩn đoán hoặc tư vấn y khoa từ bác sĩ.

---

## 9. Meal Planner & Smart Grocery List

* **BR-160 — Weekly Meal Plan:** Lên kế hoạch ăn uống từng bữa trong tuần dựa trên mục tiêu dinh dưỡng và ràng buộc an toàn.
* **BR-170 & BR-171 — Generate Grocery List:** Tự động gom nguyên liệu từ Meal Plan, cộng dồn số lượng nguyên liệu trùng lặp (VD: 200g + 300g thịt gà = 500g).
* **BR-172 & BR-173 — Phân loại & Check-off:** Nhóm nguyên liệu theo loại (Rau củ, Thịt cá, Gia vị,...); cho phép đánh dấu *Pending / Purchased*.
* **BR-174 — Chi phí ước tính:** Tính tổng chi phí dự kiến dựa trên giá trung bình của từng nguyên liệu.

---

## 10. Premium Membership & Payment

* **BR-230 & BR-231 — Membership Status:** Trạng thái bao gồm *Free, Premium, Expired, Cancelled*. Tính năng Premium chỉ mở khi status = `Premium` và còn hạn.
* **BR-232 — Hết hạn gói:** Khi hết hạn, tài khoản chuyển về `Free Access`. Dữ liệu cá nhân cũ vẫn được giữ nguyên.
* **BR-233 — Giới hạn AI:** Nếu dùng tài khoản Free, hệ thống kiểm tra quota sử dụng AI trước khi thực thi.
* **BR-241 & BR-242 — Payment Verification:** Chỉ xác thực nâng cấp Premium khi Backend xác nhận giao dịch thành công (Webhook/Server-to-Server). Không tin tưởng client-side callback.

---

## 11. Architecture & General Rules

* **BR-250 — AI không phải nguồn dữ liệu tuyệt đối:** Luôn yêu cầu kiểm tra từ con người (Human Confirmation).
* **BR-260 — Backend là Source of Truth:** Data trên Server là nguồn dữ liệu chuẩn nhất. Local Storage trên app React Native (AsyncStorage/MMKV) chỉ dùng lưu Cache, Preference hoặc Queue khi offline.
* **BR-261 — Offline Sync:** Khi có mạng lại, app đẩy danh sách thay đổi (Sync Queue) lên Backend để đồng bộ.
* **BR-270 — User Data Isolation:** Đảm bảo tính riêng tư, User A không thể xem hoặc sửa dữ liệu của User B.

---

## 12. Thứ tự ưu tiên nghiệp vụ (Business Priority)

Khi có xung đột giữa các gợi ý/đề xuất, hệ thống áp dụng thứ tự ưu tiên tuyệt đối:
$$\text{Safety / Allergy} \longrightarrow \text{Health Restrictions} \longrightarrow \text{Nutrition Goal} \longrightarrow \text{Dietary Preference} \longrightarrow \text{Available Ingredients} \longrightarrow \text{General Recommendation}$$

---

## 13. Phân chia phạm vi (MVP Scope)

### 🔹 Core MVP (Bắt buộc phải hoàn thành)
* **Auth:** Register, Login, OTP, Google Sign-In.
* **Profile & Health:** User Profile, Health Profile, Tính BMI/BMR/TDEE & Nutrition Target.
* **Diary:** Dashboard tổng quan, Ghi nhật ký bữa ăn thủ công (Manual Food Logging).
* **Recipe & Meal Plan:** Tìm kiếm công thức, Favorites, Lên thực đơn tuần, Tạo danh sách mua sắm (Grocery List).

### 🔹 AI & Smart Features Scope (Phát triển theo giai đoạn)
* **AI Features:** AI Snap & Track (nhận diện qua ảnh), AI Voice Logging, Fridge Scanner.
* **Smart Scanner:** Barcode Scanner, OCR Nutrition Scanner, Smart Safety Alert.
* **Monetization:** Subscription Purchase, Premium Access & AI Limits.