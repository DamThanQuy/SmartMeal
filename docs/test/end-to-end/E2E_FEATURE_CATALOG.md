# 📋 SmartMeal - Danh Mục Chức Năng & Kịch Bản Kiểm Thử E2E (E2E Feature Catalog)

> **Dự án**: SmartMeal - Ứng dụng Quản lý Dinh dưỡng & Lập Thực đơn Thông minh với AI  
> **Phiên bản tài liệu**: 1.0  
> **Ngày cập nhật**: 2026-10-28  
> **Thư mục lưu trữ**: `SmartMeal/docs/test/end-to-end/`  
> **Tài liệu tài khoản liên kết**: [accounts.md](../../../../docs/demo/accounts.md)

---

## 📑 Mục Lục
1. [Tổng Quan Hạ Tầng & Môi Trường Kiểm Thử](#1-tổng-quan-hạ-tầng--môi-trường-kiểm-thử)
2. [Bảng Ánh Xạ Tài Khoản Dữ Liệu Demo](#2-bảng-ánh-xạ-tài-khoản-dữ-liệu-demo)
3. [Quy Chuẩn Đánh Giá Mức Độ Ưu Tiên (Priority Criteria)](#3-quy-chuẩn-đánh-giá-mức-độ-ưu-tiên-priority-criteria)
4. [Chi Tiết 13 Module Chức Năng & Các Ca Kiểm Thử E2E](#4-chi-tiết-13-module-chức-năng--các-ca-kiểm-thử-e2e)
   * [Module 1: Xác thực & Phiên làm việc (Auth & Session)](#module-1-xác-thực--phiên-làm-việc-auth--session---10-screens)
   * [Module 2: Hồ sơ sức khỏe & Tính toán chỉ số sinh học (Health Profile)](#module-2-hồ-sơ-sức-khỏe--tính-toán-chỉ-số-sinh-học-health-profile---8-screens)
   * [Module 3: Trang chủ & Bảng tổng quan năng lượng (Dashboard)](#module-3-trang-chủ--bảng-tổng-quan-năng-lượng-dashboard---2-screens)
   * [Module 4: Nhật ký dinh dưỡng & Đồng bộ ngoại tuyến (Nutrition Diary)](#module-4-nhật-ký-dinh-dưỡng--đồng-bộ-ngoại-tuyến-nutrition-diary---7-screens)
   * [Module 5: Nhận diện thông minh bằng AI (AI Camera & Voice Log)](#module-5-nhận-diện-thông-minh-bằng-ai-ai-camera--voice-log---7-screens)
   * [Module 6: Quét mã vạch & Quét tủ lạnh thông minh (Scanner)](#module-6-quét-mã-vạch--quét-tủ-lạnh-thông-minh-scanner---7-screens)
   * [Module 7: Khám phá công thức & Bộ sưu tập món ăn (Recipes & Collections)](#module-7-khám-phá-công-thức--bộ-sưu-tập-món-ăn-recipes--collections---8-screens)
   * [Module 8: Lập kế hoạch thực đơn 7 ngày (Meal Planner & AI Generator)](#module-8-lập-kế-hoạch-thực-đơn-7-ngày-meal-planner--ai-generator---4-screens)
   * [Module 9: Danh sách đi chợ thông minh (Smart Grocery List)](#module-9-danh-sách-đi-chợ-thông-minh-smart-grocery-list---3-screens)
   * [Module 10: Nuôi thú ảo Bé Mầm & Động lực (Gamification & Pet Care)](#module-10-nuôi-thú-ảo-bé-mầm--động-lực-gamification--pet-care---5-screens)
   * [Module 11: Nâng cấp gói Pro & Cổng thanh toán VietQR (Premium & PayOS)](#module-11-nâng-cấp-gói-pro--cổng-thanh-toán-vietqr-premium--payos---6-screens)
   * [Module 12: Trang cá nhân, Cài đặt & Thông báo (Profile & Settings)](#module-12-trang-cá-nhân-cài-đặt--thông-báo-profile--settings---10-screens)
   * [Module 13: Cổng Quản trị hệ thống (Admin Web Portal - React Vite)](#module-13-cổng-quản-trị-hệ-thống-admin-web-portal---react-vite)
5. [Ma Trận Theo Dõi Tiến Độ Kiểm Thử (RTM Matrix)](#5-ma-trận-theo-dõi-tiến-độ-kiểm-thử-rtm-matrix)
6. [Kế Hoạch Triển Khai Script Kiểm Thử Tự Động (Implementation Plan)](#6-kế-hoạch-triển-khai-script-kiểm-thử-tự-động-implementation-plan)

---

## 1. Tổng Quan Môi Trường Kiểm Thử Local

Toàn bộ kịch bản E2E được chạy hoàn toàn trên máy local — không kết nối server hay Home Server bên ngoài:

```
┌─────────────────────────────────┐           ┌───────────────────────────────────┐
│     Physical Android Device     │           │       Windows Host (Local)        │
│      (OPPO CPH2481 / API 35)    │           │                                   │
│                                 │   USB     │ ┌──────────────────────────────┐  │
│  ┌───────────────────────────┐  │ ◄───────► │ │ Metro Bundler  (Port 8081)   │  │
│  │     Expo Go Mobile App    │  │           │ └──────────────────────────────┘  │
│  │  API → localhost:5000/api │  │           │ ┌──────────────────────────────┐  │
│  └───────────────────────────┘  │           │ │ .NET API Local (Port 5000)   │  │
│                                 │           │ └──────────────────────────────┘  │
│                                 │           │ ┌──────────────────────────────┐  │
│                                 │           │ │ PostgreSQL Local (Port 5432) │  │
└─────────────────────────────────┘           │ └──────────────────────────────┘  │
                                              │ ┌──────────────────────────────┐  │
                                              │ │ ADB Reverse Port Forwarding  │  │
                                              │ │ 8081 -> 8081 | 5000 -> 5000  │  │
                                              │ └──────────────────────────────┘  │
                                              │ ┌──────────────────────────────┐  │
                                              │ │ scrcpy (Screen Mirror)       │  │
                                              │ └──────────────────────────────┘  │
                                              └───────────────────────────────────┘
```

### Thông số kỹ thuật kiểm thử:
* **Thiết bị thật (DUT)**: `OPPO CPH2481` (Android 15 / API Level 35).
* **Kết nối**: Cáp Type-C USB 3.0, chế độ Android USB Debugging.
* **Backend API**: Chạy local trên máy tính — `http://localhost:5000/api` (ASP.NET Core).
* **Database**: PostgreSQL chạy local — `localhost:5432`.
* **Cơ chế đảo chiều cổng (Bắt buộc)**:
  * `adb reverse tcp:8081 tcp:8081` (Tải Javascript Bundle từ Metro Bundler).
  * `adb reverse tcp:5000 tcp:5000` (Gọi Backend API từ điện thoại về máy local).
* **Trình tự động hóa**: Node.js ADB Runner tương tác trực tiếp qua Android UIAutomator XML Dump và `input tap / text / keyevent`.

---

## 2. Bảng Ánh Xạ Tài Khoản Dữ Liệu Demo

Mọi ca kiểm thử phải sử dụng đúng tài khoản tương ứng đã được thiết lập sẵn trong cơ sở dữ liệu (Chi tiết xem tại [`docs/demo/accounts.md`](../../../../docs/demo/accounts.md)):

| Phân Loại Tài Khoản | Email | Mật khẩu | Trạng thái / Đặc quyền | Mục đích kiểm thử chính |
| :--- | :--- | :--- | :--- | :--- |
| **User Pro (Chính)** | `smartmealuser@gmail.com` | `Smartmeal@123` | `IsPro = true` | Test toàn bộ luồng tính năng cao cấp (AI Camera, Tuần ăn, Nuôi thú) |
| **User Free (Nâng Cấp)** | `rowem96186@goldvester.com` | `Smartmeal@123` | `IsPro = false`, `Verified: true` | Test luồng mở PayOS VietQR, nâng cấp gói dịch vụ |
| **User Free (Đối chứng)** | `damthanchiem@gmail.com` | `Smartmeal@123` | `IsPro = false` | Test chặn tính năng Pro, giới hạn lượt quét AI |
| **Admin Quản Trị** | `admin@smartmeal.com` | `Admin@123456` | `Role = Admin` | Test cổng Admin Web, duyệt công thức món, xem doanh thu |

---

## 3. Quy Chuẩn Đánh Giá Mức Độ Ưu Tiên (Priority Criteria)

* **`P0` - Critical (Sống còn / Buổi Demo bắt buộc phải chạy mượt)**:
  * Các luồng nghiệp vụ cốt lõi: Đăng nhập, Xem Dashboard Calo, Chụp ảnh nhận diện món bằng AI, Lập thực đơn tự động, Quét mã VietQR nâng cấp tài khoản Pro.
  * Nếu lỗi P0 xảy ra: Ứng dụng bị sập (Crash) hoặc buổi thuyết trình đồ án bị gián đoạn.
* **`P1` - High (Trọng tâm trải nghiệm người dùng)**:
  * Hồ sơ sức khỏe 7 bước Onboarding, Ghi món thủ công, Quét Barcode, Nuôi Bé Mầm, Danh sách đi chợ cộng dồn.
  * Đảm bảo tính toán logic đúng chuẩn khoa học dinh dưỡng (TDEE, BMR, Macro).
* **`P2` - Normal (Chức năng mở rộng & Giá trị gia tăng)**:
  * Bộ sưu tập món ăn, Thử thách dinh dưỡng, Lịch sử cân nặng, Chỉnh sửa thông tin cá nhân, Nhắc nhở uống nước.

---

## 4. Chi Tiết 13 Module Chức Năng & Các Ca Kiểm Thử E2E

### Module 1: Xác thực & Phiên làm việc (Auth & Session - 10 screens)

| Mã Test Case | Mức Độ | Tên Kịch Bản | Tài Khoản Sử Dụng | Các Bước Thực Hiện (Steps) | Kết Quả Kỳ Vọng (Expected Result) |
| :--- | :---: | :--- | :--- | :--- | :--- |
| `E2E-AUTH-01` | **P0** | Đăng nhập tài khoản Pro hợp lệ | `smartmealuser@gmail.com` | 1. Mở app -> Vào màn hình Login<br>2. Nhập Email & Password<br>3. Bấm nút "Đăng nhập" | Đăng nhập thành công, lưu JWT Token vào SecureStore, chuyển hướng ngay vào Dashboard chính. |
| `E2E-AUTH-02` | **P0** | Đăng ký tài khoản mới & Xác thực OTP | Email mới tạo ngẫu nhiên | 1. Chọn "Đăng ký"<br>2. Điền Họ tên, Email, Mật khẩu<br>3. Bấm xác nhận<br>4. Nhập mã OTP 6 số từ hệ thống | Hệ thống kích hoạt `IsEmailVerified = true`, tự động chuyển sang luồng Onboarding 7 bước. |
| `E2E-AUTH-03` | **P1** | Đăng nhập sai thông tin xác thực | `smartmealuser@gmail.com` (Pass sai) | 1. Nhập email đúng, mật khẩu sai (`WrongPass@999`)<br>2. Bấm "Đăng nhập" | Ứng dụng không chuyển trang, hiển thị toast/alert báo lỗi "Tài khoản hoặc mật khẩu không chính xác". |
| `E2E-AUTH-04` | **P1** | Khám phá với tư cách Khách (Guest Mode) | Không dùng tài khoản | 1. Tại màn hình Welcome, chọn "Khám phá ngay"<br>2. Xem danh sách công thức<br>3. Thử bấm vào Tab "Nhật ký" | Hệ thống cho phép xem công thức công khai nhưng hiển thị popup yêu cầu Đăng nhập khi bấm vào Nhật ký/Lập kế hoạch. |
| `E2E-AUTH-05` | **P2** | Quên mật khẩu & Đặt lại mật khẩu | `rowem96186@goldvester.com` | 1. Bấm "Quên mật khẩu?"<br>2. Điền email -> Nhận mã OTP<br>3. Nhập mật khẩu mới | Đổi mật khẩu thành công trong cơ sở dữ liệu, có thể đăng nhập ngay với mật khẩu mới. |

---

### Module 2: Hồ sơ sức khỏe & Tính toán chỉ số sinh học (Health Profile - 8 screens)

| Mã Test Case | Mức Độ | Tên Kịch Bản | Dữ Liệu Đầu Vào | Các Bước Thực Hiện (Steps) | Kết Quả Kỳ Vọng (Expected Result) |
| :--- | :---: | :--- | :--- | :--- | :--- |
| `E2E-PROF-01` | **P1** | Hoàn thành Onboarding hồ sơ sức khỏe 7 bước | Nam, 22 tuổi, Cao 175cm, Nặng 70kg, Mục tiêu 68kg, Vận động vừa phải | 1. Chọn Giới tính & Ngày sinh<br>2. Nhập Chiều cao, Cân nặng hiện tại & Mục tiêu<br>3. Chọn Mức độ hoạt động<br>4. Chọn Dị ứng (Tôm, Cua)<br>5. Chọn Chế độ ăn (Eat Clean) | Hệ thống lưu thông số vào DB, chuyển tới màn hình tổng kết chỉ số sinh học. |
| `E2E-PROF-02` | **P1** | Kiểm tra công thức tính toán tự động BMI, TDEE, Calo | Chiều cao 175cm, Cân nặng 70kg | 1. Quan sát màn hình kết quả sau Onboarding | - BMI ~ 22.86 (Bình thường)<br>- BMR ~ 1680 kcal<br>- TDEE ~ 2600 kcal<br>- Target Calo thâm hụt (Deficit) tự động gợi ý ~ 2100 kcal. |
| `E2E-PROF-03` | **P2** | Chỉnh sửa mục tiêu cân nặng trong Profile | Đổi mục tiêu từ 68kg -> 65kg | 1. Vào Tab Cá nhân -> "Hồ sơ sức khỏe"<br>2. Cập nhật mục tiêu cân nặng<br>3. Bấm "Lưu thay đổi" | Mục tiêu mới được cập nhật, Calo mục tiêu mỗi ngày tự động tính toán lại tương ứng. |

---

### Module 3: Trang chủ & Bảng tổng quan năng lượng (Dashboard - 2 screens)

| Mã Test Case | Mức Độ | Tên Kịch Bản | Dữ Liệu Kiểm Thử | Các Bước Thực Hiện (Steps) | Kết Quả Kỳ Vọng (Expected Result) |
| :--- | :---: | :--- | :--- | :--- | :--- |
| `E2E-DASH-01` | **P0** | Kiểm tra vòng tròn Calo tiêu thụ vs Mục tiêu | Đã ghi bữa trưa 650 kcal, Target 2000 kcal | 1. Đăng nhập vào Dashboard<br>2. Quan sát biểu đồ tròn Calo | Vòng tròn hiển thị: "Còn lại 1350 kcal", thanh tiến trình đạt tỷ lệ 32.5% chính xác. |
| `E2E-DASH-02` | **P1** | Kiểm tra tỷ lệ 3 thanh Macro (Carb / Protein / Fat) | Carb: 80g, Protein: 45g, Fat: 20g | 1. Xem khối chi tiết dinh dưỡng dưới vòng tròn calo | 3 thanh phân bố Macro hiển thị đúng tỷ lệ gram tiêu thụ so với giới hạn mục tiêu trong ngày. |
| `E2E-DASH-03` | **P1** | Mở QuickLog thêm nhanh bữa ăn từ Dashboard | Món ăn nhanh: Chuối (1 quả, 105 kcal) | 1. Nhấn nút "+" nổi trên Dashboard<br>2. Chọn bữa Phụ -> Chọn nhanh Quả chuối<br>3. Bấm "Thêm" | Nhật ký ghi nhận tức thì, Calo trên Dashboard nhảy tăng thêm 105 kcal không cần reload app. |

---

### Module 4: Nhật ký dinh dưỡng & Đồng bộ ngoại tuyến (Nutrition Diary - 7 screens)

| Mã Test Case | Mức Độ | Tên Kịch Bản | Dữ Liệu Kiểm Thử | Các Bước Thực Hiện (Steps) | Kết Quả Kỳ Vọng (Expected Result) |
| :--- | :---: | :--- | :--- | :--- | :--- |
| `E2E-DIAR-01` | **P0** | Ghi món ăn thủ công vào các bữa | Phở bò (1 bát), Cơm tấm (1 đĩa) | 1. Vào Tab "Nhật ký"<br>2. Chọn Bữa Sáng -> Tìm "Phở bò"<br>3. Chọn Bữa Trưa -> Tìm "Cơm tấm"<br>4. Lưu món | Món ăn xuất hiện đúng phân loại bữa ăn kèm số calo và các chỉ số dinh dưỡng chi tiết. |
| `E2E-DIAR-02` | **P1** | Tìm kiếm món ăn tiếng Việt & Chọn khẩu phần | Từ khóa "ức gà", đơn vị 200g | 1. Bấm thêm món bữa Trưa<br>2. Gõ "uc ga" (không dấu)<br>3. Chọn đơn vị "gram", nhập 200<br>4. Xác nhận | Tìm kiếm mượt mà kể cả không dấu, giá trị dinh dưỡng tự động nhân tỷ lệ gấp 2 lần mức chuẩn 100g. |
| `E2E-DIAR-03` | **P1** | Chỉnh sửa số lượng & Xóa món khỏi nhật ký | Món Cơm sườn 500 kcal | 1. Vuốt hoặc nhấn vào món Cơm sườn<br>2. Đổi khẩu phần từ 1 dĩa -> 0.5 dĩa<br>3. Thử thao tác xóa món | Sửa thành công calo giảm còn 250 kcal. Khi xóa, món biến mất và tổng calo ngày tự động trừ tương ứng. |
| `E2E-DIAR-04` | **P2** | Kiểm tra hàng đợi Offline Queue khi mất mạng | Ngắt kết nối Wi-Fi trên điện thoại | 1. Ngắt mạng điện thoại<br>2. Ghi 1 món ăn vào bữa Tối<br>3. Bật lại mạng Wi-Fi | Món ăn lưu tạm vào SQLite local, khi có mạng trở lại dữ liệu tự động đồng bộ lên PostgreSQL server. |

---

### Module 5: Nhận diện thông minh bằng AI (AI Camera & Voice Log - 7 screens)

| Mã Test Case | Mức Độ | Tên Kịch Bản | Tài Khoản / Dữ Liệu | Các Bước Thực Hiện (Steps) | Kết Quả Kỳ Vọng (Expected Result) |
| :--- | :---: | :--- | :--- | :--- | :--- |
| `E2E-AI-01` | **P0** | Chụp ảnh nhận diện món ăn bằng Gemini AI | Ảnh đĩa Cơm sườn nướng trứng ốp la | 1. Bấm icon Camera trên thanh điều hướng<br>2. Chụp ảnh đĩa thức ăn<br>3. Chờ AI phân tích<br>4. Xem màn hình Review kết quả<br>5. Bấm "Lưu vào Bữa Trưa" | AI nhận diện đúng tên món ("Cơm sườn bì chả"), ước tính khối lượng, bóc tách Carbs/Protein/Fat và lưu thẳng vào Nhật ký. |
| `E2E-AI-02` | **P1** | Nhập liệu bằng giọng nói (Voice Log) | File âm thanh: "Trưa nay ăn một bát phở bò tái và một quả trứng chần" | 1. Nhấn nút Mic ghi âm<br>2. Đọc nội dung bữa ăn<br>3. Bấm dừng để AI phân tích | Hệ thống nhận dạng giọng nói tiếng Việt, trích xuất ra 2 món: Phở bò tái và Trứng chần kèm calo. |
| `E2E-AI-03` | **P1** | Kiểm tra hạn mức quét AI của tài khoản Free | `damthanchiem@gmail.com` (Đã quét 5 lần) | 1. Đăng nhập tài khoản Free<br>2. Thực hiện quét ảnh món lần thứ 6 trong ngày | Hệ thống hiển thị Modal chặn: "Bạn đã dùng hết 5 lượt AI hôm nay. Nâng cấp Pro để mở khóa không giới hạn!". |

---

### Module 6: Quét mã vạch & Quét tủ lạnh thông minh (Scanner - 7 screens)

| Mã Test Case | Mức Độ | Tên Kịch Bản | Dữ Liệu Đầu Vào | Các Bước Thực Hiện (Steps) | Kết Quả Kỳ Vọng (Expected Result) |
| :--- | :---: | :--- | :--- | :--- | :--- |
| `E2E-SCAN-01` | **P1** | Quét Barcode EAN-13 sản phẩm đóng gói | Mã Barcode Sữa tươi chua Vinamilk | 1. Chọn tính năng "Quét mã vạch"<br>2. Hướng camera vào barcode sản phẩm<br>3. Nhận kết quả tra cứu | Trích xuất tên sản phẩm, thương hiệu, bảng dinh dưỡng 100ml từ Open Food Facts/Database nội bộ. |
| `E2E-SCAN-02` | **P1** | Cảnh báo thành phần gây dị ứng từ Barcode | User dị ứng sữa bò, quét Bánh quy bơ | 1. User có dị ứng `Milk`<br>2. Quét sản phẩm có chứa sữa bột | Màn hình hiển thị nhãn cảnh báo đỏ nổi bật: "⚠️ Cảnh báo: Sản phẩm có chứa Sữa (Chất dị ứng của bạn)". |
| `E2E-SCAN-03` | **P0 - Pro** | Quét tủ lạnh thông minh (Fridge Scanner) | Ảnh chụp nguyên liệu: Trứng, Cà chua, Đậu hũ | 1. Tài khoản Pro chọn "Quét tủ lạnh"<br>2. Chụp toàn cảnh ngăn mát tủ lạnh<br>3. Bấm "Tìm món nấu ngay" | AI phân tích danh sách nguyên liệu có sẵn và gợi ý công thức: "Đậu sốt cà chua", "Trứng chiên cà chua". |

---

### Module 7: Khám phá công thức & Bộ sưu tập món ăn (Recipes & Collections - 8 screens)

| Mã Test Case | Mức Độ | Tên Kịch Bản | Dữ Liệu Bộ Lọc | Các Bước Thực Hiện (Steps) | Kết Quả Kỳ Vọng (Expected Result) |
| :--- | :---: | :--- | :--- | :--- | :--- |
| `E2E-REC-01` | **P1** | Tìm kiếm công thức & Bộ lọc nâng cao | Calo < 500, Thời gian < 30 phút, Ăn chay (Vegetarian) | 1. Vào Tab "Khám phá"<br>2. Mở bộ lọc điều kiện<br>3. Chọn tiêu chí và áp dụng | Danh sách trả về chỉ chứa các món ăn thỏa mãn đồng thời cả 3 điều kiện lọc. |
| `E2E-REC-02` | **P1** | Xem chi tiết công thức & Hướng dẫn nấu từng bước | Món "Salad ức gà sốt mè rang" | 1. Bấm vào chi tiết món<br>2. Xem danh sách nguyên liệu<br>3. Bật chế độ "Nấu ăn từng bước" (Cooking Mode) | Màn hình hiển thị toàn màn hình các bước làm, có đồng hồ đếm ngược hẹn giờ (Timer). |
| `E2E-REC-03` | **P2** | Tạo Bộ sưu tập món cá nhân (Custom Collection) | Tên: "Thực đơn giảm mỡ bụng" | 1. Bấm icon Bookmark tại món ăn<br>2. Chọn "Tạo bộ sưu tập mới"<br>3. Nhập tên và lưu | Bộ sưu tập mới được tạo, món ăn được lưu vào và hiển thị trong Tab Cá nhân. |
| `E2E-REC-04` | **P2** | Mở bộ sưu tập được chia sẻ qua Deep Link | URL `smartmealmobile://shared/collections/xyz123` | 1. Kích hoạt Intent Deep Link từ ADB Command | Ứng dụng tự động điều hướng thẳng vào màn hình xem chi tiết bộ sưu tập được chia sẻ. |

---

### Module 8: Lập kế hoạch thực đơn 7 ngày (Meal Planner & AI Generator - 4 screens)

| Mã Test Case | Mức Độ | Tên Kịch Bản | Tài Khoản Sử Dụng | Các Bước Thực Hiện (Steps) | Kết Quả Kỳ Vọng (Expected Result) |
| :--- | :---: | :--- | :--- | :--- | :--- |
| `E2E-PLAN-01` | **P1** | Xem lưới lịch 7 ngày & Thêm món vào kế hoạch | Tài khoản Pro / Free | 1. Vào Tab "Kế hoạch"<br>2. Xem lưới thứ 2 -> Chủ nhật<br>3. Chọn Thứ 4, Bữa Trưa -> Thêm món "Canh rong biển" | Món ăn được gắn vào đúng ô lịch thứ 4, tổng calo ngày thứ 4 tự động cập nhật. |
| `E2E-PLAN-02` | **P0 - Pro** | Tạo tự động thực đơn tuần bằng AI (AI Auto-generate) | `smartmealuser@gmail.com` (Pro) | 1. Bấm "Tự động tạo thực đơn tuần bằng AI"<br>2. Chọn mục tiêu Giảm cân, 3 bữa chính + 1 bữa phụ<br>3. Bấm "Bắt đầu tạo" | AI phân tích hồ sơ dinh dưỡng, tự động lấp đầy 7 ngày với các món cân bằng calo và macro chuẩn xác. |
| `E2E-PLAN-03` | **P1** | Đổi món ăn khác trong kế hoạch tuần (Swap Meal) | Đổi món bữa tối Thứ 5 | 1. Tại ô bữa tối Thứ 5, bấm icon "Đổi món"<br>2. Chọn món tương đương calo từ gợi ý<br>3. Xác nhận đổi | Món mới thay thế món cũ mà không làm lệch tổng calo quy định của ngày. |

---

### Module 9: Danh sách đi chợ thông minh (Smart Grocery List - 3 screens)

| Mã Test Case | Mức Độ | Tên Kịch Bản | Dữ Liệu Tuần Ăn | Các Bước Thực Hiện (Steps) | Kết Quả Kỳ Vọng (Expected Result) |
| :--- | :---: | :--- | :--- | :--- | :--- |
| `E2E-GROC-01` | **P0** | Tự động tổng hợp và cộng dồn nguyên liệu | Thực đơn tuần có 3 bữa dùng thịt gà (200g, 300g, 250g) | 1. Từ màn hình Lập kế hoạch tuần<br>2. Bấm "Tạo danh sách đi chợ"<br>3. Xem mục "Thịt gà phi lê" | Hệ thống cộng dồn chính xác: `Thịt gà: 750g` thay vì hiển thị 3 dòng nguyên liệu rời rạc. |
| `E2E-GROC-02` | **P1** | Phân loại nguyên liệu theo quầy siêu thị | Rau củ, Thịt cá, Gia vị, Đồ khô | 1. Mở xem toàn bộ danh sách đi chợ | Các mục được nhóm trực quan theo từng quầy mua sắm giúp người dùng tiện theo dõi. |
| `E2E-GROC-03` | **P1** | Đánh dấu đã mua (Strikethrough) & Lưu chi phí | Mua hoàn tất 5/8 món | 1. Tích chọn các món đã mua tại siêu thị<br>2. Nhập số tiền thực tế đã chi<br>3. Bấm "Hoàn tất chuyến đi chợ" | Các món được gạch ngang, danh sách lưu vào lịch sử chi tiêu dinh dưỡng của tuần. |

---

### Module 10: Nuôi thú ảo Bé Mầm & Động lực (Gamification & Pet Care - 5 screens)

| Mã Test Case | Mức Độ | Tên Kịch Bản | Hành Động Kích Hoạt | Các Bước Thực Hiện (Steps) | Kết Quả Kỳ Vọng (Expected Result) |
| :--- | :---: | :--- | :--- | :--- | :--- |
| `E2E-PET-01` | **P1** | Xem trạng thái Bé Mầm & Chuỗi ngày ăn chuẩn (Streak) | Đã giữ chuỗi 5 ngày liên tiếp | 1. Mở màn hình Bé Mầm<br>2. Xem biểu cảm và cấp độ | Bé Mầm vui vẻ, hiển thị huy hiệu: "🔥 Chuỗi 5 ngày", thanh kinh nghiệm hiển thị cấp độ hiện tại. |
| `E2E-PET-02` | **P1** | Ghi nhận uống nước & Thưởng điểm kinh nghiệm (XP) | Uống 1 cốc nước (+250ml) | 1. Nhấn nút "+" uống nước<br>2. Quan sát hoạt họa Bé Mầm | Bình nước dâng lên thêm 250ml, hoạt họa Bé Mầm nhảy mừng, cộng ngay +10 XP cho linh vật. |
| `E2E-PET-03` | **P2** | Mở khóa huy hiệu thành tích (Achievement Badge) | Đạt cột mốc 7 ngày ghi nhật ký | 1. Hoàn tất ghi nhận ngày thứ 7<br>2. Vào "Kho huy hiệu" | Hiển thị Popup chúc mừng mở khóa huy hiệu "Chiến Binh Kiên Trì" và cấp sao tăng lên. |

---

### Module 11: Nâng cấp gói Pro & Cổng thanh toán VietQR (Premium & PayOS - 6 screens)

| Mã Test Case | Mức Độ | Tên Kịch Bản | Tài Khoản Kiểm Thử | Các Bước Thực Hiện (Steps) | Kết Quả Kỳ Vọng (Expected Result) |
| :--- | :---: | :--- | :--- | :--- | :--- |
| `E2E-PAY-01` | **P0** | Vào màn hình thanh toán & Chọn gói dịch vụ Pro | `rowem96186@goldvester.com` (Free) | 1. Đăng nhập tài khoản Free<br>2. Vào Cài đặt -> Chọn "Nâng cấp Pro"<br>3. Chọn gói 1 Tháng (49.000đ)<br>4. Bấm "Tiến hành thanh toán" | Chuyển mượt mà sang màn hình Cổng thanh toán PayOS. |
| `E2E-PAY-02` | **P0** | Khởi tạo đơn hàng & Hiển thị mã VietQR chuyển khoản | Đơn hàng nâng cấp gói Pro Tháng | 1. Tại màn hình PayOS Checkout<br>2. Quan sát mã VietQR được sinh tự động | Hiển thị mã VietQR hợp lệ, thông tin số tài khoản nhận, đúng số tiền 49.000đ và mã nội dung chuyển khoản. |
| `E2E-PAY-03` | **P1** | Mở ứng dụng ngân hàng liên kết qua Deep Link | Thiết bị có app Vietcombank / MBBank | 1. Bấm nút "Mở ứng dụng ngân hàng"<br>2. Chọn ngân hàng tương ứng | Kích hoạt Intent mở app ngân hàng kèm nạp sẵn thông tin chuyển khoản. |
| `E2E-PAY-04` | **P0** | Nhận Webhook xác nhận thanh toán & Nâng cấp Pro | Giả lập Webhook PayOS trả về `PAID` | 1. Hệ thống nhận Webhook thanh toán thành công<br>2. App nhận thông báo Realtime | Màn hình hiển thị Popup: "🎉 Chúc mừng bạn đã nâng cấp Pro thành công!", `IsPro` trong DB cập nhật thành `true`. |

---

### Module 12: Trang cá nhân, Cài đặt & Thông báo (Profile & Settings - 10 screens)

| Mã Test Case | Mức Độ | Tên Kịch Bản | Nội Dung Kiểm Thử | Các Bước Thực Hiện (Steps) | Kết Quả Kỳ Vọng (Expected Result) |
| :--- | :---: | :--- | :--- | :--- | :--- |
| `E2E-SET-01` | **P1** | Đổi ảnh đại diện & Cập nhật thông tin cá nhân | Đổi Tên hiển thị & Avatar mới | 1. Vào Tab Cá nhân -> "Chỉnh sửa thông tin"<br>2. Đổi tên thành "SmartMeal Pro User"<br>3. Bấm "Lưu" | Thông tin lưu vào cơ sở dữ liệu, hiển thị đồng bộ ngay trên Header màn hình chính. |
| `E2E-SET-02` | **P1** | Theo dõi biểu đồ lịch sử cân nặng | 5 mốc cân nặng trong 30 ngày qua | 1. Chọn "Theo dõi cân nặng"<br>2. Nhập cân nặng hôm nay (69.2kg)<br>3. Xem đồ thị đường | Biểu đồ cập nhật điểm dữ liệu mới, hiển thị xu hướng giảm cân theo đúng tiến độ. |
| `E2E-SET-03` | **P2** | Cấu hình lịch nhắc nhở ăn uống thông minh | Giờ nhắc ăn sáng 07:30, ăn tối 19:00 | 1. Vào "Cài đặt thông báo"<br>2. Bật Toggle nhắc nhở<br>3. Chọn mốc giờ cụ thể | Lịch thông báo cục bộ (Local Push Notification) được lên lịch chuẩn xác trong hệ điều hành Android. |
| `E2E-SET-04` | **P1** | Đăng xuất và xóa phiên làm việc an toàn | Tài khoản đang đăng nhập | 1. Vào Cài đặt -> Cuộn xuống cuối<br>2. Bấm "Đăng xuất"<br>3. Xác nhận trên Popup | Token đăng nhập bị xóa khỏi SecureStore, ứng dụng quay trở lại màn hình Đăng nhập ban đầu. |

---

### Module 13: Cổng Quản trị hệ thống (Admin Web Portal - React Vite)

| Mã Test Case | Mức Độ | Tên Kịch Bản | Tài Khoản Sử Dụng | Các Bước Thực Hiện (Steps) | Kết Quả Kỳ Vọng (Expected Result) |
| :--- | :---: | :--- | :--- | :--- | :--- |
| `E2E-ADM-01` | **P0** | Đăng nhập Quản trị viên trên Web Browser | `admin@smartmeal.com` / `Admin@123456` | 1. Mở trình duyệt truy cập `http://localhost:5173`<br>2. Nhập Email & Mật khẩu Admin<br>3. Bấm Đăng nhập | Đăng nhập thành công, chuyển hướng vào Admin Dashboard quản trị trung tâm. |
| `E2E-ADM-02` | **P1** | Xem biểu đồ thống kê người dùng & Doanh thu gói Pro | Dữ liệu thống kê hệ thống | 1. Vào mục "Báo cáo & Thống kê"<br>2. Xem biểu đồ người dùng mới, tỷ lệ chuyển đổi Free -> Pro | Các widget số liệu tải đầy đủ, biểu đồ doanh thu PayOS hiển thị trực quan. |
| `E2E-ADM-03` | **P1** | Kiểm duyệt công thức món ăn do cộng đồng đóng góp | Công thức món ăn chờ duyệt | 1. Vào mục "Quản lý Công thức"<br>2. Chọn món ở trạng thái `Pending`<br>3. Xem thông tin dinh dưỡng<br>4. Bấm "Phê duyệt" | Trạng thái món đổi thành `Approved`, công thức lập tức xuất hiện trên ứng dụng Mobile của người dùng. |
| `E2E-ADM-04` | **P1** | Kiểm tra phân quyền: Chặn tài khoản User thường | `smartmealuser@gmail.com` | 1. Dùng tài khoản User thường đăng nhập trên trang Admin Web | Hệ thống từ chối đăng nhập với thông báo lỗi: "Truy cập bị từ chối: Tài khoản không có quyền Quản trị viên". |

---

## 5. Ma Trận Theo Dõi Tiến Độ Kiểm Thử (RTM Matrix)

| Module Chức Năng | Số Màn Hình | Tổng Số Ca Test | Ca P0 (Critical) | Ca P1 (High) | Ca P2 (Normal) | Tỷ Lệ Tự Động Hóa Dự Kiến |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **1. Auth & Session** | 10 | 5 | 2 | 2 | 1 | 100% |
| **2. Health Profile** | 8 | 3 | 0 | 2 | 1 | 100% |
| **3. Dashboard** | 2 | 3 | 1 | 2 | 0 | 100% |
| **4. Nutrition Diary** | 7 | 4 | 1 | 2 | 1 | 80% |
| **5. AI Camera & Voice** | 7 | 3 | 1 | 2 | 0 | 70% (Mô phỏng ảnh chụp) |
| **6. Barcode & Fridge** | 7 | 3 | 1 | 2 | 0 | 70% (Mô phỏng Barcode) |
| **7. Recipes & Collections**| 8 | 4 | 0 | 2 | 2 | 90% |
| **8. Meal Planner** | 4 | 3 | 1 | 2 | 0 | 100% |
| **9. Smart Grocery** | 3 | 3 | 1 | 2 | 0 | 100% |
| **10. Gamification (Bé Mầm)**| 5 | 3 | 0 | 2 | 1 | 100% |
| **11. Premium & PayOS** | 6 | 4 | 3 | 1 | 0 | 90% |
| **12. Profile & Settings** | 10 | 4 | 0 | 3 | 1 | 100% |
| **13. Admin Web Portal** | - | 4 | 1 | 3 | 0 | 100% (Chrome DevTools / Playwright) |
| **TỔNG CỘNG** | **78+ Screens** | **46 Test Cases** | **12 (26%)** | **25 (54%)** | **9 (20%)** | **~90%** |

---

## 6. Kế Hoạch Triển Khai Script Kiểm Thử Tự Động (Implementation Plan)

---

### 6.1. Cấu trúc bộ test runner (`runner/`)

Toàn bộ kịch bản kiểm thử tự động được tổ chức trong thư mục `SmartMeal/docs/test/end-to-end/runner/` với cấu trúc module hóa rõ ràng:

```
runner/
├── run.js                          ← Entry point: chạy lẻ từng kịch bản hoặc --all
├── lib/
│   ├── adb.js                      ← Wrapper các lệnh ADB (tap, text, keyevent, dump)
│   ├── screen.js                   ← Nhận diện màn hình (Screen Signature matching)
│   ├── assert.js                   ← Helpers kiểm tra kết quả (assertText, assertVisible)
│   └── logger.js                   ← Ghi log kết quả PASS/FAIL với timestamp
└── scenarios/
    ├── 01_auth_login.test.js        ← Module 1: Auth & Session (tài khoản Pro)
    ├── 02_tabs_navigation.test.js   ← Module 3: Dashboard & Module 5: Tab Navigation
    ├── 03_diary_quicklog.test.js    ← Module 4: Nutrition Diary – QuickLog flow
    └── 04_pro_upgrade_view.test.js  ← Module 11: Premium PayOS (tài khoản Free)
```

**Nguyên tắc thiết kế:**
- Mỗi file kịch bản (`*.test.js`) là một module ES/CJS độc lập, export hàm `run(adb, screen, log)`.
- `run.js` load và thực thi tuần tự từng kịch bản, thu thập kết quả và in summary cuối.
- Không phụ thuộc framework ngoài (Jest/Mocha); chỉ dùng Node.js built-ins + `child_process` để gọi ADB.
- Mỗi bước ADB chờ UI ổn định trước khi hành động tiếp theo (polling dump XML, timeout 5s mặc định).

---

### 6.2. Bộ nhận diện màn hình Screen Signatures

File `lib/screen.js` định nghĩa các **Screen Signature** — tập hợp các selector hoặc chuỗi văn bản đặc trưng cho từng màn hình — để runner tự xác định app đang ở đâu trước khi thực hiện hành động.

| Tên Signature | Màn hình nhận diện | Tiêu chí khớp (UIAutomator XML) |
| :--- | :--- | :--- |
| `SCREEN_WELCOME` | Welcome / Splash | `text="Khám phá ngay"` hoặc `text="Đăng nhập"` |
| `SCREEN_LOGIN` | Màn hình Đăng nhập | `resource-id` chứa `emailInput` và `passwordInput` |
| `SCREEN_DASHBOARD` | Dashboard chính | `text="Calo hôm nay"` hoặc `contentDesc="dashboard-ring"` |
| `SCREEN_DIARY` | Nhật ký dinh dưỡng | `text="Bữa sáng"` và `text="Bữa trưa"` cùng tồn tại |
| `SCREEN_QUICKLOG` | QuickLog / Thêm nhanh | `text="Chọn bữa ăn"` hoặc nút `"Thêm vào nhật ký"` |
| `SCREEN_TABS` | Bottom Tab Bar hiển thị | Node `class="android.widget.TabWidget"` hoặc 5 icon tab |
| `SCREEN_PAYOS` | Cổng thanh toán PayOS | `text="Thanh toán VietQR"` hoặc `text="Quét mã QR"` |
| `SCREEN_UPGRADE` | Chọn gói Pro | `text="Nâng cấp Pro"` và `text="49.000đ"` |

**Cơ chế hoạt động:**
```js
// lib/screen.js (pseudocode)
async function currentScreen(adb) {
  const xml = await adb.dumpXml();          // UIAutomator XML dump
  for (const [name, matchers] of SIGNATURES) {
    if (matchers.every(m => xml.includes(m))) return name;
  }
  return 'SCREEN_UNKNOWN';
}
```

---

### 6.3. Kịch bản `01_auth_login.test.js` — Module 1 Auth (tài khoản Pro)

**Mục tiêu:** Kiểm thử luồng đăng nhập đầy đủ với tài khoản Pro `smartmealuser@gmail.com`.  
**Bao phủ test case:** `E2E-AUTH-01` (P0).

```
Luồng kịch bản:
1. Tiền điều kiện: App đang ở SCREEN_WELCOME hoặc SCREEN_LOGIN
2. Nếu ở SCREEN_WELCOME → tap nút "Đăng nhập"
3. Chờ SCREEN_LOGIN ổn định (polling max 5s)
4. Nhập email: adb shell input text "smartmealuser@gmail.com"
5. Nhấn Tab chuyển sang ô mật khẩu: keyevent 61
6. Nhập password: adb shell input text "Smartmeal@123"
7. Tap nút "Đăng nhập" (tọa độ lấy từ UIAutomator: node text="Đăng nhập" clickable=true)
8. Polling chờ SCREEN_DASHBOARD (timeout 8s)
9. Assert: currentScreen() === 'SCREEN_DASHBOARD'
10. Assert: XML chứa text "Calo hôm nay" (xác nhận đã có dữ liệu user Pro)
11. Log: PASS E2E-AUTH-01 | Thời gian: <elapsed>ms
```

**Dọn dẹp sau test:** Không logout (giữ phiên cho các kịch bản tiếp theo nếu chạy `--all`).

---

### 6.4. Kịch bản `02_tabs_navigation.test.js` — Module 3 Dashboard & Module 5 Tab

**Mục tiêu:** Kiểm thử hiển thị Dashboard và điều hướng qua 5 tab chính của ứng dụng.  
**Bao phủ test case:** `E2E-DASH-01` (P0), `E2E-DASH-02` (P1), điều hướng tab (P0).

```
Luồng kịch bản:
1. Tiền điều kiện: Đã đăng nhập → SCREEN_DASHBOARD
2. [DASH-01] Assert vòng tròn calo: XML chứa "Calo hôm nay" và giá trị số hiển thị
3. [DASH-02] Assert 3 thanh Macro: XML chứa "Carbs", "Protein", "Fat" đồng thời
4. Tap tab "Nhật ký" (icon index=1 trên Bottom Tab)
   → Chờ SCREEN_DIARY | Assert text "Bữa sáng" visible
5. Tap tab "Khám phá" (index=2)
   → Assert: XML chứa "Công thức" hoặc "Khám phá"
6. Tap tab "Kế hoạch" (index=3)
   → Assert: XML chứa "Thực đơn tuần" hoặc "Thứ 2"
7. Tap tab "Cá nhân" (index=4)
   → Assert: XML chứa email "smartmealuser@gmail.com"
8. Tap tab "Trang chủ" (index=0) → quay về SCREEN_DASHBOARD
9. Log summary: PASS/FAIL từng bước
```

---

### 6.5. Kịch bản `03_diary_quicklog.test.js` — Module 4 Diary QuickLog

**Mục tiêu:** Kiểm thử thêm nhanh món ăn vào nhật ký bữa sáng qua luồng QuickLog.  
**Bao phủ test case:** `E2E-DIAR-01` (P0), `E2E-DASH-03` (P1).

```
Luồng kịch bản:
1. Tiền điều kiện: SCREEN_DASHBOARD
2. Tap nút "+" nổi (FAB) → chờ SCREEN_QUICKLOG (timeout 5s)
3. [Chọn bữa] Tap "Bữa sáng" trong bottom sheet
4. [Tìm món] Tap ô tìm kiếm → type text "Chuoi" (không dấu)
5. Chờ kết quả hiện: assert XML chứa "Chuối" hoặc "Banana"
6. Tap vào dòng đầu tiên "Chuối tiêu"
7. Màn hình chỉnh khẩu phần: assert hiển thị trường số lượng
8. Xóa nội dung cũ → input text "1" → tap "Thêm vào nhật ký"
9. Chờ quay về SCREEN_DASHBOARD (dismiss sheet)
10. [Verify] Re-dump XML → assert số calo tăng (chứa text ≠ giá trị ban đầu)
     Hoặc: tap tab Nhật ký → SCREEN_DIARY → assert "Chuối" xuất hiện dưới "Bữa sáng"
11. Log: PASS E2E-DIAR-01 / E2E-DASH-03
```

---

### 6.6. Kịch bản `04_pro_upgrade_view.test.js` — Module 11 PayOS Premium (tài khoản Free)

**Mục tiêu:** Kiểm thử luồng vào màn hình nâng cấp Pro và khởi tạo đơn hàng PayOS/VietQR bằng tài khoản Free.  
**Bao phủ test case:** `E2E-PAY-01` (P0), `E2E-PAY-02` (P0).

```
Luồng kịch bản:
1. Tiền điều kiện: Khởi động lại app + đăng nhập tài khoản Free
   → email: "rowem96186@goldvester.com" / pass: "Smartmeal@123"
2. Chờ SCREEN_DASHBOARD
3. Tap tab "Cá nhân" (index=4)
4. Tap nút hoặc item "Nâng cấp Pro" / "Gói dịch vụ"
5. Chờ SCREEN_UPGRADE (timeout 6s)
6. [E2E-PAY-01] Assert: XML chứa "Nâng cấp Pro" và "49.000đ" (gói 1 tháng)
7. Tap nút "Gói 1 Tháng" → tap "Tiến hành thanh toán"
8. Chờ SCREEN_PAYOS (timeout 8s)
9. [E2E-PAY-02] Assert: XML chứa "VietQR" hoặc "Quét mã QR"
10. Assert: XML chứa "49.000" (số tiền đúng)
11. Assert: XML chứa chuỗi mã nội dung chuyển khoản (pattern: chữ + số)
12. Log: PASS E2E-PAY-01, PASS E2E-PAY-02
13. Dọn dẹp: nhấn BACK thoát về màn hình trước (không thực hiện thanh toán thật)
```

---

### 6.7. Hướng dẫn chạy bằng `run.js`

File `runner/run.js` là entry point duy nhất để khởi động bộ kiểm thử.

#### Cú pháp lệnh

```bash
# Chạy lẻ một kịch bản (theo tên file)
node runner/run.js --scenario 01_auth_login

# Chạy toàn bộ tất cả kịch bản theo thứ tự
node runner/run.js --all

# Chạy nhiều kịch bản chỉ định (phân tách bằng dấu phẩy)
node runner/run.js --scenario 01_auth_login,02_tabs_navigation
```

#### Tiền điều kiện trước khi chạy

```powershell
# Bước 1: Bật ADB port reverse (bắt buộc)
adb reverse tcp:8081 tcp:8081
adb reverse tcp:5000 tcp:5000

# Bước 2: Khởi động Metro Bundler (terminal riêng)
cd "D:/STUDY/KY8/PRM/SmartMeal/frontend/SmartMealMobile"
npx expo start --localhost

# Bước 3 (tuỳ chọn): Mở scrcpy để theo dõi trực quan
& "D:\STUDY\KY8\PRM\.agents\skills\android-scrcpy-debug\scripts\launch_scrcpy.ps1"

# Bước 4: Mở app trên thiết bị
adb shell am start -a android.intent.action.VIEW -d "exp://localhost:8081" host.exp.exponent
```

#### Ví dụ output khi chạy `--all`

```
[SmartMeal E2E Runner] Bắt đầu: 4 kịch bản
─────────────────────────────────────────
[01_auth_login]      E2E-AUTH-01   ✅ PASS  (2340ms)
[02_tabs_navigation] E2E-DASH-01   ✅ PASS  (1120ms)
                     E2E-DASH-02   ✅ PASS  ( 890ms)
                     Tab Nav ×5    ✅ PASS  (3200ms)
[03_diary_quicklog]  E2E-DIAR-01   ✅ PASS  (4560ms)
                     E2E-DASH-03   ✅ PASS  (1800ms)
[04_pro_upgrade]     E2E-PAY-01    ✅ PASS  (2100ms)
                     E2E-PAY-02    ✅ PASS  (3400ms)
─────────────────────────────────────────
Tổng kết: 8/8 PASS | 0 FAIL | Thời gian: 19.4s
```

#### Mã lỗi thoát (Exit Codes)

| Exit Code | Ý nghĩa |
| :---: | :--- |
| `0` | Tất cả kịch bản PASS |
| `1` | Có ít nhất 1 kịch bản FAIL |
| `2` | Lỗi khởi động: thiết bị ADB không kết nối hoặc file kịch bản không tìm thấy |

---
*Tài liệu này là chuẩn cơ sở để đánh giá chất lượng (QA Acceptance Criteria) và nghiệm thu chức năng đồ án tốt nghiệp SmartMeal.*
