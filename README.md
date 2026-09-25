# 🥗 SmartMeal - AI-Powered Smart Nutrition & Meal Management

> **Dự án môn học**: PRM (Mobile Programming) - Đại học FPT  
> **Nền tảng**: Flutter (Mobile) + ASP.NET Core & PostgreSQL (Backend API)  
> **Phiên bản**: V2 (Tích hợp AI Vision, Voice Logging, OCR Scanner, Health Sync, Gamification)

---

## 📖 Giới thiệu tổng quan (Overview)

**SmartMeal** là ứng dụng di động toàn diện kết hợp trí tuệ nhân tạo (AI) giúp người dùng quản lý dinh dưỡng, theo dõi sức khỏe, tối ưu chi phí sinh hoạt và tìm kiếm công thức nấu ăn thông minh. Ứng dụng giải quyết triệt để sự nhàm chán và rườm rà của việc nhập liệu thủ công bằng cách ứng dụng công nghệ **AI Vision (Snap & Track đĩa ăn, Quét tủ lạnh)**, **Nhận diện giọng nói (Voice Logging)**, **OCR Quét nhãn dinh dưỡng (Google ML Kit)** và **Đồng bộ thiết bị đeo (Health Connect / Apple Health)**.

---

## 🚀 Tính năng nổi bật (Key Features)

### 1. 🤖 AI & Công nghệ đột phá
- **AI Snap & Track**: Chụp ảnh đĩa thức ăn -> AI tự động nhận diện món, bóc tách hàm lượng Calories, Carbs, Fat, Protein.
- **Fridge Scanner (Quét tủ lạnh)**: Chụp ảnh các nguyên liệu sẵn có trong tủ lạnh -> AI gợi ý 3 món ăn có thể nấu ngay để tránh lãng phí.
- **AI Voice Logging**: Ghi nhận bữa ăn bằng giọng nói tự nhiên qua Speech-to-Text và xử lý ngôn ngữ tự nhiên.
- **OCR Nutrition Facts & Barcode Scanner**: Quét mã vạch và bảng thành phần dinh dưỡng trên bao bì sản phẩm qua Google ML Kit, tự động cảnh báo chất gây dị ứng hoặc vượt mức đường/muối.

### 2. 📊 Theo dõi dinh dưỡng & Sức khỏe
- **Smart Dashboard**: Tổng quan Calo và Macros nạp trong ngày.
- **Dynamic Calorie Budget**: Tự động tính toán ngân sách calo động (Calo mục tiêu + Calo tiêu hao từ vận động).
- **Hồ sơ sức khỏe & Bệnh lý**: Tự động tính chỉ số BMI, BMR, TDEE, quản lý danh sách dị ứng thực phẩm và tình trạng bệnh lý (tiểu đường, gout, cao huyết áp).
- **Biểu đồ tiến độ trực quan**: Theo dõi lịch sử cân nặng và tiến độ dinh dưỡng theo tuần/tháng.

### 3. 🍳 Thực đơn & Mua sắm thông minh
- **Công thức nấu ăn đa dạng**: Tìm kiếm, lọc theo chế độ ăn (Eat Clean, Keto, Thuần chay, Low-Carb,...), xem hướng dẫn từng bước.
- **Lập kế hoạch bữa ăn theo tuần**: Phân bổ bữa ăn khoa học (Sáng, Trưa, Tối, Phụ) theo mục tiêu calo.
- **Smart Grocery List**: Tự động tổng hợp danh sách đi chợ theo tuần, nhóm theo quầy siêu thị và ước tính chi phí.

### 4. 🎮 Trải nghiệm người dùng & Gamification
- **Health Pet**: Nuôi linh vật sức khỏe ảo phản ánh trạng thái dinh dưỡng thực tế.
- **Streak & Thử thách cộng đồng**: Chuỗi ngày ăn uống lành mạnh và các thử thách nhóm (7 ngày Eat Clean, 14 ngày Không Nước Ngọt).
- **Hỗ trợ Offline & Dark Mode**: Caching dữ liệu cục bộ và giao diện tối bảo vệ mắt.

---

## 🛠️ Công nghệ & Kiến trúc hệ thống (Tech Stack)

| Thành phần | Công nghệ sử dụng |
| :--- | :--- |
| **Mobile App** | Flutter 3.13.2+ (Dart), Provider / Riverpod, Dio, fl_chart, SharedPreferences |
| **Backend API** | ASP.NET Core (.NET 8), Entity Framework Core, RESTful Architecture |
| **Database** | PostgreSQL |
| **Authentication** | JWT (JSON Web Token), Google Sign-In, Email/SMS OTP |
| **AI & Machine Learning** | Google Gemini Vision API, Google ML Kit (OCR & Barcode Scanner) |
| **Health Integration** | Google Health Connect / Apple HealthKit |

---

## 📂 Cấu trúc thư mục dự án (Project Structure)

```text
SmartMeal/
├── backend/                  # Mã nguồn ASP.NET Core Backend API
│   ├── SmartMeal.Domain/     # Entities, Enums, Interfaces
│   ├── SmartMeal.Application/# Services, DTOs, Business Logic
│   ├── SmartMeal.Infrastructure/ # EF Core DbContext, Repositories, Migrations
│   └── SmartMeal.API/        # Controllers, Middlewares, Program.cs
├── mobile/                   # Mã nguồn Flutter Mobile App
│   ├── lib/
│   │   ├── models/           # Data Models
│   │   ├── views/            # UI Screens & Widgets
│   │   ├── viewmodels/       # State Management (Provider/Riverpod)
│   │   └── services/         # API Services & Local Storage
│   └── pubspec.yaml
└── docs/                     # Tài liệu thiết kế hệ thống, ERD, API specs
```

---

## 👥 Thành viên nhóm & Phân chia công việc

- **Mobile Lead**: Thiết kế UI/UX Flutter, tích hợp Camera ML Kit, kết nối API.
- **Backend Lead**: Thiết kế Database PostgreSQL, xây dựng RESTful API ASP.NET Core, xác thực JWT, tích hợp Gemini AI.

---

## 📄 License
Dự án được phát triển phục vụ mục đích học tập tại **Đại học FPT**.
