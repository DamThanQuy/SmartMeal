# SmartMeal — Technology Stack

## 1. Mục tiêu

SmartMeal là ứng dụng di động về quản lý dinh dưỡng, theo dõi sức khỏe, lập thực đơn và mua sắm thực phẩm thông minh.

Stack được chọn theo các nguyên tắc:
- Mobile-first với Expo Go (Expo SDK).
- React Native + TypeScript.
- Dễ phát triển và chạy thử trên thiết bị thật thông qua ứng dụng Expo Go.
- Feature-based architecture.
- Tối ưu dependency tương thích 100% với Expo Go.
- Server state và client state tách biệt.
- Backend là nguồn dữ liệu chính (Source of Truth).

---

## 2. Technology Stack tổng thể

| Layer | Technology | Mục đích |
|---|---|---|
| Mobile Framework | React Native (Expo Go) | Nền tảng phát triển ứng dụng di động |
| Language | TypeScript | Type safety |
| Styling | NativeWind | Utility-first styling (Tailwind CSS) |
| UI | Custom Components + React Native | Hệ thống UI dùng chung |
| Icons | Lucide React Native | Icon hệ thống |
| Navigation | React Navigation | Chuyển màn hình (Stack, Tabs) |
| Server State | TanStack Query (@tanstack/react-query) | Quản lý data/cache từ API |
| Client State | Zustand | Quản lý state toàn cục ở Client |
| HTTP Client | Axios | Gọi REST API |
| Forms | React Hook Form | Quản lý Form & Validation |
| Validation | Zod | Cấu hình Schema validation |
| Animation | React Native Reanimated | Hiệu ứng chuyển cảnh, tương tác |
| Storage | AsyncStorage (@react-native-async-storage/async-storage) | Lưu cache và preference cục bộ |
| Secure Storage | Expo SecureStore (expo-secure-store) | Lưu Access/Refresh Token an toàn |
| Camera & Scanner | Expo Camera (expo-camera) / ImagePicker (expo-image-picker) | Quét ảnh món ăn, tủ lạnh, Barcode, OCR |
| Notification | Expo Notifications (expo-notifications) | Nhắc nhở bữa ăn, uống nước |
| Charts | react-native-gifted-charts | Biểu đồ dinh dưỡng Calo/Macro |
| Date | date-fns | Xử lý ngày tháng |
| Backend | ASP.NET Core .NET 8 | REST API Server |
| Database | PostgreSQL | Cơ sở dữ liệu chính |
| AI Service | Backend → Gemini/LLM | Xử lý AI Vision, Voice, OCR qua Backend |

---

## 3. Core Architecture

```text
React Native (Expo Go)
    │
    ├── Screens
    │      ↓
    ├── Hooks
    │      ↓
    ├── Feature Services
    │      ↓
    ├── API / Expo Services
    │      ↓
    └── External Systems
             │
             ├── ASP.NET Core API
             ├── Expo Camera / ImagePicker
             └── Expo Notifications