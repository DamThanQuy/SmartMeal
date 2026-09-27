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
| **Database** | PostgreSQL 16 |
| **Authentication** | JWT (JSON Web Token), Google Sign-In, Email/SMS OTP |
| **AI & Machine Learning** | Google Gemini Vision API, Google ML Kit (OCR & Barcode Scanner) |
| **Health Integration** | Google Health Connect / Apple HealthKit |
| **DevOps / Containers** | Docker & Docker Compose |

---

## 📂 Cấu trúc thư mục dự án (Project Structure)

```text
SmartMeal/
├── backend/                        # Mã nguồn ASP.NET Core Backend API
│   ├── SmartMeal.Domain/           # Entities, Enums, Model Interfaces
│   ├── SmartMeal.Application/      # DTOs, Service Interfaces & Business Logic
│   ├── SmartMeal.Infrastructure/   # EF Core DbContext, Repositories, Migrations, Seed Data
│   ├── SmartMeal.API/              # Controllers, Program.cs, Middleware, Swagger
│   ├── Dockerfile                  # Container build cho Backend API
│   └── SmartMeal.sln               # Solution file
├── mobile/                         # Mã nguồn Flutter Mobile App
│   ├── lib/
│   │   ├── models/                 # Data Models
│   │   ├── views/                  # UI Screens & Custom Widgets
│   │   ├── viewmodels/             # State Management (Provider/Riverpod)
│   │   └── services/               # API Services & Local Storage
│   └── pubspec.yaml
├── docs/                           # Tài liệu thiết kế hệ thống, ERD, API specs
├── docker-compose.yml              # Chạy PostgreSQL, pgAdmin & Backend API
├── .env.example                    # File mẫu biến môi trường
└── README.md
```

---

## 💻 HƯỚNG DẪN CÀI ĐẶT VÀ CHẠY DỰ ÁN (GETTING STARTED)

### 1. Yêu cầu môi trường (Prerequisites)
Trước khi bắt đầu, máy tính của bạn cần cài đặt sẵn:
- **Git**: [Tải tại đây](https://git-scm.com/)
- **.NET 8.0 SDK**: [Tải tại đây](https://dotnet.microsoft.com/download/dotnet/8.0)
- **Docker Desktop**: [Tải tại đây](https://www.docker.com/products/docker-desktop/) *(Khuyên dùng để chạy PostgreSQL và pgAdmin nhanh chóng)*
- **Flutter SDK** *(nếu làm phần Mobile)*: [Tải tại đây](https://docs.flutter.dev/get-started/install)
- **IDE khuyên dùng**: Visual Studio Code, Visual Studio 2022, Rider hoặc Android Studio.

---

### 2. Clone dự án và Cấu hình môi trường

#### Bước 2.1: Clone repository
Mở terminal / PowerShell và chạy:
```bash
git clone https://github.com/DamThanQuy/SmartMeal.git
cd SmartMeal
```

#### Bước 2.2: Tạo file biến môi trường `.env`
Sao chép file `.env.example` thành `.env`:
```bash
# Trên Windows PowerShell:
Copy-Item .env.example .env

# Trên Linux/macOS:
cp .env.example .env
```

Mở file `.env` vừa tạo và điền các thông tin (đặc biệt là API Key Google Gemini nếu muốn test AI Vision):
```env
# Database (PostgreSQL)
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgrespassword
POSTGRES_DB=SmartMealDb
POSTGRES_PORT=5432
ConnectionStrings__DefaultConnection=Host=localhost;Port=5432;Database=SmartMealDb;Username=postgres;Password=postgrespassword

# JWT Authentication
Jwt__Key=SmartMeal_SuperSecret_Jwt_Security_Key_2026_FPT_PRM393_VeryLongAndSecureKey!
Jwt__Issuer=SmartMealBackend
Jwt__Audience=SmartMealMobile

# Google Gemini AI API (Lấy miễn phí tại: https://aistudio.google.com/app/apikey)
Gemini__ApiKey=YOUR_GEMINI_API_KEY_HERE
Gemini__Model=gemini-1.5-flash

# Port Settings
API_PORT=5000
PGADMIN_PORT=5050
```

---

### 3. Cách chạy Backend API & Database

Bạn có thể lựa chọn 1 trong 2 cách chạy dưới đây:

#### 🔥 Cách 1: Chạy Database bằng Docker + Chạy API bằng .NET CLI (KHUYÊN DÙNG CHO DEV)
Cách này giúp bạn code API có **Hot Reload**, debug dễ dàng trên IDE mà không cần cài đặt thủ công PostgreSQL.

**1. Khởi động PostgreSQL & pgAdmin:**
```bash
docker compose up -d postgres pgadmin
```
*(Kiểm tra container chạy ổn định bằng lệnh `docker ps`)*

**2. Di chuyển vào thư mục API và chạy:**
```bash
cd backend/SmartMeal.API
dotnet run --launch-profile http
```
> 💡 *Mẹo: Dùng `dotnet watch run --launch-profile http` để tự động reload khi sửa code C#.*

> ⚡ **Tự động khởi tạo Database & Seed Data**: Khi API khởi động, hệ thống sẽ **tự động chạy EF Core Migrations** tạo bảng và nạp sẵn dữ liệu mẫu (12+ nguyên liệu, 6 công thức món ăn chuẩn Eat Clean/Keto, danh mục dị ứng, bệnh lý, thử thách). Bạn không cần chạy lệnh `dotnet ef database update` thủ công!

---

#### 🐳 Cách 2: Chạy toàn bộ hệ thống bằng Docker Compose
Dành cho việc kiểm thử tích hợp toàn bộ hệ thống trên môi trường độc lập:
```bash
# Từ thư mục gốc SmartMeal:
docker compose up --build -d
```
Lệnh trên sẽ tự động dựng và chạy:
1. Container `smartmeal_postgres` (Port 5432)
2. Container `smartmeal_pgadmin` (Port 5050)
3. Container `smartmeal_api` (Port 5000)

Dừng hệ thống khi không sử dụng:
```bash
docker compose down
```

---

### 4. Kiểm tra và Trải nghiệm API (API Documentation & Testing)

Sau khi khởi động API thành công:

| Dịch vụ | Địa chỉ truy cập | Ghi chú |
| :--- | :--- | :--- |
| **Swagger UI** | [http://localhost:5000/swagger](http://localhost:5000/swagger) | Giao diện tương tác trực tiếp & test toàn bộ API |
| **pgAdmin 4** | [http://localhost:5050](http://localhost:5050) | Quản trị CSDL PostgreSQL qua giao diện Web |
| **PostgreSQL Port** | `localhost:5432` | Kết nối bằng DBeaver / DataGrip / Navicat |

#### 🔑 Thông tin đăng nhập pgAdmin:
- **Email**: `admin@smartmeal.com`
- **Password**: `admin`
- **Thêm Server kết nối Postgres trong pgAdmin**:
  - *Host name/address*: `postgres` (nếu chạy trong docker) hoặc `localhost` (nếu từ máy chủ)
  - *Port*: `5432`
  - *Maintenance database*: `SmartMealDb`
  - *Username*: `postgres`
  - *Password*: `postgrespassword`

---

### 5. Hướng dẫn dành cho Mobile Developers (Flutter)

Khi kết nối ứng dụng Flutter tới Backend API:

1. **Chạy trên Android Emulator**:
   - Sử dụng Base URL: `http://10.0.2.2:5000/api`
   *(Vì Android Emulator ánh xạ `localhost` của máy host thành `10.0.2.2`)*
2. **Chạy trên iOS Simulator**:
   - Sử dụng Base URL: `http://localhost:5000/api`
3. **Chạy trên Thiết bị thật (Real Physical Device)**:
   - Đảm bảo điện thoại và máy tính kết nối **chung một mạng Wi-Fi**.
   - Tìm địa chỉ IP LAN của máy tính (chạy lệnh `ipconfig` trên Windows hoặc `ifconfig` trên Mac/Linux, ví dụ: `192.168.1.15`).
   - Sử dụng Base URL: `http://192.168.1.15:5000/api`

---

### 6. Quy trình làm việc với Git (Git Collaboration Workflow)

Để phối hợp làm việc nhóm hiệu quả, các thành viên tuân thủ quy tắc sau:

1. **Cập nhật code mới nhất từ nhánh `main` trước khi làm**:
   ```bash
   git checkout main
   git pull origin main
   ```
2. **Tạo nhánh mới theo tính năng / module**:
   - Tính năng mới: `git checkout -b feature/ten-tinh-nang`
   - Sửa lỗi: `git checkout -b fix/ten-loi`
3. **Commit rõ ràng, mạch lạc**:
   ```bash
   git add .
   git commit -m "feat(recipe): Add recipe search and category filtering"
   ```
4. **Đẩy nhánh lên GitHub và tạo Pull Request**:
   ```bash
   git push origin feature/ten-tinh-nang
   ```
   Tạo Pull Request trên GitHub để các thành viên review trước khi merge vào `main`.

---

## 👥 Thành viên nhóm & Phân chia công việc

- **DamThanQuy**: Backend Lead & Architecture (ASP.NET Core .NET 8, PostgreSQL, AI Vision, Docker).
- **An-251 (Nguyễn Dương Ân)**: Mobile Developer / Full-stack Collaborator.
- **annguyennhat11a221-creator (Nguyễn Nhật An)**: Mobile Developer / Full-stack Collaborator.
- **thienphanchan**: Team Collaborator.
- **NTBAao**: Team Collaborator.

---

## 📄 License
Dự án được phát triển phục vụ mục đích học tập tại **Đại học FPT**.
