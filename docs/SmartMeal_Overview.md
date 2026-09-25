# SmartMeal
## Tài liệu Giới thiệu Ứng dụng & Tính năng

> **Ghi chú**: Đây là dự án thực hiện cho môn học **PRM (Mobile Programming)** - **Đại học FPT**.

---

### 1. Giới thiệu tổng quan
SmartMeal là một ứng dụng di động toàn diện giúp người dùng quản lý dinh dưỡng, theo dõi sức khỏe và tìm kiếm công thức nấu ăn phù hợp với nhu cầu cá nhân. Với nền tảng Flutter hiện đại, ứng dụng cung cấp trải nghiệm người dùng mượt mà trên cả Android và iOS, tích hợp chặt chẽ với backend API để cung cấp dữ liệu dinh dưỡng chính xác và cập nhật.

Ứng dụng được thiết kế với tư duy người dùng, tập trung vào việc giúp người dùng đạt được mục tiêu sức khỏe thông qua:
- Theo dõi nhật ký dinh dưỡng hàng ngày
- Tìm kiếm và lưu trữ công thức nấu ăn yêu thích
- Cá nhân hóa gợi ý thực đơn dựa trên tình trạng sức khỏe
- Quản lý danh sách thực phẩm và nhu cầu dinh dưỡng

---

### 2. Các tính năng chính

#### 1. Đăng nhập & Đăng ký
- Đăng nhập bằng tài khoản (username/password)
- Đăng ký tài khoản mới với xác thực OTP
- Đăng nhập bằng Google
- Quản lý avatar và thông tin cá nhân

#### 2. Dashboard
- Tổng quan dinh dưỡng hàng ngày (calories, carbs, fat, protein)
- Hiển thị các món ăn yêu thích
- Lịch sử nhật ký dinh dưỡng gần đây
- Thông báo và cập nhật

#### 3. Gợi ý bữa ăn
- Tìm kiếm công thức nấu ăn theo từ khóa
- Lọc theo tag và loại thực phẩm
- Xem chi tiết công thức (nguyên liệu, hướng dẫn nấu)
- Lưu vào danh sách yêu thích
- Gợi ý dựa trên pantry hiện có

#### 4. Nhật ký dinh dưỡng
- Ghi lại bữa ăn đã ăn
- Theo dõi lượng calo, carbs, fat, protein
- So sánh với mục tiêu dinh dưỡng hàng ngày
- Biểu đồ trực quan hiển thị tiến độ
- Xóa nhật ký đã ghi

#### 5. Bộ sưu tập & Yêu thích
- Tạo và quản lý bộ sưu tập công thức
- Lưu/bỏ lưu các món ăn yêu thích
- Xem danh sách recipe đã lưu
- Tìm kiếm trong bộ sưu tập

#### 6. Hồ sơ sức khỏe
- Điền khảo sát sức khỏe ban đầu
- Theo dõi chỉ số BMI
- Lưu lịch sử cân nặng
- Quản lý các tình trạng y tế và dị ứng
- Cá nhân hóa gợi ý thực đơn

#### 7. Danh sách thực phẩm & Nguyên liệu
- Xem danh sách thực phẩm có sẵn
- Tìm kiếm nguyên liệu theo tên
- Xem chi tiết và giá trung bình
- Lọc theo tag (thực phẩm tươi, đông lạnh, v.v.)

#### 8. Thực đơn tuần
- Lên kế hoạch bữa ăn cho tuần
- Cá nhân hóa theo mục tiêu dinh dưỡng
- Theo dõi tiến độ thực đơn
- Tích hợp với nhật ký dinh dưỡng

#### 9. Gói Premium (Pro)
- Xem các gói đăng ký
- Nâng cấp thành viên Pro
- Truy cập tính năng nâng cao
- Quản lý gói subscription

#### 10. Cá nhân hóa
- Cá nhân hóa mục tiêu dinh dưỡng
- Gợi ý recipe phù hợp với tình trạng sức khỏe
- Tự động điều chỉnh gợi ý theo lịch sử
- Hỗ trợ nhiều ngôn ngữ

---

### 3. Công nghệ & Kiến trúc hệ thống
SmartMeal được xây dựng trên nền tảng công nghệ hiện đại và đồng bộ:

| Thành phần | Công nghệ sử dụng |
| :--- | :--- |
| Mobile | Flutter 3.13.2 |
| Backend | ASP.NET Core |
| Database | PostgreSQL |
| State Management | Provider |
| HTTP Client | Dio |
| Local Storage | SharedPreferences |
| Authentication | Google Sign-In |
| Charts | fl_chart |

---

### 4. Tính năng nâng cao
- Hỗ trợ offline (caching dữ liệu cục bộ)
- Giao diện tối (Dark mode) bảo vệ mắt
- Thiết kế thích ứng (Responsive design) trên mọi thiết bị
- Hiệu ứng chuyển cảnh mượt mà (Smooth animations)
- Hệ thống thông báo đẩy (Push notifications)
- Hỗ trợ đa ngôn ngữ (Multi-language support)

---

### 5. Kết luận
Ứng dụng SmartMeal là giải pháp toàn diện cho người quan tâm đến sức khỏe và dinh dưỡng, giúp họ quản lý bữa ăn hàng ngày một cách khoa học, hiệu quả và trực quan nhất.
