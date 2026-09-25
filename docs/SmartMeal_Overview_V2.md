# SmartMeal
## Tài liệu Giới thiệu Ứng dụng & Tính năng (Phiên bản Đề xuất Đột phá - V2)

> **Ghi chú**: Đây là dự án thực hiện cho môn học **PRM (Mobile Programming)** - **Đại học FPT**.  
> **Phiên bản V2**: Kế thừa toàn bộ các tính năng nền tảng và tích hợp thêm các công nghệ hiện đại (**AI Vision, Voice Logging, OCR Scanner, Health Sync, Gamification, Smart Grocery**) nhằm nâng cao trải nghiệm người dùng và tính ứng dụng thực tế.

---

### 1. Giới thiệu tổng quan
**SmartMeal** là ứng dụng di động toàn diện kết hợp trí tuệ nhân tạo (AI) giúp người dùng quản lý dinh dưỡng, theo dõi sức khỏe, tối ưu chi phí sinh hoạt và tìm kiếm công thức nấu ăn thông minh. Với nền tảng **Flutter** hiện đại và backend **ASP.NET Core + PostgreSQL**, ứng dụng mang lại trải nghiệm mượt mà, tiện lợi, loại bỏ sự rườm rà của việc nhập liệu thủ công truyền thống.

Ứng dụng tập trung giải quyết các bài toán thực tế:
- **Tự động hóa ghi nhận dinh dưỡng**: Nhận diện món ăn qua hình ảnh và giọng nói bằng AI.
- **Cá nhân hóa chuyên sâu**: Đề xuất thực đơn theo chỉ số sức khỏe, bệnh lý và dị ứng.
- **Tiết kiệm & Chống lãng phí**: Quét nguyên liệu tủ lạnh để gợi ý món ăn và tự động sinh danh sách đi chợ theo tuần.
- **Tạo động lực duy trì lối sống lành mạnh**: Gamification nuôi linh vật sức khỏe và đồng bộ vận động từ Smartwatch.

---

### 2. Các tính năng chính

#### 1. Đăng nhập & Đăng ký (Authentication & User Profile)
- Đăng nhập bằng tài khoản (Email/Username & Password).
- Đăng ký tài khoản mới kèm xác thực mã OTP qua Email/SMS.
- Đăng nhập nhanh bằng Google (Google Sign-In).
- Quản lý hồ sơ người dùng, cập nhật Avatar và thông tin cá nhân.

#### 2. Dashboard Thông minh (Smart Dashboard)
- Tổng quan năng lượng nạp trong ngày (Calories, Carbs, Fat, Protein).
- **Dynamic Calorie Budget**: Tự động tính toán ngân sách calo động (Calo mục tiêu + Calo tiêu hao từ vận động).
- Hiển thị linh vật sức khỏe (Pet) biểu thị trạng thái dinh dưỡng trong ngày.
- Lịch sử nhật ký dinh dưỡng gần nhất & Lối tắt ghi nhanh (Quick Log).
- Thông báo nhắc nhở uống nước, ghi nhận bữa ăn đúng giờ.

#### 3. AI Vision & Gợi ý bữa ăn thông minh (Smart Meal & AI Suggestions)
- Tìm kiếm công thức nấu ăn theo từ khóa, danh mục, thời gian nấu và mức độ calo.
- Lọc công thức theo chế độ ăn (Eat Clean, Keto, Thuần chay, Low-Carb,...).
- **Fridge Scanner (Quét tủ lạnh)**: Chụp ảnh các nguyên liệu đang có trong tủ lạnh -> AI phân tích và gợi ý ngay các món ăn nấu được từ nguyên liệu đó.
- Xem chi tiết công thức (định lượng nguyên liệu, video/hướng dẫn từng bước, giá trị dinh dưỡng).
- Lưu công thức vào danh sách yêu thích và bộ sưu tập cá nhân.

#### 4. Nhật ký dinh dưỡng đa phương thức (Multi-modal Nutrition Diary)
- **AI Snap & Track (Chụp ảnh đĩa ăn)**: Chụp ảnh bữa ăn -> AI tự động nhận diện món, ước tính khối lượng, calo, macro và tự điền vào nhật ký.
- **AI Voice Logging (Ghi nhận bằng giọng nói)**: Nói câu tự nhiên (ví dụ: *"Sáng nay ăn 1 bát bún bò và 1 ly nước cam"*) -> AI bóc tách và tự log vào bữa ăn.
- **Ghi nhận thủ công**: Tìm kiếm nguyên liệu/món ăn có sẵn trong cơ sở dữ liệu.
- Theo dõi biểu đồ tiến độ dinh dưỡng theo ngày, tuần, tháng.
- Quản lý, chỉnh sửa hoặc xóa nhật ký đã ghi.

#### 5. OCR & Quét nhãn dinh dưỡng (Smart Nutrition & Barcode Scanner)
- **Quét mã vạch (Barcode Scanner)**: Quét mã vạch các sản phẩm thực phẩm đóng gói để lấy thông tin dinh dưỡng chính xác.
- **OCR Nutrition Facts Scanner**: Dùng camera quét trực tiếp bảng thành phần dinh dưỡng sau bao bì sản phẩm qua Google ML Kit.
- **Cảnh báo tức thì (Smart Safety Alert)**: Tự động cảnh báo nếu sản phẩm chứa chất gây dị ứng hoặc vượt mức đường/muối khuyến nghị theo hồ sơ cá nhân.

#### 6. Bộ sưu tập & Yêu thích (Collections & Favorites)
- Tạo và phân loại các bộ sưu tập công thức nấu ăn (ví dụ: *Bữa sáng nhanh, Món ăn giảm cân, Món cuối tuần*).
- Đánh dấu yêu thích món ăn chỉ với một chạm.
- Tìm kiếm và chia sẻ bộ sưu tập món ăn.

#### 7. Hồ sơ sức khỏe & Cá nhân hóa (Health Profile & Personalization)
- Khảo sát sức khỏe ban đầu (Giới tính, tuổi, chiều cao, cân nặng hiện tại, mục tiêu tăng/giảm cân, mức độ vận động).
- Hệ thống tự động tính toán chỉ số **BMI, BMR, TDEE** và phân bổ tỷ lệ Macros tiêu chuẩn.
- Theo dõi biểu đồ lịch sử biến động cân nặng.
- Quản lý danh sách bệnh lý (tiểu đường, gout, cao huyết áp) và dị ứng thực phẩm (hải sản, đậu phộng, sữa,...).
- Thuật toán tự động lọc và loại bỏ các món ăn không an toàn khỏi danh sách đề xuất.

#### 8. Danh mục Thực phẩm & Nguyên liệu (Food & Ingredients Database)
- Cơ sở dữ liệu phong phú về các loại thực phẩm, rau củ quả, thịt cá phổ biến.
- Thông tin chi tiết về đơn vị đo, hàm lượng calo, macro và giá bán trung bình theo thị trường.
- Phân loại thực phẩm theo nhóm: Tươi sống, đông lạnh, ngũ cốc, gia vị.

#### 9. Thực đơn tuần & Danh sách đi chợ thông minh (Meal Planner & Smart Grocery)
- Lên kế hoạch thực đơn chi tiết cho từng ngày trong tuần (Sáng, Trưa, Tối, Phụ).
- Đảm bảo thực đơn tuần đáp ứng đúng mục tiêu calo và phân bổ dinh dưỡng.
- **Smart Grocery List**: Tự động tổng hợp toàn bộ nguyên liệu cần mua cho cả tuần, cộng dồn khối lượng và phân nhóm theo quầy siêu thị (Quầy rau, Quầy thịt, Gia vị,...).
- Ước tính tổng chi phí đi chợ cho cả tuần và hỗ trợ check-off tiện lợi khi mua sắm.

#### 10. Đồng bộ Sức khỏe & Thiết bị đeo (Health Connect / Apple Health Integration)
- Kết nối và đồng bộ dữ liệu với Google Health Connect / Apple Health.
- Tự động lấy số bước chân, quãng đường và năng lượng tiêu hao (Active Calories) trong ngày.
- Cập nhật năng lượng tiêu thụ vào biểu đồ tổng quan calo.

#### 11. Gamification: Linh vật sức khỏe & Thử thách (Health Pet & Challenges)
- Nuôi linh vật sức khỏe ảo (Pet) phản ánh trạng thái dinh dưỡng thực tế của người dùng.
- Hoàn thành mục tiêu ăn uống lành mạnh và uống đủ nước để tăng cấp linh vật, mở khóa trang phục mới.
- Hệ thống **Streak** (chuỗi ngày duy trì dinh dưỡng) và huy hiệu thành tích (Badges).
- Thử thách dinh dưỡng cộng đồng (ví dụ: *7 ngày Eat Clean, 14 ngày Không Nước Ngọt*).

#### 12. Gói Nâng cao (Premium / Pro Membership)
- Xem bảng so sánh quyền lợi giữa tài khoản Miễn phí và Pro.
- Mở khóa toàn bộ tính năng cao cấp: Không giới hạn lượt AI Snap & Track, quét tủ lạnh không giới hạn, gợi ý thực đơn chuyên sâu theo bệnh lý.
- Tích hợp cổng thanh toán mô phỏng/trực tuyến (VNPAY / MoMo / Stripe) và quản lý gói thuê bao.

---

### 3. Công nghệ & Kiến trúc hệ thống
SmartMeal kết hợp kiến trúc phân tầng hiện đại giữa nền tảng Mobile và Backend:

| Thành phần | Công nghệ sử dụng | Mục đích / Vai trò |
| :--- | :--- | :--- |
| **Mobile Framework** | Flutter 3.13.2+ | Phát triển ứng dụng đa nền tảng iOS & Android |
| **Backend Framework** | ASP.NET Core (.NET 8) | RESTful API hiệu năng cao, bảo mật và mở rộng tốt |
| **Database** | PostgreSQL | Cơ sở dữ liệu quan hệ mạnh mẽ, lưu trữ an toàn |
| **State Management** | Provider / Riverpod | Quản lý trạng thái ứng dụng phản trực quan |
| **HTTP Client** | Dio | Xử lý mạng, interceptor JWT token, cache |
| **Local Storage** | SharedPreferences / Hive | Lưu trữ token, cài đặt ứng dụng và cache offline |
| **Authentication** | JWT + Google Sign-In | Xác thực phân quyền người dùng an toàn |
| **AI Vision & NLP** | Google Gemini API / LLM | Nhận diện món ăn qua ảnh, quét tủ lạnh, bóc tách giọng nói |
| **On-device ML / OCR** | Google ML Kit | Quét mã vạch và OCR nhận diện bảng thành phần bao bì |
| **Health Sync** | Health Connect / Apple HealthKit | Đồng bộ bước chân và calo tiêu hao từ thiết bị đeo |
| **Data Visualization** | fl_chart | Vẽ biểu đồ dinh dưỡng, cân nặng và calo trực quan |

---

### 4. Tính năng nâng cao & Trải nghiệm người dùng (UX)
- **Hỗ trợ Offline**: Caching dữ liệu công thức và nhật ký để xem ngay cả khi mất mạng.
- **Giao diện Tối (Dark Mode)**: Tự động chuyển đổi theo hệ thống, bảo vệ mắt.
- **Thiết kế Thích ứng (Responsive UI)**: Tương thích tối ưu trên các kích thước màn hình điện thoại và máy tính bảng.
- **Micro-Animations & Motion**: Hiệu ứng chuyển trang mượt mà, tăng độ sinh động cho ứng dụng.
- **Thông báo đẩy thông minh (Push Notifications)**: Nhắc nhở ăn uống đúng giờ dựa trên lịch sinh hoạt của người dùng.
- **Đa ngôn ngữ (Tiếng Việt / Tiếng Anh)**.

---

### 5. Kết luận
Phiên bản **SmartMeal V2** giải quyết triệt để sự nhàm chán của các ứng dụng đếm calo truyền thống bằng cách tận dụng sức mạnh của **Trí tuệ nhân tạo (AI)**, **Xử lý ảnh (ML Kit)** và **Cơ chế Gamification**. Đây là giải pháp công nghệ toàn diện, có tính ứng dụng cao và đáp ứng hoàn hảo các tiêu chí đổi mới sáng tạo cho đồ án môn học PRM.
