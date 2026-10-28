# 🚀 SmartMeal Mobile — End-to-End (E2E) Test Runner

> **Dự án**: SmartMeal — Ứng dụng Quản lý Dinh dưỡng & Lập Thực đơn Thông minh với AI  
> **Thư mục**: `SmartMeal/docs/test/end-to-end/runner/`  
> **Kiến trúc**: Node.js thuần (Pure Node.js) tương tác trực tiếp qua ADB (`Android Debug Bridge`) và `UIAutomator XML Dump`. Không cần các framework cồng kềnh như Appium hay Detox.

---

## 📑 Mục Lục
1. [Giới thiệu tổng quan](#1-giới-thiệu-tổng-quan)
2. [Cấu trúc thư mục](#2-cấu-trúc-thư-mục)
3. [Tiền điều kiện môi trường](#3-tiền-điều-kiện-môi-trường)
4. [Hướng dẫn sử dụng CLI (`run.js`)](#4-hướng-dẫn-sử-dụng-cli-runjs)
5. [Chi tiết 4 Kịch bản kiểm thử](#5-chi-tiết-4-kịch-bản-kiểm-thử)
6. [Báo cáo HTML & Ảnh chụp đối chứng (Artifacts)](#6-báo-cáo-html--ảnh-chụp-đối-chứng-artifacts)
7. [Xử lý sự cố thường gặp (Troubleshooting)](#7-xử-lý-sự-cố-thường-gặp-troubleshooting)

---

## 1. Giới thiệu tổng quan

Hệ thống test E2E tự động hóa hoàn toàn các luồng người dùng thực tế trên ứng dụng **SmartMeal Mobile (Expo / React Native)** chạy trên thiết bị Android:
- Tự động nhận diện thiết bị cắm qua cáp USB Debugging.
- Tự động thiết lập đảo chiều cổng mạng (`adb reverse` 8081, 5000, 5432) để ứng dụng kết nối liền mạch về máy tính Local.
- Bật visual touches (hiển thị chấm chạm tròn và tọa độ con trỏ) giúp việc ghi hình/demo rõ ràng.
- Đọc cây giao diện `uiautomator dump` để xác định chính xác vị trí các nút, ô nhập liệu và nội dung.
- Chụp ảnh màn hình đối chứng ở từng bước (`step_XX_*.png`) và tổng hợp thành báo cáo HTML tương tác chuyên nghiệp.

---

## 2. Cấu trúc thư mục

```
runner/
├── run.js                      # Entry point CLI: menu chạy lẻ hoặc toàn bộ suite
├── index.js                    # Xuất hợp nhất các module tiện ích
├── config.js                   # Cấu hình đường dẫn ADB, Scrcpy, Port, Timeouts
├── package.json                # Định nghĩa npm scripts
├── README.md                   # Hướng dẫn chi tiết sử dụng
├── lib/
│   ├── adb-driver.js           # Wrapper điều khiển ADB (tap, text, keyevent, screencap, reverse)
│   ├── ui-inspector.js         # Phân tích XML UIAutomator, tìm element theo query/regex
│   ├── screen-detector.js      # Nhận diện màn hình thông qua Screen Signatures
│   ├── visual-debugger.js      # Bật/tắt show_touches và pointer_location trên Android
│   └── reporter.js             # Bộ tạo báo cáo HTML Timeline độc lập (Data URI ảnh nhúng)
├── scenarios/
│   ├── 01_auth_login.test.js   # Kịch bản 1: Đăng nhập tài khoản Pro (smartmealuser@gmail.com)
│   ├── 02_tabs_navigation.test.js # Kịch bản 2: Điều hướng 5 Tab chính
│   ├── 03_diary_quicklog.test.js # Kịch bản 3: Ghi nhanh bữa ăn & cập nhật Calo
│   └── 04_pro_upgrade_view.test.js # Kịch bản 4: Đăng nhập Free & Xem gói Pro PayOS
└── artifacts/                  # Thư mục sinh tự động chứa báo cáo & ảnh chụp
    ├── screenshots/            # Ảnh chụp từng bước của các kịch bản
    └── reports/                # File HTML báo cáo kết quả chi tiết
```

---

## 3. Tiền điều kiện môi trường

1. **Thiết bị Android**:
   - Điện thoại thật hoặc Emulator kết nối USB Debugging.
   - Kiểm tra kết nối:
     ```bash
     adb devices
     ```
     *(Kết quả phải hiển thị thiết bị có trạng thái `device`)*.
2. **Cấu hình đường dẫn ADB**:
   - Mặc định sử dụng đường dẫn tại `config.js`:
     `C:\Users\QUYDAM\AppData\Local\Android\Sdk\platform-tools\adb.exe`
3. **Khởi chạy Backend & Metro Bundler**:
   - Metro Bundler chạy ở cổng `8081` (`npx expo start --localhost`).
   - .NET Backend API chạy ở cổng `5000` (`http://localhost:5000/api`).
   - PostgreSQL chạy ở cổng `5432`.

---

## 4. Hướng dẫn sử dụng CLI (`run.js`)

Di chuyển vào thư mục runner:
```bash
cd "D:/STUDY/KY8/PRM/SmartMeal/docs/test/end-to-end/runner"
```

### Cú pháp lệnh

| Lệnh | Mô tả |
| :--- | :--- |
| `node run.js 01` hoặc `npm run test:01` | Chạy Kịch bản 01: Đăng nhập tài khoản Pro |
| `node run.js 02` hoặc `npm run test:02` | Chạy Kịch bản 02: Điều hướng 5 Tab chính |
| `node run.js 03` hoặc `npm run test:03` | Chạy Kịch bản 03: Ghi nhanh bữa ăn (QuickLog) |
| `node run.js 04` hoặc `npm run test:04` | Chạy Kịch bản 04: Đăng nhập Free & Xem gói Pro PayOS |
| `node run.js --all` hoặc `npm test` | Chạy toàn bộ 4 kịch bản tuần tự |

### Ví dụ màn hình khởi chạy:
```
╔════════════════════════════════════════════════════════════════════╗
║               SMARTMEAL E2E TEST RUNNER AUTOMATION                 ║
╚════════════════════════════════════════════════════════════════════╝

🔍 [1/3] Kiểm tra kết nối thiết bị Android qua ADB...
✅ Đã nhận diện thiết bị: [KVN7AMQC9LL7MZVK] (Trạng thái: device)

🔓 [2/3] Đánh thức màn hình và sẵn sàng thiết bị...
✅ Thiết bị đã được đánh thức.

🔄 [3/3] Thiết lập tự động ADB Reverse Port Forwarding...
✅ Đã reverse thành công:
   - tcp:8081 (Metro Bundler)
   - tcp:5000 (Backend .NET API)
   - tcp:5432 (PostgreSQL Local DB)
```

---

## 5. Chi tiết 4 Kịch bản kiểm thử

### 🔹 Kịch bản 01: `01_auth_login.test.js`
- **Mục tiêu**: Kiểm tra quy trình xác thực người dùng Pro hợp lệ.
- **Tài khoản**: `smartmealuser@gmail.com` / `Smartmeal@123` (`IsPro = true`).
- **Các bước thực thi**:
  1. Bật visual touches trên Android (`show_touches=1`, `pointer_location=1`).
  2. Kiểm tra màn hình hiện tại (nếu ở Welcome thì click "Tôi đã có tài khoản").
  3. Chờ màn hình LOGIN sẵn sàng.
  4. Điền email vào trường `ban@email.com`.
  5. Điền mật khẩu vào trường `Nhập mật khẩu`.
  6. Bấm nút "Đăng nhập".
  7. Chờ chuyển hướng thành công vào `DASHBOARD` (phát hiện `Tổng quan dinh dưỡng`, vòng tròn calo).
  8. Chụp ảnh từng bước đối chứng và xuất HTML report.

### 🔹 Kịch bản 02: `02_tabs_navigation.test.js`
- **Mục tiêu**: Kiểm tra tính ổn định của Bottom Tab Bar và khả năng render của 5 phân hệ chính.
- **Quy trình chuyển tab**:
  `Thực đơn` ➔ `Khám phá` ➔ `Nhật ký` ➔ `Cá nhân` ➔ `Trang chủ`.
- **Tiêu chuẩn nghiệm thu**:
  - Không xuất hiện hộp thoại crash (`has stopped`, `keep stopping`).
  - Mỗi tab tải đầy đủ các component đặc trưng (Kế hoạch tuần, Bộ sưu tập, Nhật ký bữa ăn, Chi tiết sức khỏe, Vòng tròn Calo).
  - Chụp ảnh màn hình đối chứng cho từng Tab.

### 🔹 Kịch bản 03: `03_diary_quicklog.test.js`
- **Mục tiêu**: Kiểm tra luồng ghi nhanh dinh dưỡng từ Dashboard.
- **Các bước thực thi**:
  1. Ghi nhận số Calo hiện tại trên Dashboard.
  2. Bấm nút "Ghi bữa ăn" (QuickLog).
  3. Chọn tùy chọn "Tìm món" để vào giao diện tìm kiếm thực phẩm.
  4. Nhập từ khóa hoặc chọn món ăn trong danh sách gợi ý (vd: Phở bò, Cơm tấm).
  5. Chọn khẩu phần và bấm nút "Thêm vào ... · XXX kcal".
  6. Quay lại Dashboard, kiểm tra số Calo tiêu thụ đã được cộng dồn chính xác.
  7. Chụp ảnh đối chứng và xuất HTML report.

### 🔹 Kịch bản 04: `04_pro_upgrade_view.test.js`
- **Mục tiêu**: Kiểm tra luồng xem bảng nâng cấp gói dịch vụ Pro và cổng thanh toán PayOS đối với tài khoản Free.
- **Tài khoản**: `rowem96186@goldvester.com` / `Smartmeal@123` (`IsPro = false`).
- **Các bước thực thi**:
  1. Đăng xuất phiên trước (nếu có) và đăng nhập tài khoản Free.
  2. Vào Tab "Cá nhân".
  3. Bấm vào nút/thẻ "Nâng cấp SmartMeal Pro".
  4. Chờ màn hình `PREMIUM` xuất hiện.
  5. Xác minh hiển thị bảng so sánh quyền lợi (`Free` vs `Pro`) và các gói cước PayOS (vd: Gói Tháng 49.000đ, Gói Năm).
  6. Nhấn Back trở về an toàn, chụp ảnh và xuất báo cáo HTML.

---

## 6. Báo cáo HTML & Ảnh chụp đối chứng (Artifacts)

Toàn bộ kết quả kiểm thử được lưu trữ tại `runner/artifacts/`:
- **Ảnh chụp đối chứng**: `artifacts/<tên_kịch_bản>/step_XX_*.png`
- **Báo cáo chi tiết từng kịch bản**:
  - `artifacts/01_auth_login_report.html`
  - `artifacts/02_tabs_navigation_report.html`
  - `artifacts/03_diary_quicklog_report.html`
  - `artifacts/04_pro_upgrade_view_report.html`
- **Báo cáo tổng hợp toàn bộ (Master Report)**:
  - `artifacts/master_e2e_summary.html`

> 💡 **Tính năng của báo cáo HTML**:
> - Hoàn toàn độc lập (Standalone), nhúng trực tiếp dữ liệu ảnh dưới dạng Base64 Data URI, không lo đứt link khi chia sẻ.
> - Hiển thị Timeline từng bước trực quan kèm thời gian chạy (`duration ms`), trạng thái (`PASS` / `FAIL`), ghi chú chi tiết.
> - Cho phép bấm vào ảnh thu nhỏ để phóng to (Zoom in/out) xem chi tiết giao diện đối chứng.

---

## 7. Xử lý sự cố thường gặp (Troubleshooting)

1. **`adb: command not found` hoặc lỗi không tìm thấy ADB**:
   - Kiểm tra đường dẫn `adbPath` trong file `runner/config.js` đã trỏ đúng tới `adb.exe` trên máy tính Windows.
2. **`KHÔNG TÌM THẤY THIẾT BỊ NÀO ĐƯỢC KẾT NỐI QUA ADB`**:
   - Đảm bảo cáp USB đã cắm chắc chắn.
   - Bật tùy chọn **Nhà phát triển (Developer Options)** ➔ bật **Gỡ lỗi USB (USB Debugging)**.
   - Chấp nhận hộp thoại *"Allow USB debugging from this computer"* trên màn hình điện thoại.
3. **Ứng dụng không gọi được API backend (Network Error)**:
   - Chạy lệnh `npm run reverse` để đảm bảo cổng 5000 và 8081 đã được đảo chiều về máy tính.
4. **Bàn phím ảo che mất nút bấm**:
   - Runner đã tự động gửi phím `BACK` (Keyevent 4) sau khi gõ text để hạ bàn phím ảo.
