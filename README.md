# 🥗 SmartMeal - AI-Powered Smart Nutrition & Meal Management

> **Dự án môn học**: PRM (Mobile Programming) - Đại học FPT  
> **Nền tảng**: React Native / Expo (Mobile) + ASP.NET Core & PostgreSQL (Backend API)  
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
| **Mobile App** | React Native 0.86 + Expo SDK 57 (TypeScript), TanStack Query, Zustand, Axios, NativeWind, React Hook Form + Zod, AsyncStorage / expo-secure-store |
| **Backend API** | ASP.NET Core (.NET 9), Entity Framework Core 9, RESTful Architecture |
| **Database** | PostgreSQL 16 |
| **Authentication** | JWT + refresh token, đăng nhập email + mật khẩu, OTP qua email (quên mật khẩu) |
| **AI & Machine Learning** | Google Gemini (ảnh món ăn, nhãn dinh dưỡng, tủ lạnh, giọng nói) qua backend; quét mã vạch bằng `expo-camera` |
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
│   ├── .env.example                # Mẫu biến môi trường của BE → sao chép thành backend/.env
│   └── SmartMeal.sln               # Solution file
├── frontend/SmartMealMobile/       # Mã nguồn app React Native / Expo
│   ├── src/features/<feature>/     # screens, components, hooks, services (mock/api/mapper), types
│   ├── src/services/api/           # Axios client, endpoints, interceptors (refresh token)
│   ├── src/navigation/, src/state/ # React Navigation, Zustand stores
│   ├── docs/                       # business_rule, design, structure_system, tech_stack, ui-progress
│   ├── .env.example                # Mẫu biến môi trường của app → sao chép thành frontend/SmartMealMobile/.env
│   └── package.json
├── docs/                           # Tài liệu thiết kế hệ thống, ERD, API specs
├── docker-compose.yml              # Một lệnh chạy PostgreSQL + Backend API (+ pgAdmin)
└── README.md
```

---

## 💻 HƯỚNG DẪN CÀI ĐẶT VÀ CHẠY DỰ ÁN (GETTING STARTED)

### 1. Yêu cầu môi trường (Prerequisites)
Trước khi bắt đầu, máy tính của bạn cần cài đặt sẵn:
- **Git**: [Tải tại đây](https://git-scm.com/)
- **Docker Desktop**: [Tải tại đây](https://www.docker.com/products/docker-desktop/) *(Khuyên dùng: một lệnh chạy cả PostgreSQL lẫn Backend API)*
- **.NET 9.0 SDK** *(chỉ cần khi chạy/debug API ngoài Docker)*: [Tải tại đây](https://dotnet.microsoft.com/download/dotnet/9.0)
- **Node.js 20+ và npm** *(nếu làm phần Mobile)*: [Tải tại đây](https://nodejs.org/) — app chạy bằng Expo (`npx expo start`), xem `frontend/SmartMealMobile/README.md`
- **IDE khuyên dùng**: Visual Studio Code, Visual Studio 2022, Rider hoặc Android Studio.

---

### 2. Clone dự án và Cấu hình môi trường

#### Bước 2.1: Clone repository
Mở terminal / PowerShell và chạy:
```bash
git clone https://github.com/DamThanQuy/SmartMeal.git
cd SmartMeal
```

#### Bước 2.2: Tạo file biến môi trường (mỗi phần một file, không có `.env` ở thư mục gốc)
```bash
# Backend — Windows PowerShell:
Copy-Item backend/.env.example backend/.env
# Backend — Linux/macOS/Git Bash:
cp backend/.env.example backend/.env

# App (Expo):
Copy-Item frontend/SmartMealMobile/.env.example frontend/SmartMealMobile/.env   # hoặc cp …
```

Mở `backend/.env` và điền:
- `Jwt__Key`: tự sinh khóa ngẫu nhiên ≥ 32 ký tự (lệnh mẫu có trong file). Giá trị `CHANGE_ME…` chỉ chạy được ở Development.
- `Gemini__ApiKey`: nếu muốn AI thật. Lấy miễn phí tại https://aistudio.google.com/app/apikey. Để trống thì AI trả dữ liệu mẫu (isDemo).

Mở `frontend/SmartMealMobile/.env` và đặt `EXPO_PUBLIC_USE_MOCK_API=false`, `EXPO_PUBLIC_API_URL` theo mục 5 bên dưới.

> Các file `.env` đã được `.gitignore` — **không commit**, không chép khóa thật vào file `.env.example`.

---

### 3. Cách chạy Backend API & Database

#### 🐳 Cách 1 (khuyên dùng): một lệnh chạy cả PostgreSQL và API bằng Docker
Tại thư mục gốc `SmartMeal`, chạy:
```bash
docker compose up -d --build
```

Lệnh này làm toàn bộ các bước sau:
- dựng image API từ `backend/Dockerfile`;
- khởi động PostgreSQL rồi chờ DB sẵn sàng;
- chạy API, tự áp dụng EF Core migrations và nạp dữ liệu mẫu;
- khởi động pgAdmin.

API đọc cấu hình từ `backend/.env`; chuỗi kết nối DB được compose tự trỏ tới container `postgres`.

- API: http://localhost:5000/api — Swagger: http://localhost:5000/swagger
- Điện thoại cùng Wi-Fi: `http://<IP-LAN-máy-tính>:5000/api`. Cổng 5000 mở trên mọi địa chỉ.
- Tài khoản dùng thử (Development): `smartmealuser@gmail.com` / `Smartmeal@123`

Các lệnh hay dùng:
```bash
docker compose ps                    # trạng thái
docker compose logs -f backend-api   # log API (ở Development có cả mã OTP email)
docker compose up -d --build         # chạy lại sau khi sửa code backend
docker compose down                  # dừng; dữ liệu DB và ảnh đại diện vẫn giữ trong volume
```

> ⚡ Không cần chạy `dotnet ef database update`: API tự migrate và seed dữ liệu mẫu khi khởi động. Dữ liệu mẫu gồm nguyên liệu, công thức, danh mục dị ứng/bệnh lý và thử thách.

---

#### 🔥 Cách 2: debug API ngoài Docker (hot reload)
Chỉ chạy DB bằng Docker, còn API chạy bằng .NET CLI để debug trên IDE. API đọc `backend/.env`; chuỗi kết nối trong file mẫu đã trỏ tới `localhost:5432`.
```bash
docker compose up -d postgres
dotnet watch run --project backend/SmartMeal.API --launch-profile http   # http://localhost:5000
```
Nếu container `backend-api` đang chạy, dừng nó trước để nhả cổng 5000: `docker compose stop backend-api`.

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

### 5. Hướng dẫn dành cho Mobile Developers (React Native / Expo)

Docker Compose không chạy app; app chạy riêng bằng Expo: `cd frontend/SmartMealMobile && npm install && npx expo start`.

Đặt `EXPO_PUBLIC_API_URL` trong `frontend/SmartMealMobile/.env` (xem `frontend/SmartMealMobile/.env.example`). Đổi xong chạy lại `npx expo start --clear`:

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
