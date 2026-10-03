# SmartMeal — Design System & UI/UX Guidelines

> **Project:** SmartMeal  
> **Version:** V2  
> **Platform:** Mobile App  
> **Purpose:** Quy chuẩn UI/UX dùng chung cho toàn bộ SmartMeal.  
> **Design Direction:** Calm · Healthy · Simple · Friendly · Modern

**Cập nhật theo ảnh tham chiếu của người dùng — 03/10/2026:** palette hiện hành nằm ở
`src/theme/tokens.js` và được dùng chung cho NativeWind, icon và navigation. Chế độ sáng dùng
nền `#F1FAF5`, surface trắng và primary `#19B541`; chế độ tối dùng nền đen thuần `#000000`,
surface xám đen `#111111` và primary `#4AC65C` theo yêu cầu cập nhật của người dùng.
Thẻ năng lượng dùng token `energy*` riêng để đổi từ chữ trắng trên xanh đậm sang chữ đen
trên xanh sáng. Font Inter Regular/SemiBold/Bold được nạp
từ asset cục bộ qua `expo-font`.

Trang chủ theo thứ tự: header SmartMeal và nút sáng/tối → ngày/lời chào/avatar → năng lượng
hôm nay → ba ô Đạm/Tinh bột/Chất béo và phần trăm mục tiêu → mẹo nhỏ → gợi ý món ăn có ảnh.
Các chức năng ghi bữa ăn, bữa ăn hôm nay, vận động và Bé Mầm nằm tiếp bên dưới. Thanh tab:
Trang chủ · Bữa ăn (Meal Planner) · Khám phá · Nhật ký · Cá nhân. Các route và bảo vệ Guest
giữ theo chức năng hiện có. Nút sáng/tối lưu lựa chọn qua ThemeProvider; Cài đặt vẫn hỗ trợ
chế độ theo hệ thống.

---

## 1. Design Goal

SmartMeal là ứng dụng theo dõi dinh dưỡng và sức khỏe. Giao diện phải tạo cảm giác:

- Nhẹ nhàng.
- Sạch sẽ.
- Dễ hiểu.
- Thân thiện.
- Có cảm giác "healthy" nhưng không quá y tế.
- Có tính hiện đại nhưng không quá nhiều hiệu ứng.
- Người dùng có thể hiểu màn hình đang làm gì ngay khi mở app.

### Design statement

> **"Ăn lành mạnh không cần phức tạp."**

Mọi màn hình cần ưu tiên **nội dung và hành động chính**, không trang trí quá mức.

---

# 2. Core UI/UX Principles

SmartMeal áp dụng các nguyên tắc:

### 2.1. Structure — Cấu trúc rõ ràng

- Các nội dung liên quan phải nằm gần nhau.
- Mỗi section có mục đích rõ ràng.
- Không trộn nhiều nghiệp vụ vào một khu vực.
- Primary Action phải dễ nhận biết.

### 2.2. Visibility — Hiển thị đúng lúc

- Luôn cho người dùng biết hệ thống đang loading, xử lý hoặc thành công/thất bại.
- Không giấu thông tin quan trọng trong nhiều lớp navigation.
- Các dữ liệu quan trọng như Calories, Protein, Carbs, Fat phải dễ nhìn.

### 2.3. Simplicity — Đơn giản

- Một màn hình chỉ có **1 mục tiêu chính**.
- Hạn chế card, badge, icon và màu sắc không cần thiết.
- Không sử dụng gradient phức tạp.
- Không sử dụng quá nhiều font size.

### 2.4. Feedback — Phản hồi

Mọi thao tác quan trọng phải có feedback:

- Tap → visual feedback.
- Save → success feedback.
- Delete → confirmation.
- AI processing → loading/progress.
- Error → message + hướng xử lý.
- Sync Health → sync status.

### 2.5. Consistency — Nhất quán

- Một action phải có cùng cách hiển thị trên toàn app.
- Một icon chỉ nên có một ý nghĩa.
- Button, card, input, bottom navigation phải dùng chung design system.
- Không tạo style riêng cho từng screen nếu component chung đã tồn tại.

---

# 3. Visual Direction

## 3.1. Overall Style

SmartMeal sử dụng:

- Soft UI.
- Rounded cards.
- Light background.
- Green primary color.
- White surfaces.
- Subtle shadow.
- Minimal border.
- Friendly illustrations.
- Food photography có background sạch.
- Micro-animation nhẹ.

Không sử dụng:

- Neon colors.
- Gradient mạnh.
- Glassmorphism quá mức.
- Shadow quá đậm.
- Nhiều màu primary cùng lúc.
- UI quá giống dashboard doanh nghiệp.

---

# 4. Color System

SmartMeal sử dụng **một palette đơn giản**, lấy xanh lá làm màu sức khỏe.

## 4.1. Primary

```text
Primary Green
#22A447
```

Dùng cho:

- Primary button.
- Active navigation.
- Progress.
- Selected state.
- Main CTA.
- Positive nutrition status.

## 4.2. Primary Dark

```text
#16863A
```

Dùng cho:

- Pressed state.
- Darker text/icon liên quan tới primary.
- CTA hover/pressed.

## 4.3. Primary Soft

```text
#EAF8EF
```

Dùng cho:

- Selected card.
- Background icon.
- Highlight section.
- Nutrition progress background.

## 4.4. Background

```text
#F7FAF8
```

Màu nền chính của app.

## 4.5. Surface

```text
#FFFFFF
```

Dùng cho:

- Card.
- Modal.
- Bottom sheet.
- Input.
- Content container.

## 4.6. Text

```text
Text Primary
#183022

Text Secondary
#64746A

Text Muted
#94A39A
```

## 4.7. Border

```text
#E4ECE7
```

Border chỉ dùng khi cần phân tách. Không tạo border cho mọi thành phần.

## 4.8. Semantic Colors

```text
Success
#22A447

Warning
#F2A93B

Error
#D94A4A

Info
#4D8FD6
```

Semantic colors chỉ dùng cho trạng thái, không dùng làm màu trang trí.

---

# 5. Color Usage Rule

Tỷ lệ màu đề xuất:

```text
70% — Background / White
20% — Green / Primary Soft
10% — Primary Green + Semantic Colors
```

Không tạo thêm màu mới cho một màn hình nếu màu đó đã có trong Design System.

### Không nên

```text
Green + Blue + Purple + Orange + Pink
```

### Nên

```text
White
Light Green
Primary Green
Dark Text
Gray
+ Semantic colors khi cần
```

---

# 6. Typography

Font phải dễ đọc trên mobile.

## 6.1. Font

Ưu tiên:

```text
Inter
```

Fallback:

```text
Roboto
System Font
```

Không sử dụng quá nhiều font family.

---

## 6.2. Typography Scale

| Token | Size | Weight | Usage |
|---|---:|---:|---|
| Display | 28 | 700 | Hero / major number |
| H1 | 24 | 700 | Screen title |
| H2 | 20 | 700 | Section title |
| H3 | 18 | 600 | Card title |
| Body Large | 16 | 400 | Main content |
| Body | 14 | 400 | Normal content |
| Body Medium | 14 | 600 | Important content |
| Caption | 12 | 400 | Supporting information |
| Button | 14 | 600 | Button label |

### Rule

Không sử dụng quá nhiều text size trên cùng một màn hình.

Hierarchy nên rõ:

```text
Screen Title
    ↓
Section Title
    ↓
Card Title
    ↓
Body
    ↓
Caption
```

---

# 7. Spacing System

Sử dụng spacing theo hệ thống 4px.

```text
4px   — Tiny
8px   — Small
12px  — Compact
16px  — Default
20px  — Section
24px  — Large
32px  — Major section
40px  — Screen separation
```

### Quy tắc mặc định

```text
Screen horizontal padding: 16px
Card padding: 16px
Section gap: 24px
Element gap: 8px / 12px
```

Không dùng spacing ngẫu nhiên như:

```text
13px
17px
19px
27px
```

trừ khi có lý do layout rõ ràng.

---

# 8. Border Radius

SmartMeal sử dụng rounded UI nhưng không quá "bubble".

```text
Small: 8px
Medium: 12px
Card: 16px
Large Card: 20px
Bottom Sheet: 24px
Pill: 999px
```

### Recommendation

- Button: 12px
- Input: 12px
- Card: 16px
- Hero card: 20px
- Chip: 999px

---

# 9. Shadow

Shadow phải nhẹ.

```text
Card:
0 2px 12px rgba(24, 48, 34, 0.06)

Elevated:
0 6px 24px rgba(24, 48, 34, 0.10)
```

Không sử dụng shadow đậm làm UI trông giống neumorphism nặng.

### Neumorphic Rule

Neumorphic effect chỉ dùng rất nhẹ cho:

- Pet card.
- Quick action.
- Health summary.

Không dùng neumorphism cho toàn bộ app.

---

# 10. Mobile Layout

## 10.1. Safe Area

Luôn tôn trọng:

- Status bar.
- Notch.
- Home indicator.
- Navigation bar.

---

## 10.2. Screen Padding

Mặc định:

```text
Left: 16px
Right: 16px
```

Tablet có thể tăng:

```text
24px — 32px
```

---

## 10.3. Content Width

Không kéo nội dung sát cạnh màn hình.

Các section phải có khoảng thở.

---

# 11. Touch Target

Mọi phần tử có thể tap phải đủ lớn.

```text
Minimum touch target:
44 × 44 px
```

Khuyến nghị cho Android:

```text
48 × 48 dp
```

Khoảng cách giữa các action:

```text
≥ 8px
```

Đặc biệt chú ý:

- Icon button.
- Close button.
- Favorite.
- Back button.
- Checkbox.
- Bottom navigation.

---

# 12. Navigation

SmartMeal là mobile-first.

## Recommended Bottom Navigation

5 mục chính:

```text
Trang chủ
Khám phá
Nhật ký
Thực đơn
Cá nhân
```

### Trang chủ

Dashboard tổng quan.

### Khám phá

Recipe / Food / AI discovery.

### Nhật ký

Nutrition Diary.

### Thực đơn

Meal Planner + Grocery List.

### Cá nhân

Profile + Health + Settings + Premium.

---

# 13. Navigation Rule

Không để navigation có quá nhiều mục.

Không:

```text
Trang chủ
AI
Recipe
Food
Scanner
Diary
Meal Plan
Grocery
Pet
Challenge
Health
Profile
Settings
Premium
...
```

Thay vào đó:

```text
5 main destinations
+
Contextual actions
+
Secondary features inside relevant screens
```

---

# 14. Dashboard Design

Dashboard là màn hình người dùng nhìn thấy thường xuyên nhất.

## Order

```text
Header
↓
Greeting
↓
Daily Calorie Summary
↓
Macro Progress
↓
Quick Log
↓
Today Meals
↓
Activity / Health
↓
Pet
↓
Recommended Meal
```

---

# 15. Dashboard Header

Ví dụ:

```text
Chào buổi sáng, Thiên 👋

Hôm nay bạn muốn ăn gì?
```

Header không nên chiếm quá nhiều diện tích.

Có thể có:

```text
Notification
Avatar
```

---

# 16. Daily Calorie Card

Đây là card quan trọng nhất.

Hiển thị:

```text
1,420 kcal
đã nạp

Mục tiêu 2,000 kcal

580 kcal còn lại
```

Có thể sử dụng progress ring.

### Không nên

Hiển thị quá nhiều số:

```text
Calories
BMR
TDEE
BMI
Protein
Carbs
Fat
Steps
Water
...
```

trong một card.

### Nên

```text
Calories
Remaining
```

là thông tin chính.

Macro nằm ở section tiếp theo.

---

# 17. Macro Card

Hiển thị:

```text
Protein
65 / 120g

Carbs
140 / 250g

Fat
42 / 65g
```

Sử dụng progress bar nhỏ.

Không dùng 3 màu quá sặc sỡ.

Có thể sử dụng cùng primary green và các tone xanh nhạt.

---

# 18. Quick Log

Quick Log phải là một trong những action dễ thấy nhất.

```text
+ Ghi bữa ăn
```

Sau khi tap:

```text
Chụp món ăn
Nói để ghi
Tìm món
Quét sản phẩm
```

Mỗi option có icon rõ ràng.

---

# 19. Meal Card

Meal card:

```text
Breakfast

Bún bò
420 kcal

Protein 22g
Carbs 48g
Fat 14g
```

Ảnh món ăn chiếm khoảng:

```text
35% — 45%
```

phần card.

Thông tin nutrition không được đặt quá nhỏ.

---

# 20. Empty State

Không sử dụng màn hình trống.

Ví dụ:

```text
🍽️

Chưa có bữa sáng

Thêm món ăn để bắt đầu theo dõi dinh dưỡng.

[ + Ghi bữa sáng ]
```

Empty state phải có:

1. Illustration/icon.
2. Title.
3. Short explanation.
4. Primary action.

---

# 21. Recipe Discovery

Recipe screen:

```text
Search
↓
Category chips
↓
Recommended
↓
Recipe cards
```

Category:

```text
Tất cả
Eat Clean
Low Carb
Keto
Vegetarian
Nhanh
```

Không hiển thị quá nhiều chip cùng lúc.

Có thể horizontal scroll.

---

# 22. Recipe Card

Recipe card ưu tiên:

```text
Image
Recipe name
Cooking time
Calories
Diet tag
Favorite
```

Ví dụ:

```text
┌─────────────────────┐
│                     │
│      Food Image     │
│                     │
├─────────────────────┤
│ Gà áp chảo rau củ ♡ │
│ 25 phút · 420 kcal  │
│ Eat Clean           │
└─────────────────────┘
```

---

# 23. Recipe Detail

Thứ tự:

```text
Hero Image
↓
Recipe Name
↓
Rating / Time / Calories
↓
Nutrition Summary
↓
Ingredients
↓
Instructions
↓
Nutrition Detail
↓
Save Recipe
```

Primary Action:

```text
+ Thêm vào thực đơn
```

---

# 24. AI Features

AI phải tạo cảm giác **trợ lý**, không tạo cảm giác "robot đang điều khiển ứng dụng".

## AI Snap

Flow:

```text
Camera
↓
Analyzing...
↓
Detected Foods
↓
Estimated Nutrition
↓
Review
↓
Confirm
```

---

# 25. AI Loading

Không sử dụng spinner đơn độc cho AI.

Nên:

```text
🔍
Đang nhận diện món ăn...

Có thể mất vài giây.
```

Nếu xử lý lâu:

```text
Đang phân tích hình ảnh
████████░░
```

---

# 26. AI Result

Kết quả AI phải phân biệt:

```text
Estimated
```

với:

```text
Verified / Database
```

Ví dụ:

```text
Calories
≈ 520 kcal

Ước tính từ hình ảnh
```

Không viết:

```text
Calories = 520 kcal
```

nếu đó là kết quả AI ước tính.

---

# 27. AI Confirmation

CTA:

```text
[ Xác nhận & ghi nhật ký ]
```

Secondary:

```text
Chỉnh sửa
```

User phải có quyền sửa:

- Food.
- Quantity.
- Serving.
- Nutrition.

---

# 28. Fridge Scanner

UI:

```text
Scan your fridge
↓
Camera preview
↓
Detected ingredients
↓
Confirm ingredients
↓
Recipes you can make
```

Detected ingredient:

```text
✓ Trứng
✓ Cà chua
✓ Rau xà lách
? Thịt gà
```

Không tự động lưu ingredient nếu chưa được user xác nhận.

---

# 29. Barcode / OCR Scanner

Scanner screen nên tối giản.

```text
Camera View
        ┌──────────────┐
        │              │
        │   Scan Area  │
        │              │
        └──────────────┘

Đưa mã vạch vào khung
```

Sau khi scan:

```text
Product
Nutrition
Allergy Alert
Health Warning
```

---

# 30. Safety Alert

Cảnh báo phải rõ nhưng không gây hoảng sợ.

### Warning

```text
⚠ Có thể chứa đậu phộng

Sản phẩm này có thành phần phù hợp với
danh sách dị ứng bạn đã khai báo.
```

CTA:

```text
Xem thành phần
```

Không dùng màu đỏ cho toàn bộ card.

Chỉ highlight:

- Icon.
- Border.
- Alert badge.

---

# 31. Health Profile

Không đưa toàn bộ form lên một màn hình.

Chia thành:

```text
1. Thông tin cơ bản
2. Cơ thể
3. Mục tiêu
4. Vận động
5. Dị ứng
6. Sức khỏe
7. Chế độ ăn
```

Sử dụng multi-step onboarding nếu cần.

---

# 32. Health Dashboard

Hiển thị:

```text
BMI
BMR
TDEE
Weight
Goal
```

Nhưng không làm tất cả thành card lớn.

Ưu tiên:

```text
Current Weight
Goal Weight
Progress
```

Các chỉ số BMI/BMR/TDEE có thể nằm trong section "Chi tiết sức khỏe".

---

# 33. Meal Planner

Weekly planner:

```text
← Tuần trước
      21 — 27/09
Tuần này
      Tuần sau →
```

Ngày:

```text
T2
T3
T4
T5
T6
T7
CN
```

Ngày hiện tại phải nổi bật bằng Primary Green.

---

# 34. Meal Planner Card

Mỗi ngày:

```text
Breakfast
[ Add ]

Lunch
[ Add ]

Dinner
[ Add ]

Snack
[ Add ]
```

Không để khoảng trống quá lớn như desktop layout.

Mobile cần ưu tiên vertical scrolling.

---

# 35. Grocery List

Grocery List:

```text
Đi chợ tuần này

Rau củ
☐ Cà chua       500g
☐ Xà lách       2 cây

Thịt cá
☐ Ức gà         500g

Gia vị
☐ Muối          1 gói
```

Bottom summary:

```text
Ước tính
350.000đ

[ Hoàn tất mua sắm ]
```

---

# 36. Gamification

Gamification phải hỗ trợ health habit, không làm app giống game quá mức.

## Pet

Pet card:

```text
        🐢

    Bé Mầm
    Level 5

████████░░ 80%

Hôm nay bạn làm rất tốt!
```

Pet nên xuất hiện như một companion.

---

# 37. Challenge

Challenge card:

```text
7 ngày Eat Clean

Ngày 4 / 7

██████░░░

+100 XP
```

Không hiển thị quá nhiều badge cùng lúc.

---

# 38. Premium

Premium screen cần rõ ràng.

Hero:

```text
Nâng cấp SmartMeal Pro

Ăn thông minh hơn với AI
```

Benefits:

```text
✓ AI Snap không giới hạn
✓ Fridge Scanner
✓ Meal Plan nâng cao
✓ Health recommendation
```

CTA:

```text
Nâng cấp Pro
```

Không sử dụng dark luxury style hoặc quá nhiều gradient.

---

# 39. Login / Register

Login screen:

```text
Logo
↓
Welcome message
↓
Email
Password
↓
Đăng nhập
↓
Hoặc
↓
Google
↓
Đăng ký
```

Form phải đơn giản.

Không yêu cầu quá nhiều thông tin ngay lúc đăng ký.

Health Profile được thu thập sau khi account được tạo.

---

# 40. Button System

## Primary

```text
Background: #22A447
Text: #FFFFFF
Radius: 12px
Height: 48px
```

Dùng cho action chính.

Ví dụ:

```text
Ghi bữa ăn
Thêm vào thực đơn
Xác nhận
Nâng cấp Pro
```

## Secondary

```text
Background: #EAF8EF
Text: #16863A
Radius: 12px
Height: 48px
```

## Outline

```text
Background: transparent
Border: #E4ECE7
Text: #183022
Radius: 12px
```

## Text Button

Dùng cho action phụ.

Không sử dụng quá nhiều.

---

# 41. Input

Default:

```text
Height: 48px
Radius: 12px
Background: #FFFFFF
Border: #E4ECE7
```

Focus:

```text
Border: #22A447
```

Error:

```text
Border: #D94A4A
```

Placeholder:

```text
#94A39A
```

---

# 42. Card System

Không tạo quá nhiều loại card.

Chỉ cần:

```text
Standard Card
Nutrition Card
Recipe Card
Meal Card
Pet Card
Alert Card
```

Tất cả phải sử dụng cùng:

- Radius.
- Shadow.
- Padding.
- Typography system.

---

# 43. Bottom Navigation

Height khoảng:

```text
64 — 80dp
```

Active:

```text
Green icon
Green label
```

Inactive:

```text
Muted gray
```

Không sử dụng nhiều màu cho từng tab.

---

# 44. Icons

Sử dụng một icon library thống nhất.

Ưu tiên:

```text
Lucide / Material Icons
```

Style:

```text
Outline
Rounded
Simple
```

Không mix:

```text
3D icon
Filled icon
Outline icon
Emoji
```

trong cùng một navigation system.

Emoji có thể dùng trong:

- Pet.
- Food category.
- Friendly empty state.

---

# 45. Images

Food images cần:

- Sáng.
- Tự nhiên.
- Background sạch.
- Không quá nhiều props.
- Ưu tiên close-up món ăn.
- Tỷ lệ ảnh nhất quán.

Không sử dụng ảnh có watermark.

---

# 46. Landing Page

Landing page giới thiệu SmartMeal phải đơn giản và hướng người dùng đến app.

## Hero

```text
Ăn ngon.
Sống khỏe.
Thông minh hơn.

SmartMeal giúp bạn theo dõi dinh dưỡng,
lên thực đơn và ghi nhận bữa ăn bằng AI.

[ Bắt đầu miễn phí ]

        Mobile App Preview
```

---

# 47. Landing Page Sections

Thứ tự:

```text
Hero
↓
Smart Dashboard
↓
AI Snap & Track
↓
Smart Meal Planner
↓
Fridge Scanner
↓
Health Sync
↓
Gamification
↓
Testimonials
↓
Download App
↓
Footer
```

Không đưa tất cả tính năng vào hero.

---

# 48. Landing Page Visual

Landing page dùng cùng design system với mobile app:

```text
Background: #F7FAF8
Primary: #22A447
Surface: #FFFFFF
Text: #183022
```

Có thể dùng:

- Food photography.
- Mobile mockup.
- Soft illustration.
- Pet illustration.

Không dùng hero gradient quá mạnh.

---

# 49. Responsive Rule

Mặc dù SmartMeal ưu tiên mobile, landing page có thể responsive.

### Mobile

```text
1 column
16px padding
Large CTA
Vertical sections
```

### Tablet

```text
2 columns
24px padding
```

### Desktop

```text
Max width: 1200px
2-column hero
3-column feature cards
```

Mobile vẫn là nguồn tham chiếu chính.

---

# 50. Motion

Animation phải nhẹ và có mục đích.

Recommended:

```text
Fast: 150ms
Normal: 200ms
Slow: 300ms
```

Dùng cho:

- Button press.
- Card transition.
- Bottom sheet.
- Progress.
- Success state.
- Navigation.

Không dùng:

- Excessive bouncing.
- Continuous animation.
- Parallax nặng.
- Animation làm chậm thao tác.

---

# 51. Loading States

Mỗi màn hình phải có:

```text
Loading
Success
Empty
Error
```

## Skeleton

Ưu tiên skeleton cho:

- Recipe list.
- Dashboard.
- Meal plan.
- Grocery list.

Không để màn hình trắng trong lúc loading.

---

# 52. Error States

Error message phải:

1. Nói rõ vấn đề.
2. Không dùng technical jargon.
3. Có action nếu có thể.

### Không nên

```text
HTTP 500
NetworkException
NullPointerException
```

### Nên

```text
Không thể tải dữ liệu.

Vui lòng kiểm tra kết nối mạng
và thử lại.

[ Thử lại ]
```

---

# 53. Accessibility

SmartMeal phải:

- Text đủ tương phản.
- Không dùng màu là tín hiệu duy nhất.
- Touch target đủ lớn.
- Icon có semantic label.
- Font có thể scale.
- Không đặt text quá nhỏ.

Không dùng:

```text
Red = Error
Green = Success
```

mà không có icon/text hỗ trợ.

---

# 54. Dark Mode

Dark Mode có thể được hỗ trợ ở phase sau.

Không đơn giản đảo màu.

Light:

```text
Background #F7FAF8
Surface #FFFFFF
Text #183022
```

Dark:

```text
Background #101812
Surface #18231C
Text #F1F6F2
```

Primary Green cần điều chỉnh để đảm bảo contrast.

---

# 55. Do / Don't

## DO

- Dùng whitespace.
- Dùng 1 primary color.
- Card có khoảng thở.
- CTA rõ.
- Typography đơn giản.
- Hiển thị trạng thái.
- Mobile-first.
- Reuse components.
- Dùng ảnh món ăn chất lượng.
- Giữ navigation đơn giản.

## DON'T

- Dùng quá nhiều màu.
- Dùng quá nhiều card.
- Dùng shadow đậm.
- Nhồi thông tin.
- Dùng font quá nhỏ.
- Có nhiều primary button.
- Ẩn action quan trọng.
- Tạo component style riêng cho từng screen.
- Mix nhiều icon style.
- Lạm dụng animation.

---

# 56. Screen Priority

Khi thiết kế màn hình mới, xác định theo thứ tự:

```text
1. User Goal
2. Primary Information
3. Primary Action
4. Secondary Information
5. Secondary Action
6. Supporting Content
```

Nếu một thành phần không phục vụ các mục trên:

> Cân nhắc loại bỏ.

---

# 57. Design Review Checklist

Trước khi hoàn thành một screen:

### Structure

- [ ] Screen có một mục tiêu chính.
- [ ] Primary action rõ ràng.
- [ ] Nội dung được nhóm logic.
- [ ] Không có section dư thừa.

### Visual

- [ ] Chỉ sử dụng design tokens.
- [ ] Không thêm màu tùy ý.
- [ ] Typography nhất quán.
- [ ] Spacing theo 4px system.
- [ ] Radius nhất quán.
- [ ] Shadow nhẹ.

### Mobile UX

- [ ] Touch target ≥ 44px.
- [ ] Khoảng cách action ≥ 8px.
- [ ] Có safe area.
- [ ] Không quá nhiều nội dung trên một màn hình.
- [ ] Có scroll nếu nội dung dài.

### State

- [ ] Loading.
- [ ] Empty.
- [ ] Error.
- [ ] Success.
- [ ] Disabled.

### Accessibility

- [ ] Text dễ đọc.
- [ ] Contrast đủ.
- [ ] Không phụ thuộc hoàn toàn vào màu.
- [ ] Icon có ý nghĩa rõ ràng.

---

# 58. Design Token Summary

```text
PRIMARY
#22A447

PRIMARY_DARK
#16863A

PRIMARY_SOFT
#EAF8EF

BACKGROUND
#F7FAF8

SURFACE
#FFFFFF

TEXT_PRIMARY
#183022

TEXT_SECONDARY
#64746A

TEXT_MUTED
#94A39A

BORDER
#E4ECE7

SUCCESS
#22A447

WARNING
#F2A93B

ERROR
#D94A4A

INFO
#4D8FD6
```

---

# 59. Component Naming

Component dùng chung nên có tên theo chức năng.

Ví dụ:

```text
AppButton
AppTextField
AppCard
AppChip
AppDialog
AppBottomSheet
NutritionCard
CalorieProgress
MacroProgress
MealCard
RecipeCard
PetCard
EmptyState
ErrorState
LoadingState
```

Không tạo:

```text
GreenButton1
DashboardButton
NewGreenButton
SpecialCard
CustomCard2
```

nếu component đó thực chất có thể dùng chung.

---

# 60. Final Design Direction

SmartMeal không cần một giao diện quá cầu kỳ.

Mục tiêu cuối cùng:

```text
Simple
    +
Healthy
    +
Friendly
    +
Clear
    +
Consistent
```

### Visual identity

```text
White
    ↓
Soft Green
    ↓
Healthy Green
    ↓
Dark Green Text
```

### UX identity

```text
Mở app
   ↓
Hiểu hôm nay mình đang ở đâu
   ↓
Biết mình đã ăn bao nhiêu
   ↓
Biết cần làm gì tiếp theo
   ↓
Thực hiện trong 1–2 thao tác
```

> **SmartMeal nên khiến người dùng cảm thấy việc theo dõi sức khỏe là nhẹ nhàng, chứ không phải một công việc phải "quản lý".**

---

# 61. Reference

Design principles được tham khảo từ bài viết:

**Golden Bee — Nguyên Tắc Thiết Kế UI/UX Mobile App**

https://goldenbeeltd.vn/phat-trien-mobile-app/blog-phat-trien-mobile-app/nguyen-tac-thiet-ke-ui-ux-mobile-app/

Các nguyên tắc được áp dụng vào SmartMeal gồm:

- Structure.
- Visibility.
- Simplicity.
- Feedback.
- Consistency.
- Logical grouping.
- Information hierarchy.
- Progressive disclosure.
- Touch target.
- Mobile navigation.
- Design system.
- Loading / Empty / Error states.

> Các quy tắc trong tài liệu này đã được điều chỉnh cho phù hợp với SmartMeal và không phải mọi con số trong nguồn tham khảo đều được xem là tiêu chuẩn bắt buộc của SmartMeal.
